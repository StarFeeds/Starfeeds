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

    async def connect(self, user_id: int, ws: WebSocket) -> bool:
        """Register a socket. True if it's the user's first (they just came online)."""
        await ws.accept()
        async with self._lock:
            first = not self._conns.get(user_id)
            self._conns[user_id].add(ws)
        return first

    async def disconnect(self, user_id: int, ws: WebSocket) -> bool:
        """Drop a socket. True if it was the user's last (they just went offline)."""
        async with self._lock:
            conns = self._conns.get(user_id)
            if conns is None:
                return False
            conns.discard(ws)
            if not conns:
                self._conns.pop(user_id, None)
                return True
            return False

    def online_count(self) -> int:
        return len(self._conns)

    def is_connected(self, user_id: int) -> bool:
        """Whether the user has LikeMinds open right now (a live socket)."""
        return bool(self._conns.get(user_id))

    async def send_to_user(self, user_id: int, payload: dict[str, Any]) -> None:
        for ws in list(self._conns.get(user_id, ())):
            try:
                await ws.send_json(payload)
            except Exception:
                # Dead socket: drop it, and if it was their last, they're offline.
                if await self.disconnect(user_id, ws):
                    from app.presence import set_presence  # avoid import cycle at load

                    await set_presence(user_id, online=False)


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
    # Not on the site right now? Reach them with a browser push instead.
    from app.push import notification_push, push_if_offline

    push_if_offline(recipient_id, **notification_push(notif, actor))


async def push_message(recipient_id: int, conversation_id: int, msg: Any, sender: Any = None) -> None:
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
    from app.push import push_if_offline

    name = getattr(sender, "full_name", None) or "Someone"
    push_if_offline(recipient_id, title=f"Message from {name}", body=msg.body, url="/messages", tag=f"dm-{conversation_id}")


async def push_group_message(recipient_id: int, idea_id: int, msg: Any, sender: Any) -> None:
    await manager.send_to_user(
        recipient_id,
        {
            "type": "group_message",
            "idea_id": idea_id,
            "message": {
                "id": msg.id,
                "body": msg.body,
                "sender_id": msg.sender_id,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "sender": _public_user(sender),
            },
        },
    )
    from app.push import push_group_if_offline

    push_group_if_offline(
        recipient_id,
        idea_id,
        title="New message in your project group",
        body=f"{getattr(sender, 'full_name', 'Someone')}: {msg.body}",
    )
