from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, auth, ideas, search, social
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/email", tags=["health"])
async def email_status() -> dict:
    """Non-secret diagnostic: which email provider is active in this env."""
    if settings.RESEND_API_KEY:
        provider = "resend"
    elif settings.SENDGRID_API_KEY:
        provider = "sendgrid"
    elif settings.smtp_configured:
        provider = "smtp"
    else:
        provider = "none"
    return {
        "email_enabled": settings.email_enabled,
        "provider": provider,
        "from": settings.email_from_address,
        "from_name": settings.EMAIL_FROM_NAME,
        "frontend_url": settings.FRONTEND_URL,
    }


app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(ideas.router, prefix=settings.API_V1_PREFIX)
app.include_router(social.router, prefix=settings.API_V1_PREFIX)
app.include_router(search.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
