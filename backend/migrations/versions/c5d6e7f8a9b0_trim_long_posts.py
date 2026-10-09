"""data: shorten the two pre-limit posts to the new short-pitch format

Posts #1 and #3 predate the 400-character description limit (1,850 and
1,751 chars of pasted text). Replace each body with a faithful short
version, but only if the post is still over the limit (an owner may have
shortened it themselves), and tell the owner with an in-app notice.

Downgrade is a no-op: the originals aren't stored here (this repo is
public); restore from a database backup if ever needed.

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BODY_MAX = 1100


def _body(description: str, problem: str, audience: str, revenue: str) -> str:
    # Same shape the composer writes: description, then headed details.
    return "\n\n".join(
        [
            description,
            f"**Problem**\n{problem}",
            f"**Target Audience**\n{audience}",
            f"**Revenue Model**\n{revenue}",
        ]
    )


SHORTENED = {
    3: _body(
        "VibeyCursor is a Chrome extension for vibe coders. Hover over any element on any website, click it, "
        "and get a detailed, pixel-faithful prompt your AI assistant (Cursor, v0, Bolt, Lovable, ChatGPT) can "
        "recreate. Stop describing designs to AI, start copying them. In beta, v2.3.2.",
        "Getting AI coding tools to recreate a design you've seen takes endless trial-and-error prompting.",
        "Vibe coders and UI/UX designers.",
        "Monthly subscription. Pro adds section capture, screenshots, AI Enhance and history.",
    ),
    1: _body(
        "A unified digital system for hospitals that connects clinical work (doctors, nurses, lab, radiology, "
        "surgery), finance (billing, claims, revenue) and operations (staff, inventory, equipment), with "
        "management and executive dashboards for faster decisions.",
        "Growing hospitals run clinical, finance and admin work in separate systems, which slows operations "
        "and leaves leaders without a clear view.",
        "Hospital directors and administrators.",
        "Sold as a product to hospitals.",
    ),
}


def upgrade() -> None:
    conn = op.get_bind()
    for idea_id, body in SHORTENED.items():
        row = conn.execute(
            sa.text("SELECT author_id, title FROM ideas WHERE id = :id AND length(body) > :max"),
            {"id": idea_id, "max": BODY_MAX},
        ).first()
        if row is None:
            continue  # gone, or already short enough
        conn.execute(
            sa.text("UPDATE ideas SET body = :body, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
            {"body": body, "id": idea_id},
        )
        conn.execute(
            sa.text(
                "INSERT INTO notifications (user_id, actor_id, type, text, idea_id, read, created_at, updated_at) "
                "VALUES (:uid, NULL, 'system', :text, :id, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "uid": row.author_id,
                "id": idea_id,
                "text": (
                    f'LikeMinds shortened your post "{row.title}" to fit the new short-pitch format '
                    "(400-character description). You can edit it anytime."
                ),
            },
        )


def downgrade() -> None:
    pass
