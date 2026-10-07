"""Endpoints for scheduled jobs (called by GitHub Actions cron, not users).

Protected by the X-Cron-Secret header, which must equal settings.CRON_SECRET.
With CRON_SECRET unset these endpoints don't exist (404).
"""

import hmac

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query, status

from app.core.config import settings
from app.digest import send_weekly_digest

router = APIRouter(prefix="/internal", tags=["internal"], include_in_schema=False)


def _check_secret(given: str | None) -> None:
    if not settings.CRON_SECRET:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if not given or not hmac.compare_digest(given, settings.CRON_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)


@router.post("/digest/weekly", status_code=status.HTTP_202_ACCEPTED)
async def weekly_digest(
    background_tasks: BackgroundTasks,
    x_cron_secret: str | None = Header(default=None),
    to: str | None = Query(default=None, max_length=255, description="Send a test copy to this user only"),
) -> dict[str, str]:
    """Queue this week's digest. Safe to call more than once a week."""
    _check_secret(x_cron_secret)
    background_tasks.add_task(send_weekly_digest, to)
    return {"status": "queued", "to": to or "everyone"}
