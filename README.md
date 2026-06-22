# StarFeeds — Idea Bank

A social platform for sharing and discovering ideas. Users post ideas, browse a feed, upvote, save, and express interest in collaborating.

Built directly from the [Starfeeds Idea Bank Figma file](https://www.figma.com/proto/mydN5agQSCpNWjKfnanESC/Starfeeds-Idea-Bank).

## Stack

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 16 · TypeScript · Tailwind CSS           |
| Backend  | FastAPI · SQLAlchemy 2.0 (async) · asyncpg      |
| Database | SQLite (dev) / PostgreSQL 16 (prod)             |
| Auth     | JWT (access + refresh tokens), bcrypt            |

## Quick Start

### 1. Backend (http://localhost:8000)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.seed        # create tables + demo data
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### 2. Frontend (http://localhost:3000)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Both Together (Windows)

```bash
cd StarFeedsAI
dev.bat
```

## Demo Login

```
Email:    demo@starfeeds.app
Password: password123
```

## Features Implemented (MVP)

✅ **Auth** — Register, login, refresh tokens, protected routes  
✅ **Ideas Feed** — Create, list, filter, sort by recent/top  
✅ **Interactions** — Upvote/save toggle with per-user state tracking  
✅ **Design System** — Figma colors/type baked into Tailwind  
✅ **Responsive UI** — Header, sidebar, idea cards matching Figma  

## Project Structure

```
backend/           FastAPI (Python)
├── app/
│   ├── main.py              App root
│   ├── seed.py              Demo data
│   ├── core/                Config, security, JWT
│   ├── db/                  SQLAlchemy models & session
│   ├── models/              User, Idea, Upvote, SavedIdea
│   ├── schemas/             Pydantic request/response
│   └── api/routes/          Auth & ideas endpoints

frontend/          Next.js (TypeScript)
├── app/
│   ├── (auth)/              Login & register pages
│   ├── (app)/home/          Protected feed page
│   └── layout.tsx           Root + AuthProvider
├── lib/
│   ├── api/                 API client & types
│   └── context/             Auth context
└── components/              Header, Sidebar, IdeaCard

design/
├── figma_home.png           Home screen screenshot
└── styleguide.png           Colors, type, spacing reference
```

## Next Steps

**Phase 2:** Make Post, User Profiles, Edit Profile  
**Phase 3:** Messages, Notifications, Collaboration Requests  
**Phase 4:** Real-time updates, Image upload, Search, Settings  

---

Built with ❤️ from Figma to full stack in one session.
