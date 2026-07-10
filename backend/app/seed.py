"""Populate demo data for local development. NOT for production.

Schema is owned by Alembic, so run migrations first, then seed:
    alembic upgrade head
    python -m app.seed

This clears existing rows and inserts a fresh demo dataset (it does NOT
create or drop tables).
"""

import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models import (
    CollaborationRequest,
    Comment,
    Conversation,
    Idea,
    Message,
    Notification,
    SavedIdea,
    Upvote,
    User,
)

DEMO_USERS = [
    {
        "email": "demo@starfeeds.app",
        "username": "miabaga",
        "full_name": "MI Abaga",
        "headline": "Entrepreneur",
        "password": "password123",
        "is_online": True,
    },
    {
        "email": "ada@starfeeds.app",
        "username": "ada",
        "full_name": "Ada Lovelace",
        "headline": "Founder",
        "password": "password123",
        "is_online": False,
    },
    {
        "email": "ola@starfeeds.app",
        "username": "ola",
        "full_name": "Ola Roberts",
        "headline": "Product Designer",
        "password": "password123",
        "is_online": True,
    },
]

DEMO_IDEAS = [
    {
        "title": "Flying Cars",
        "category": "Artificial Intelligence",
        "body": (
            "Autonomous personal aircraft for short city hops. Pizza ipsum dolor "
            "meat lovers buffalo. Red mayo melted tomatoes marinara Philly. Extra "
            "thin string extra anchovies."
        ),
    },
    {
        "title": "Carbon-negative Concrete",
        "category": "Climate Tech",
        "body": (
            "A cement alternative that sequesters CO2 as it cures. Pizza ipsum "
            "dolor meat lovers buffalo. Red mayo melted tomatoes marinara Philly."
        ),
    },
    {
        "title": "AI Tutor for Local Languages",
        "category": "Education",
        "body": (
            "A voice-first tutor that teaches numeracy in indigenous languages. "
            "Pizza ipsum dolor meat lovers buffalo melted tomatoes marinara Philly."
        ),
    },
    {
        "title": "Micro-grid Marketplace",
        "category": "Energy",
        "body": (
            "Neighbours buy and sell surplus solar power peer-to-peer. Pizza ipsum "
            "dolor meat lovers buffalo. Red mayo melted tomatoes marinara Philly."
        ),
    },
]


async def main() -> None:
    # Clear existing rows in FK-safe order (children first). Tables are created
    # by Alembic migrations, not here.
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())

    async with AsyncSessionLocal() as db:
        users: list[User] = []
        for u in DEMO_USERS:
            user = User(
                email=u["email"],
                username=u["username"],
                full_name=u["full_name"],
                headline=u["headline"],
                hashed_password=hash_password(u["password"]),
                is_online=u["is_online"],
            )
            db.add(user)
            users.append(user)
        await db.commit()
        for user in users:
            await db.refresh(user)

        for i, data in enumerate(DEMO_IDEAS):
            idea = Idea(
                title=data["title"],
                body=data["body"],
                category=data["category"],
                author_id=users[i % len(users)].id,
            )
            db.add(idea)
        await db.commit()

        ideas = (await db.scalars(select(Idea))).all()
        # Seed some upvotes and saves so the feed looks alive.
        for idx, idea in enumerate(ideas):
            for j, user in enumerate(users):
                if (idx + j) % 2 == 0:
                    db.add(Upvote(idea_id=idea.id, user_id=user.id))
            if idx % 2 == 0:
                db.add(SavedIdea(idea_id=idea.id, user_id=users[0].id))
        await db.commit()

        primary = users[0]  # MI Abaga — the demo login
        primary_ideas = [i for i in ideas if i.author_id == primary.id]

        # Comments on the demo user's ideas.
        for idx, idea in enumerate(primary_ideas):
            commenter = users[(idx + 1) % len(users)]
            db.add(
                Comment(
                    idea_id=idea.id,
                    author_id=commenter.id,
                    body="This is a brilliant idea — how do you plan to go about it?",
                )
            )

        # Notifications for the demo user (comment / upvote / collab / system).
        if primary_ideas:
            target = primary_ideas[0]
            db.add_all(
                [
                    Notification(
                        user_id=primary.id,
                        actor_id=users[1].id,
                        type="comment",
                        text=f'commented on your idea "{target.title}"',
                        idea_id=target.id,
                    ),
                    Notification(
                        user_id=primary.id,
                        actor_id=users[2].id,
                        type="upvote",
                        text=f'upvoted your idea "{target.title}"',
                        idea_id=target.id,
                    ),
                    Notification(
                        user_id=primary.id,
                        actor_id=users[1].id,
                        type="collab",
                        text=f'expressed interest in your idea "{target.title}"',
                        idea_id=target.id,
                    ),
                    Notification(
                        user_id=primary.id,
                        actor_id=None,
                        type="system",
                        text="Welcome to StarFeeds! Complete your profile to get discovered.",
                        read=True,
                    ),
                ]
            )

            # Incoming collaboration request.
            db.add(
                CollaborationRequest(
                    from_user_id=users[1].id,
                    to_user_id=primary.id,
                    idea_id=target.id,
                    status="pending",
                )
            )

        # A conversation with seeded messages.
        a, b = sorted([primary.id, users[2].id])
        convo = Conversation(user_a_id=a, user_b_id=b)
        db.add(convo)
        await db.commit()
        await db.refresh(convo)
        db.add_all(
            [
                Message(
                    conversation_id=convo.id,
                    sender_id=users[2].id,
                    body="I am doing well, can we meet tomorrow?",
                ),
                Message(
                    conversation_id=convo.id,
                    sender_id=primary.id,
                    body="Yes, sure!",
                ),
                Message(
                    conversation_id=convo.id,
                    sender_id=users[2].id,
                    body="Great — I'll send a calendar invite.",
                    read=False,
                ),
            ]
        )
        await db.commit()

    await engine.dispose()
    print("Seed complete. Login: demo@starfeeds.app / password123")


if __name__ == "__main__":
    asyncio.run(main())
