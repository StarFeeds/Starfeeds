from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import CollaborationRequest, GroupMember, GroupMessage, Idea, Notification, User
from app.realtime import push_group_message, push_notification
from app.schemas.social import GroupMessageCreate, GroupMessageOut, GroupSummary
from app.schemas.user import UserPublic

router = APIRouter(tags=["groups"])


async def _members_query(idea_id: int):
    return (
        select(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .where(GroupMember.idea_id == idea_id)
        .order_by(GroupMember.created_at.asc())
    )


async def _is_member(db: DbSession, idea_id: int, user_id: int) -> bool:
    found = await db.scalar(
        select(GroupMember).where(
            GroupMember.idea_id == idea_id, GroupMember.user_id == user_id
        )
    )
    return found is not None


@router.get("/ideas/{idea_id}/members", response_model=list[UserPublic])
async def list_members(
    idea_id: int, db: DbSession, current_user: CurrentUser
) -> list[User]:
    members = (await db.scalars(await _members_query(idea_id))).all()
    return list(members)


@router.get("/me/groups", response_model=list[GroupSummary])
async def my_groups(db: DbSession, current_user: CurrentUser) -> list[GroupSummary]:
    ideas = (
        await db.scalars(
            select(Idea)
            .join(GroupMember, GroupMember.idea_id == Idea.id)
            .where(GroupMember.user_id == current_user.id)
            .order_by(Idea.created_at.desc())
        )
    ).all()
    out: list[GroupSummary] = []
    for idea in ideas:
        count = await db.scalar(
            select(func.count()).select_from(GroupMember).where(GroupMember.idea_id == idea.id)
        )
        out.append(
            GroupSummary(
                idea_id=idea.id,
                title=idea.title,
                member_count=count or 0,
                is_owner=idea.author_id == current_user.id,
                team_closed=idea.team_closed,
            )
        )
    return out


@router.get("/ideas/{idea_id}/group/messages", response_model=list[GroupMessageOut])
async def list_group_messages(
    idea_id: int, db: DbSession, current_user: CurrentUser
) -> list[GroupMessage]:
    if not await _is_member(db, idea_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join this project to see its discussion",
        )
    rows = (
        await db.scalars(
            select(GroupMessage)
            .options(selectinload(GroupMessage.sender))
            .where(GroupMessage.idea_id == idea_id)
            .order_by(GroupMessage.created_at.asc())
        )
    ).all()
    return list(rows)


@router.post(
    "/ideas/{idea_id}/group/messages",
    response_model=GroupMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_group_message(
    idea_id: int, payload: GroupMessageCreate, db: DbSession, current_user: CurrentUser
) -> GroupMessage:
    if not await _is_member(db, idea_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join this project to post in its discussion",
        )
    msg = GroupMessage(idea_id=idea_id, sender_id=current_user.id, body=payload.body)
    db.add(msg)
    await db.commit()
    await db.refresh(msg, attribute_names=["sender"])

    # Broadcast to the other members over the realtime channel.
    member_ids = (
        await db.scalars(
            select(GroupMember.user_id).where(GroupMember.idea_id == idea_id)
        )
    ).all()
    for uid in member_ids:
        if uid != current_user.id:
            await push_group_message(uid, idea_id, msg, current_user)
    return msg


# --------------------------------------------------------------------------- #
# Owner controls: close the team when it's complete, remove a member
# --------------------------------------------------------------------------- #
async def _owned_idea(db: DbSession, idea_id: int, user_id: int) -> Idea:
    idea = await db.get(Idea, idea_id)
    if idea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if idea.author_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the project owner can do that")
    return idea


@router.post("/ideas/{idea_id}/team/close")
async def close_team(idea_id: int, db: DbSession, current_user: CurrentUser) -> dict:
    """Stop taking join requests. Pending ones are declined with a gentle notice."""
    idea = await _owned_idea(db, idea_id, current_user.id)
    idea.team_closed = True
    pending = (
        await db.scalars(
            select(CollaborationRequest)
            .options(selectinload(CollaborationRequest.from_user))
            .where(CollaborationRequest.idea_id == idea_id, CollaborationRequest.status == "pending")
        )
    ).all()
    notifs = []
    for req in pending:
        req.status = "declined"
        if req.from_user.wants_notification("collab"):
            n = Notification(
                user_id=req.from_user_id,
                actor_id=current_user.id,
                type="collab",
                text=f"isn't adding new members to \"{idea.title}\" right now",
                idea_id=idea_id,
            )
            db.add(n)
            notifs.append(n)
    await db.commit()
    for n in notifs:
        await db.refresh(n)
        await push_notification(n.user_id, n, current_user)
    return {"team_closed": True, "declined": len(pending)}


@router.post("/ideas/{idea_id}/team/reopen")
async def reopen_team(idea_id: int, db: DbSession, current_user: CurrentUser) -> dict:
    idea = await _owned_idea(db, idea_id, current_user.id)
    idea.team_closed = False
    await db.commit()
    return {"team_closed": False}


@router.delete("/ideas/{idea_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(idea_id: int, user_id: int, db: DbSession, current_user: CurrentUser) -> None:
    """Owner removes someone who isn't a good fit. They lose access to the
    group (their past messages stay) and can't request to join again."""
    idea = await _owned_idea(db, idea_id, current_user.id)
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't remove yourself from your own project")
    member = await db.scalar(
        select(GroupMember).where(GroupMember.idea_id == idea_id, GroupMember.user_id == user_id)
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not a member of this project")
    await db.delete(member)

    req = await db.scalar(
        select(CollaborationRequest)
        .where(
            CollaborationRequest.idea_id == idea_id,
            CollaborationRequest.from_user_id == user_id,
            CollaborationRequest.status == "accepted",
        )
        .order_by(CollaborationRequest.created_at.desc())
    )
    if req is not None:
        req.status = "removed"  # also blocks a new request (see express_interest)

    removed_user = await db.get(User, user_id)
    notif = None
    if removed_user is not None and removed_user.wants_notification("collab"):
        notif = Notification(
            user_id=user_id,
            actor_id=current_user.id,
            type="collab",
            text=f"removed you from the \"{idea.title}\" team",
            idea_id=idea_id,
        )
        db.add(notif)
    await db.commit()
    if notif is not None:
        await db.refresh(notif)
        await push_notification(user_id, notif, current_user)
