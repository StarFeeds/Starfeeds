from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    # The ID token from Google Identity Services ("credential").
    credential: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class GoogleAuthResponse(TokenPair):
    # True when this sign-in created the account (frontend can onboard).
    is_new: bool = False
