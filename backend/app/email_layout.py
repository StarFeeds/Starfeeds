"""Shared HTML frame for LikeMinds emails (logo, card, unsubscribe footer).

Callers pass already-escaped inner HTML; everything inserted here is escaped.
"""

from __future__ import annotations

import html


def button(label: str, url: str) -> str:
    return f"""<a href="{html.escape(url)}"
       style="display:inline-block;background:#4d0695;color:#ffffff;text-decoration:none;
              font-weight:bold;font-size:15px;padding:12px 28px;border-radius:999px;">{html.escape(label)}</a>"""


def wrap(inner_html: str, *, reason: str, unsub_url: str) -> str:
    """Full email document around `inner_html`; `reason` explains why they got it."""
    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ececf1;">
          <tr><td style="padding:28px 40px 4px;">
            <span style="font-size:20px;font-weight:bold;color:#4d0695;letter-spacing:-0.5px;">LikeMinds</span>
          </td></tr>
          <tr><td style="padding:12px 40px 0;">
{inner_html}
          </td></tr>
          <tr><td style="padding:28px 40px 32px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9aa2;">
              {html.escape(reason)}
              <a href="{html.escape(unsub_url)}" style="color:#9a9aa2;">Stop these emails</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""
