from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models import GroupMember, GroupMessage, Idea, User
from app.realtime import push_group_message
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
