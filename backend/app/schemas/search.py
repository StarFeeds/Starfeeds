from pydantic import BaseModel

from app.schemas.idea import IdeaOut
from app.schemas.user import UserPublic


class SearchResults(BaseModel):
    ideas: list[IdeaOut]
    users: list[UserPublic]
