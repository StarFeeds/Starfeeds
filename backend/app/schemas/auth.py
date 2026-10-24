from pydantic import BaseModel, Field, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    # The ID token from Google Identity Services ("credential").
    credential: str
    ref: str | None = Field(default=None, max_length=200)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class GoogleAuthResponse(TokenPair):
    # True when this sign-in created the account (frontend can onboard).
    is_new: bool = False
