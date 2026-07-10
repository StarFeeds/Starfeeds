# Deploying StarFeeds (MVP)

Architecture: **Frontend on Vercel**, **Backend + Postgres on Render**.
Realtime uses an in-process WebSocket registry, so the API runs as a **single instance**
(don't enable autoscaling until you add Redis pub/sub).

---

## 1. Backend + database (Render)

The repo ships a `render.yaml` blueprint (API as Docker + managed Postgres).

1. Push the repo to GitHub.
2. Render dashboard → **New → Blueprint** → select this repo. It reads `render.yaml` and creates:
   - `starfeeds-db` (Postgres)
   - `starfeeds-api` (Docker web service)
3. `DATABASE_URL` and `SECRET_KEY` are wired automatically (DB connection string + a generated secret).
4. Set **`CORS_ORIGINS`** on `starfeeds-api` to your frontend origin once you have it,
   e.g. `https://starfeeds.vercel.app` (comma-separate multiple).
5. Deploy. On boot the container runs `alembic upgrade head` (creates/updates tables — **non-destructive**), then starts uvicorn.

Notes
- The `free` API plan spins down after ~15 min idle (cold starts + dropped sockets). Use `starter` for always-on.
- `DATABASE_URL` from Render is `postgresql://…`; the app auto-rewrites it to `postgresql+asyncpg://…` (see `app/core/config.py`).
- The API has **no demo data** in production. To create the first user, register through the UI. (`python -m app.seed` is **dev-only** — it drops & recreates tables.)

## 2. Frontend (Vercel)

1. Vercel → **New Project** → import the repo.
2. Set **Root Directory = `frontend`** (Vercel auto-detects Next.js).
3. Add env var **`NEXT_PUBLIC_API_URL`** = your Render API URL, e.g. `https://starfeeds-api.onrender.com` (no trailing slash, no `/api/v1`).
4. Deploy. The realtime WebSocket URL is derived automatically (`https` → `wss`).
5. Copy the resulting Vercel URL back into the API's `CORS_ORIGINS` (step 1.4) and redeploy the API.

## 3. Local development

```bash
# Backend (from backend/)
cp .env.example .env          # defaults to local Postgres; or use sqlite for zero-setup
alembic upgrade head          # create schema
python -m app.seed            # OPTIONAL: dev-only demo data (drops & recreates tables)
python -m uvicorn app.main:app --reload --port 8000

# Frontend (from frontend/)
cp .env.example .env.local
npm install && npm run dev
```

Zero-setup DB for local dev: set `DATABASE_URL=sqlite+aiosqlite:///./starfeeds.db` in `backend/.env`.

## 4. Database migrations

Schema is managed by Alembic (`backend/migrations/`).

```bash
# After changing models in app/models/:
alembic revision --autogenerate -m "describe change"
alembic upgrade head     # applied automatically on each deploy
```

## 5. Production env vars (reference)

| Var | Where | Notes |
|-----|-------|-------|
| `DATABASE_URL` | API | Postgres; auto-rewritten to asyncpg. Render injects it. |
| `SECRET_KEY` | API | ≥32 random chars. Render generates it. Boot **fails** if insecure in prod. |
| `ENVIRONMENT` | API | `production` enables the prod safety checks. |
| `CORS_ORIGINS` | API | Comma-separated frontend origins. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | API | Session lengths (30 / 7 by default). |
| `NEXT_PUBLIC_API_URL` | Frontend (Vercel) | Base API URL, no trailing slash. |

## 6. Continuous integration (GitHub Actions)

`.github/workflows/ci.yml` runs on every push / PR to `main` (or `master`):

- **Backend job** — spins up a Postgres service, runs `alembic upgrade head` → `seed` → starts the API → runs the full integration suite (`full_test.py`: auth, ideas, comments, collaboration, messages, notifications, **realtime WebSocket**).
- **Frontend job** — `npm ci` → `npm run lint` → `npm run build` (also type-checks).
- **Deploy job** — runs only on push to `main`, only after both jobs pass.

### Gating deploys on green CI

By default Render and Vercel **auto-deploy on every push**, independent of CI. To make deploys wait for tests, pick one:

- **Branch protection (simplest):** in GitHub → Settings → Branches, require the `Backend tests` and `Frontend build` checks to pass before merging to `main`. Deploy from `main`. Bad code can't merge, so it can't deploy.
- **Deploy hooks:** turn OFF auto-deploy in Render & Vercel, then add repo secrets `RENDER_DEPLOY_HOOK_URL` and `VERCEL_DEPLOY_HOOK_URL` (both have "Deploy Hook" URLs in their dashboards). The CI `deploy` job fires them only after tests pass. If the secrets aren't set, the job no-ops.

## 7. Known limitations (not deploy blockers)

- Single API instance only (in-memory realtime). Scale-out needs Redis pub/sub.
- No public-profile page, password-reset email, or real OAuth yet (UI placeholders).
