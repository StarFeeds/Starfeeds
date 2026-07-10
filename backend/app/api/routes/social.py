from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.core.security import decode_token
from app.models import (
    CollaborationRequest,
    Conversation,
    Message,
    Notification,
    User,
)
from app.realtime import manager, push_message, push_notification
from app.schemas.social import (
    ActivityItem,
    CollaborationRequestOut,
    ConversationCreate,
    ConversationOut,
    MessageCreate,
    MessageOut,
    NotificationOut,
)

router = APIRouter(tags=["social"])

# Map an Activity tab to the notification types it surfaces.
ACTIVITY_TYPE_MAP: dict[str, list[str]] = {
    "all": [],
    "ratings": ["upvote"],
    "comments": ["comment"],
    "collab": ["collab"],
}


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #
@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(
    db: DbSession, current_user: CurrentUser
) -> list[Notification]:
    rows = (
        await db.scalars(
            select(Notification)
            .options(selectinload(Notification.actor))
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc())
        )
    ).all()
    return list(rows)


@router.get("/notifications/unread-count")
async def unread_count(db: DbSession, current_user: CurrentUser) -> dict[str, int]:
    count = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == current_user.id, Notification.read.is_(False))
    )
    return {"count": count or 0}


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: int, db: DbSession, current_user: CurrentUser
) -> Notification:
    notif = await db.scalar(
        select(Notification)
        .options(selectinload(Notification.actor))
        .where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notif is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    notif.read = True
    await db.commit()
    await db.refresh(notif, attribute_names=["actor"])
    return notif


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(db: DbSession, current_user: CurrentUser) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read.is_(False))
        .values(read=True)
    )
    await db.commit()


