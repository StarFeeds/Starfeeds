from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.email import send_welcome_email
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenPair
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
    payload: UserCreate, db: DbSession, background_tasks: BackgroundTasks
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
    user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        is_online=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Fire the welcome email after the response is sent. Failures are logged
    # inside send_welcome_email and never affect signup.
    background_tasks.add_task(send_welcome_email, user.email, user.full_name)

    return _tokens_for(user)


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: DbSession) -> TokenPair:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    user.is_online = True
    await db.commit()
    return _tokens_for(user)


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
