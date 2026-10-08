from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
import re
import secrets

from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.geo import client_ip, geolocate_and_save
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.email import send_welcome_email
from app.google_auth import GoogleTokenError, verify_google_credential
from app.models import User
from app.schemas.auth import GoogleAuthRequest, GoogleAuthResponse, LoginRequest, RefreshRequest, TokenPair
from app.schemas.user import (
    NotificationPrefsUpdate,
    UserCreate,
    UserMe,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens_for(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    db: DbSession,
    background_tasks: BackgroundTasks,
    request: Request,
) -> TokenPair:
    existing = await db.scalar(
        select(User).where(
            or_(User.email == payload.email, User.username == payload.username)
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email or username already exists",
        )
    ip = client_ip(request)
    user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        is_online=True,
        is_admin=payload.email.lower() in settings.admin_emails_list,
        signup_ip=ip,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # After the response: send the welcome email and resolve signup location.
    # Both are best-effort and never affect signup.
    background_tasks.add_task(send_welcome_email, user.email, user.full_name)
    background_tasks.add_task(geolocate_and_save, user.id, ip)

    return _tokens_for(user)


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: DbSession) -> TokenPair:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended.",
        )
    user.is_online = True
    # Keep admin status in sync with the ADMIN_EMAILS allowlist (bootstrap admins).
    if user.email.lower() in settings.admin_emails_list:
        user.is_admin = True
    await db.commit()
    return _tokens_for(user)


async def _unique_username(db: DbSession, email: str) -> str:
    """Username from the email's local part (a-z, 0-9, _), made unique."""
    base = re.sub(r"[^a-z0-9_]", "", email.split("@")[0].lower()) or "user"
    if len(base) < 3:
        base = (base + "user")[:8]
    base = base[:40]
    candidate, n = base, 1
    while await db.scalar(select(User.id).where(User.username == candidate)):
        n += 1
        candidate = f"{base}{n}"
    return candidate


@router.post("/google", response_model=GoogleAuthResponse)
async def google_sign_in(
    payload: GoogleAuthRequest,
    db: DbSession,
    background_tasks: BackgroundTasks,
    request: Request,
) -> GoogleAuthResponse:
    """Sign in or sign up with Google. An existing account with the same
    (Google-verified) email is signed in; otherwise a new one is created."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google sign-in isn't set up yet")
    try:
        claims = await verify_google_credential(payload.credential)
    except GoogleTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e

    email = claims["email"].strip()
    user = await db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    is_new = user is None
    if user is None:
        ip = client_ip(request)
        user = User(
            email=email,
            username=await _unique_username(db, email),
            full_name=(claims.get("name") or email.split("@")[0])[:120],
            avatar_url=claims.get("picture"),
            # No password: a random one nobody knows. "Forgot password" can set one later.
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            is_online=True,
            is_admin=email.lower() in settings.admin_emails_list,
            signup_ip=ip,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        background_tasks.add_task(send_welcome_email, user.email, user.full_name)
        background_tasks.add_task(geolocate_and_save, user.id, ip)
    else:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been suspended.")
        user.is_online = True
        if user.email.lower() in settings.admin_emails_list:
            user.is_admin = True
        if not user.avatar_url and claims.get("picture"):
            user.avatar_url = claims["picture"]
        await db.commit()

    return GoogleAuthResponse(**_tokens_for(user).model_dump(), is_new=is_new)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: DbSession) -> TokenPair:
    subject = decode_token(payload.refresh_token, expected_type="refresh")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    user = await db.get(User, int(subject))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    return _tokens_for(user)


@router.get("/me", response_model=UserMe)
async def me(current_user: CurrentUser) -> User:
    return current_user


@router.patch("/me", response_model=UserMe)
async def update_me(
    payload: UserUpdate, db: DbSession, current_user: CurrentUser
) -> User:
    data = payload.model_dump(exclude_unset=True)

    new_email = data.get("email")
    if new_email and new_email != current_user.email:
        clash = await db.scalar(select(User).where(User.email == new_email))
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That email is already in use",
            )

    for field, value in data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(db: DbSession, current_user: CurrentUser) -> None:
    await db.delete(current_user)
    await db.commit()


@router.patch("/me/notification-prefs", response_model=UserMe)
async def update_notification_prefs(
    payload: NotificationPrefsUpdate, db: DbSession, current_user: CurrentUser
) -> User:
    prefs = dict(current_user.notification_prefs or {})
    prefs.update(payload.model_dump(exclude_unset=True))
    current_user.notification_prefs = prefs
    await db.commit()
    await db.refresh(current_user)
    return current_user
