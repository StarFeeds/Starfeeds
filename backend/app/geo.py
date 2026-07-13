"""Best-effort signup geolocation from the client IP.

Runs in a background task so it never blocks or fails signup.
"""

from __future__ import annotations

import logging

import httpx
from sqlalchemy import update

from app.db.session import AsyncSessionLocal
from app.models import User

logger = logging.getLogger("app.geo")

_PRIVATE_PREFIXES = ("127.", "10.", "192.168.", "172.16.", "::1", "fc", "fd")


def client_ip(request) -> str | None:
    """Real client IP, honoring the proxy's X-Forwarded-For (Render sits behind one)."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


async def geolocate_and_save(user_id: int, ip: str | None) -> None:
    if not ip or ip.startswith(_PRIVATE_PREFIXES) or ip in ("localhost",):
        return
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(f"https://ipwho.is/{ip}")
            data = resp.json()
        if not data.get("success"):
            return
        parts = [data.get("city"), data.get("region"), data.get("country")]
        # e.g. "Lagos, Lagos, Nigeria" -> keep city + country to stay concise
        loc = ", ".join(p for p in (data.get("city"), data.get("country")) if p)
        if not loc:
            loc = ", ".join(p for p in parts if p)
        if not loc:
            return
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(User).where(User.id == user_id).values(signup_location=loc)
            )
            await db.commit()
        logger.info("geolocated user %s -> %s", user_id, loc)
    except Exception:
        logger.exception("geolocation failed for user %s", user_id)
