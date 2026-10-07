from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TokenType = Literal["access", "refresh", "unsubscribe"]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(
    subject: str | int, token_type: TokenType, expires: timedelta, **claims: Any
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires,
        **claims,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str | int) -> str:
    return _create_token(
        subject, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(subject: str | int) -> str:
    return _create_token(
        subject, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )


# Email kinds a one-click unsubscribe link can turn off -> notification_prefs key.
UNSUBSCRIBE_SCOPES = {"activity": "email_activity", "weekly": "weekly", "announcements": "announcements"}


def create_unsubscribe_token(subject: str | int, scope: str = "activity") -> str:
    """Long-lived token for one-click "stop these emails" links."""
    return _create_token(subject, "unsubscribe", timedelta(days=365), scope=scope)


def decode_unsubscribe_token(token: str) -> tuple[int, str] | None:
    """(user_id, scope) for a valid unsubscribe token, else None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    scope = payload.get("scope", "activity")
    if payload.get("type") != "unsubscribe" or scope not in UNSUBSCRIBE_SCOPES:
        return None
    return int(payload["sub"]), scope


def decode_token(token: str, expected_type: TokenType) -> str | None:
    """Return the subject (user id as str) if valid and of the expected type."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload.get("sub")
