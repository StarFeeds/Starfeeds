from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserPublic


class IdeaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    category: str = Field(default="General", max_length=80)
    visibility: str = Field(default="public", pattern="^(public|private)$")


class IdeaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    category: str
    visibility: str
    created_at: datetime
    author: UserPublic

    # Aggregates / per-viewer state (populated in the route layer)
    upvote_count: int = 0
    comment_count: int = 0
    saved_by_me: bool = False
    upvoted_by_me: bool = False


class IdeaListResponse(BaseModel):
    items: list[IdeaOut]
    total: int
    page: int
    page_size: int


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    created_at: datetime
    author: UserPublic
