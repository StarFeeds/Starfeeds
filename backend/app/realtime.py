"""In-process WebSocket fan-out for live messages and notifications.

NOTE: connections live in this process's memory. With multiple workers or a
serverless deploy this won't broadcast across instances — swap the registry
for Redis pub/sub at that point.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._conns: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._conns[user_id].add(ws)

    async def disconnect(self, user_id: int, ws: WebSocket) -> None:
        async with self._lock:
            self._conns[user_id].discard(ws)
            if not self._conns[user_id]:
                self._conns.pop(user_id, None)

    async def send_to_user(self, user_id: int, payload: dict[str, Any]) -> None:
        for ws in list(self._conns.get(user_id, ())):
            try:
                await ws.send_json(payload)
            except Exception:
                await self.disconnect(user_id, ws)


manager = ConnectionManager()


def _public_user(user: Any) -> dict[str, Any] | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "headline": user.headline,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "is_online": getattr(user, "show_online_status", user.is_online),
    }


async def push_notification(recipient_id: int, notif: Any, actor: Any) -> None:
    """Build the payload from already-loaded attributes (no lazy loads)."""
    await manager.send_to_user(
        recipient_id,
        {
            "type": "notification",
            "notification": {
                "id": notif.id,
                "type": notif.type,
                "text": notif.text,
                "read": notif.read,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
                "idea_id": notif.idea_id,
                "actor": _public_user(actor),
            },
        },
    )


async def push_message(recipient_id: int, conversation_id: int, msg: Any) -> None:
    await manager.send_to_user(
        recipient_id,
        {
            "type": "message",
            "conversation_id": conversation_id,
            "message": {
                "id": msg.id,
                "body": msg.body,
                "sender_id": msg.sender_id,
                "read": msg.read,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            },
        },
    )
