from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenPair
from app.schemas.user import UserCreate, UserMe

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens_for(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: DbSession) -> TokenPair:
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
        hashed_password=hash_password(payload.password),
        is_online=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
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
