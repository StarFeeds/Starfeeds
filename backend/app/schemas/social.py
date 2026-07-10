from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserPublic


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    text: str
    read: bool
    created_at: datetime
    idea_id: int | None = None
    actor: UserPublic | None = None


class CollaborationRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: datetime
    idea_id: int | None = None
    from_user: UserPublic
    to_user: UserPublic
    # Set when a request is accepted — the conversation the two can chat in.
    conversation_id: int | None = None


class InterestCreate(BaseModel):
    to_user_id: int
    idea_id: int | None = None


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    sender_id: int
    read: bool
    created_at: datetime


class ConversationOut(BaseModel):
    id: int
    other_user: UserPublic
    last_message: str | None = None
    last_time: datetime | None = None
    unread: int = 0


class ConversationCreate(BaseModel):
    user_id: int


class ActivityItem(BaseModel):
    """A flattened activity entry, derived from notifications."""

    id: int
    type: str
    text: str
    created_at: datetime
    idea_id: int | None = None
    actor: UserPublic | None = None
