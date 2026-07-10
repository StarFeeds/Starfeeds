"""Transactional email.

Two backends: SendGrid over HTTPS (survives hosts that block outbound SMTP,
e.g. Render) and SMTP (handy locally). SendGrid wins when its API key is set.

Sends are best-effort: if nothing is configured, or a send fails, we log and
return without raising — the caller (e.g. signup) must never fail on email.
"""

from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib
import httpx

from app.core.config import settings

logger = logging.getLogger("app.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"
SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send"


async def _send_via_resend(to: str, subject: str, html: str, text: str) -> bool:
    payload = {
        "from": f"{settings.EMAIL_FROM_NAME} <{settings.email_from_address}>",
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json=payload,
        )
    if resp.status_code in (200, 201):
        logger.info("Sent '%s' email to %s via Resend", subject, to)
        return True
    logger.error(
        "Resend send failed (%s) for '%s' to %s: %s",
        resp.status_code, subject, to, resp.text[:400],
    )
    return False


async def _send_via_sendgrid(to: str, subject: str, html: str, text: str) -> bool:
    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": settings.email_from_address, "name": settings.EMAIL_FROM_NAME},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": text},
            {"type": "text/html", "value": html},
        ],
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            SENDGRID_ENDPOINT,
            headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
            json=payload,
        )
    if resp.status_code in (200, 202):
        logger.info("Sent '%s' email to %s via SendGrid", subject, to)
        return True
    logger.error(
        "SendGrid send failed (%s) for '%s' to %s: %s",
        resp.status_code, subject, to, resp.text[:300],
    )
    return False


async def _send_via_smtp(to: str, subject: str, html: str, text: str) -> bool:
    msg = EmailMessage()
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.email_from_address}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    implicit_tls = settings.SMTP_PORT == 465
    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        use_tls=implicit_tls,
        start_tls=(not implicit_tls) and settings.SMTP_STARTTLS,
        timeout=15,
    )
    logger.info("Sent '%s' email to %s via SMTP", subject, to)
    return True


async def send_email(to: str, subject: str, html: str, text: str) -> bool:
    """Send one email. Returns True if sent, False if skipped/failed."""
    if not settings.email_enabled:
        logger.info("Email disabled (no provider configured); skipping '%s' to %s", subject, to)
        return False
    try:
        if settings.RESEND_API_KEY:
            return await _send_via_resend(to, subject, html, text)
        if settings.SENDGRID_API_KEY:
            return await _send_via_sendgrid(to, subject, html, text)
        return await _send_via_smtp(to, subject, html, text)
    except Exception:
        logger.exception("Failed to send '%s' email to %s", subject, to)
        return False


def _welcome_content(name: str) -> tuple[str, str]:
    """Return (html, text) for the welcome email."""
    first = (name or "there").split(" ")[0]
    cta = f"{settings.FRONTEND_URL.rstrip('/')}/home"

    text = (
        f"Hi {first},\n\n"
        "Welcome to IdeaBank by StarFeeds — the place to share startup ideas, "
        "get feedback, and find collaborators.\n\n"
        "Here's how to get started:\n"
        "  1. Post your first idea\n"
        "  2. Upvote and comment on ideas you like\n"
        "  3. Express interest to start collaborating\n\n"
        f"Jump in: {cta}\n\n"
        "— The IdeaBank team"
    )

    html = f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececf1;">
          <tr><td style="padding:32px 40px 8px;">
            <span style="font-size:22px;font-weight:bold;color:#4d0bc0;letter-spacing:-0.5px;">IdeaBank</span>
            <span style="font-size:13px;color:#9a9aa2;"> by StarFeeds</span>
          </td></tr>
          <tr><td style="padding:8px 40px 0;">
            <h1 style="margin:0 0 12px;font-size:24px;color:#111114;">Welcome to IdeaBank by StarFeeds 👋</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
              Hi {first}, you're in. IdeaBank is where you share startup ideas, get real
              feedback, and find people to build with.
            </p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3f3f46;">A few ways to start:</p>
            <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.7;color:#3f3f46;">
              <li>Post your first idea</li>
              <li>Upvote &amp; comment on ideas you like</li>
              <li>Express interest to start collaborating</li>
            </ul>
            <a href="{cta}"
               style="display:inline-block;background:#4d0bc0;color:#ffffff;text-decoration:none;
                      font-weight:bold;font-size:15px;padding:12px 28px;border-radius:999px;">
              Open IdeaBank
            </a>
          </td></tr>
          <tr><td style="padding:28px 40px 32px;">
            <p style="margin:0;font-size:12px;color:#9a9aa2;">
              You received this because you signed up for IdeaBank by StarFeeds.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""
    return html, text


async def send_welcome_email(to: str, name: str) -> None:
    html, text = _welcome_content(name)
    await send_email(to, "Welcome to IdeaBank by StarFeeds 🚀", html, text)
