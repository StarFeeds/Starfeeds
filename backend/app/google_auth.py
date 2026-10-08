"""Verify Google Sign-In ID tokens (the `credential` from Google Identity
Services on the frontend).

The token is a JWT signed by Google; we check the signature against
Google's published keys (cached), the audience (our client ID), the issuer,
expiry, and that Google has verified the email. No client secret needed.
"""

from __future__ import annotations

import time
from typing import Any

import httpx
from jose import JWTError, jwt

from app.core.config import settings

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")
_CACHE_SECONDS = 3600
_jwks: dict[str, Any] | None = None
_jwks_fetched_at = 0.0


class GoogleTokenError(Exception):
    """The credential isn't a valid Google sign-in for this app."""


async def _google_keys(force: bool = False) -> dict[str, Any]:
    global _jwks, _jwks_fetched_at
    if force or _jwks is None or time.monotonic() - _jwks_fetched_at > _CACHE_SECONDS:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GOOGLE_CERTS_URL)
            resp.raise_for_status()
            _jwks = resp.json()
            _jwks_fetched_at = time.monotonic()
    return _jwks


async def verify_google_credential(credential: str) -> dict[str, Any]:
    """Return the token's claims (email, name, picture, sub...) or raise."""
    if not settings.GOOGLE_CLIENT_ID:
        raise GoogleTokenError("Google sign-in isn't configured")
    try:
        kid = jwt.get_unverified_header(credential).get("kid")
    except JWTError as e:
        raise GoogleTokenError("Malformed Google credential") from e

    keys = await _google_keys()
    if not any(k.get("kid") == kid for k in keys.get("keys", [])):
        keys = await _google_keys(force=True)  # Google rotated its keys

    try:
        claims = jwt.decode(
            credential,
            keys,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            options={"verify_at_hash": False},
        )
    except JWTError as e:
        raise GoogleTokenError("Invalid Google credential") from e

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleTokenError("Invalid Google credential issuer")
    if not claims.get("email") or not claims.get("email_verified"):
        raise GoogleTokenError("Your Google account's email isn't verified")
    return claims
