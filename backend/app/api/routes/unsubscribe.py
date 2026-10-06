"""One-click unsubscribe (the link at the bottom of every email).

No login needed: the signed, long-lived `unsubscribe` token identifies the
user and the kind of email ("activity" or "weekly"), and can only ever turn
that kind of email off.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import DbSession
from app.core.security import UNSUBSCRIBE_SCOPES, decode_unsubscribe_token
from app.models import User

router = APIRouter(prefix="/email", tags=["email"])


class UnsubscribeIn(BaseModel):
    token: str


class UnsubscribeOut(BaseModel):
    email: str
    scope: str


@router.post("/unsubscribe", response_model=UnsubscribeOut)
async def unsubscribe(payload: UnsubscribeIn, db: DbSession) -> UnsubscribeOut:
    decoded = decode_unsubscribe_token(payload.token)
    user = await db.get(User, decoded[0]) if decoded else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This unsubscribe link is invalid or has expired.",
        )
    scope = decoded[1]
    # Reassign (not mutate) so SQLAlchemy sees the JSON column change.
    user.notification_prefs = {**(user.notification_prefs or {}), UNSUBSCRIBE_SCOPES[scope]: False}
    await db.commit()
    return UnsubscribeOut(email=user.email, scope=scope)
