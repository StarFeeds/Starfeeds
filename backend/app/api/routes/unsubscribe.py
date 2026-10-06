"""One-click unsubscribe from activity emails (link in every email).

No login needed: the signed, long-lived `unsubscribe` token identifies the
user and can only ever turn activity emails off.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import DbSession
from app.core.security import decode_token
from app.models import User

router = APIRouter(prefix="/email", tags=["email"])


class UnsubscribeIn(BaseModel):
    token: str


class UnsubscribeOut(BaseModel):
    email: str


@router.post("/unsubscribe", response_model=UnsubscribeOut)
async def unsubscribe(payload: UnsubscribeIn, db: DbSession) -> UnsubscribeOut:
    subject = decode_token(payload.token, expected_type="unsubscribe")
    user = await db.get(User, int(subject)) if subject else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This unsubscribe link is invalid or has expired.",
        )
    # Reassign (not mutate) so SQLAlchemy sees the JSON column change.
    user.notification_prefs = {**(user.notification_prefs or {}), "email_activity": False}
    await db.commit()
    return UnsubscribeOut(email=user.email)
