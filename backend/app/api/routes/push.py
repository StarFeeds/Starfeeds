"""Browser push subscriptions: the frontend registers each device here."""

from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.models import PushSubscription

router = APIRouter(prefix="/push", tags=["push"])


class PushKeys(BaseModel):
    p256dh: str = Field(max_length=200)
    auth: str = Field(max_length=100)


class PushSubscribeIn(BaseModel):
    endpoint: str = Field(max_length=1000, pattern=r"^https://")
    keys: PushKeys


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(max_length=1000)


@router.get("/public-key")
async def public_key() -> dict:
    """The VAPID public key browsers need to subscribe (null = push is off)."""
    return {"key": settings.VAPID_PUBLIC_KEY if settings.push_enabled else None}


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(payload: PushSubscribeIn, db: DbSession, current_user: CurrentUser) -> None:
    """Register (or re-assign) this browser's push endpoint to the current user."""
    sub = await db.scalar(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    if sub is None:
        db.add(
            PushSubscription(
                user_id=current_user.id, endpoint=payload.endpoint, p256dh=payload.keys.p256dh, auth=payload.keys.auth
            )
        )
    else:  # same browser, maybe a different account now
        sub.user_id, sub.p256dh, sub.auth = current_user.id, payload.keys.p256dh, payload.keys.auth
    await db.commit()


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(payload: PushUnsubscribeIn, db: DbSession, current_user: CurrentUser) -> None:
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == payload.endpoint, PushSubscription.user_id == current_user.id
        )
    )
    await db.commit()
