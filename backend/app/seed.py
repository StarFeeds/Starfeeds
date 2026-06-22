"""Create tables and populate demo data. Idempotent-ish: drops & recreates.

Run with:  python -m app.seed
"""

import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models import Idea, SavedIdea, Upvote, User

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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

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

    await engine.dispose()
    print("Seed complete. Login: demo@starfeeds.app / password123")


if __name__ == "__main__":
    asyncio.run(main())