# --------------------------------------------------------------------------- #
# Activity (derived from notifications)
# --------------------------------------------------------------------------- #
@router.get("/activity", response_model=list[ActivityItem])
async def list_activity(
    db: DbSession,
    current_user: CurrentUser,
    type: str = Query("all", pattern="^(all|ratings|comments|collab)$"),
) -> list[Notification]:
    stmt = (
        select(Notification)
        .options(selectinload(Notification.actor))
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    wanted = ACTIVITY_TYPE_MAP[type]
    if wanted:
        stmt = stmt.where(Notification.type.in_(wanted))
    rows = (await db.scalars(stmt)).all()
    return list(rows)


# --------------------------------------------------------------------------- #
# Collaboration requests
# --------------------------------------------------------------------------- #
@router.get("/collaboration-requests", response_model=list[CollaborationRequestOut])
async def list_collab_requests(
    db: DbSession,
    current_user: CurrentUser,
    box: str = Query("incoming", pattern="^(incoming|outgoing)$"),
) -> list[CollaborationRequest]:
    field = (
        CollaborationRequest.to_user_id
        if box == "incoming"
        else CollaborationRequest.from_user_id
    )
    rows = (
        await db.scalars(
            select(CollaborationRequest)
            .options(
                selectinload(CollaborationRequest.from_user),
                selectinload(CollaborationRequest.to_user),
            )
            .where(field == current_user.id)
            .order_by(CollaborationRequest.created_at.desc())
        )
    ).all()
    return list(rows)


async def _resolve_collab(
    request_id: int, new_status: str, db: DbSession, current_user: CurrentUser
) -> CollaborationRequest:
    req = await db.scalar(
        select(CollaborationRequest)
        .options(
            selectinload(CollaborationRequest.from_user),
            selectinload(CollaborationRequest.to_user),
        )
        .where(CollaborationRequest.id == request_id)
    )
    if req is None or req.to_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    req.status = new_status
    convo_id: int | None = None
    notif: Notification | None = None

    if new_status == "accepted":
        # Open (or reuse) a conversation so the two can actually collaborate.
        convo = await _get_or_create_conversation(
            db, req.from_user_id, req.to_user_id
        )
        convo_id = convo.id
        notif = Notification(
            user_id=req.from_user_id,
            actor_id=current_user.id,
            type="collab",
            text="accepted your collaboration request",
            idea_id=req.idea_id,
        )
        db.add(notif)

    await db.commit()
    await db.refresh(req, attribute_names=["from_user", "to_user"])
    if notif is not None:
        await db.refresh(notif)
        await push_notification(req.from_user_id, notif, current_user)

    # Transient attribute consumed by the response model (not a DB column).
    req.conversation_id = convo_id
    return req


@router.post("/collaboration-requests/{request_id}/accept", response_model=CollaborationRequestOut)
async def accept_collab(
    request_id: int, db: DbSession, current_user: CurrentUser
) -> CollaborationRequest:
    return await _resolve_collab(request_id, "accepted", db, current_user)


@router.post("/collaboration-requests/{request_id}/decline", response_model=CollaborationRequestOut)
async def decline_collab(
    request_id: int, db: DbSession, current_user: CurrentUser
) -> CollaborationRequest:
    return await _resolve_collab(request_id, "declined", db, current_user)


# --------------------------------------------------------------------------- #
# Conversations & messages
# --------------------------------------------------------------------------- #
async def _conversation_out(
    db: DbSession, convo: Conversation, me_id: int
) -> ConversationOut:
    other = convo.user_b if convo.user_a_id == me_id else convo.user_a
    last = await db.scalar(
        select(Message)
        .where(Message.conversation_id == convo.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    unread = await db.scalar(
        select(func.count())
        .select_from(Message)
        .where(
            Message.conversation_id == convo.id,
            Message.sender_id != me_id,
            Message.read.is_(False),
        )
    )
    from app.schemas.user import UserPublic

    return ConversationOut(
        id=convo.id,
        other_user=UserPublic.model_validate(other),
        last_message=last.body if last else None,
        last_time=last.created_at if last else None,
        unread=unread or 0,
    )


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    db: DbSession, current_user: CurrentUser
) -> list[ConversationOut]:
    convos = (
        await db.scalars(
            select(Conversation)
            .options(
                selectinload(Conversation.user_a),
                selectinload(Conversation.user_b),
            )
            .where(
                or_(
                    Conversation.user_a_id == current_user.id,
                    Conversation.user_b_id == current_user.id,
                )
            )
            .order_by(Conversation.updated_at.desc())
        )
    ).all()
    return [await _conversation_out(db, c, current_user.id) for c in convos]


async def _get_or_create_conversation(
    db: DbSession, user1_id: int, user2_id: int
) -> Conversation:
    """Return the (canonical, deduped) conversation between two users, creating it if needed."""
    a, b = sorted([user1_id, user2_id])
    convo = await db.scalar(
        select(Conversation)
        .options(
            selectinload(Conversation.user_a), selectinload(Conversation.user_b)
        )
        .where(Conversation.user_a_id == a, Conversation.user_b_id == b)
    )
    if convo is None:
        convo = Conversation(user_a_id=a, user_b_id=b)
        db.add(convo)
        await db.commit()
        await db.refresh(convo, attribute_names=["user_a", "user_b"])
    return convo


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate, db: DbSession, current_user: CurrentUser
) -> ConversationOut:
    if payload.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start a conversation with yourself",
        )
    other = await db.get(User, payload.user_id)
    if other is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    convo = await _get_or_create_conversation(db, current_user.id, payload.user_id)
    return await _conversation_out(db, convo, current_user.id)


async def _get_convo_or_404(
    conversation_id: int, db: DbSession, me_id: int
) -> Conversation:
    convo = await db.get(Conversation, conversation_id)
    if convo is None or me_id not in (convo.user_a_id, convo.user_b_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return convo


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: int, db: DbSession, current_user: CurrentUser
) -> list[Message]:
    await _get_convo_or_404(conversation_id, db, current_user.id)
    # Mark incoming messages as read.
    await db.execute(
        update(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user.id,
            Message.read.is_(False),
        )
        .values(read=True)
    )
    await db.commit()
    rows = (
        await db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
    ).all()
    return list(rows)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> Message:
    convo = await _get_convo_or_404(conversation_id, db, current_user.id)
    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        body=payload.body,
    )
    db.add(msg)
    # Bump the conversation so it sorts to the top of both inboxes.
    convo.updated_at = func.now()
    await db.commit()
    await db.refresh(msg)

    other_id = convo.user_b_id if convo.user_a_id == current_user.id else convo.user_a_id
    await push_message(other_id, conversation_id, msg)
    return msg


@router.websocket("/ws")
async def realtime_ws(websocket: WebSocket, token: str = "") -> None:
    """Per-user live channel. Authenticate with ?token=<access token>."""
    subject = decode_token(token, expected_type="access")
    if subject is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    user_id = int(subject)
    await manager.connect(user_id, websocket)
    try:
        while True:
            # We don't expect inbound frames; receive to detect disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user_id, websocket)
