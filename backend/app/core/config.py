from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Values that must never be used as the signing key in production.
INSECURE_SECRETS = {
    "change-me",
    "change-me-to-a-long-random-string-in-production",
    "dev-insecure-secret-change-me",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "StarFeeds API"
    API_V1_PREFIX: str = "/api/v1"
    # "development" | "production"
    ENVIRONMENT: str = "development"

    # Local default is SQLite for zero-config dev; production sets a Postgres URL.
    DATABASE_URL: str = "sqlite+aiosqlite:///./starfeeds.db"

    SECRET_KEY: str = "dev-insecure-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = "http://localhost:3000"

    # Public URL of the frontend (used for links in emails).
    FRONTEND_URL: str = "http://localhost:3000"

    # Email. Two backends supported:
    #  - SendGrid over HTTPS (works on hosts that block outbound SMTP, e.g. Render)
    #  - SMTP (good for local dev)
    # If neither is configured, sends are a logged no-op so signup still works.
    # SendGrid takes precedence when SENDGRID_API_KEY is set.
    SENDGRID_API_KEY: str | None = None
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_STARTTLS: bool = True
    EMAIL_FROM: str | None = None
    EMAIL_FROM_NAME: str = "StarFeeds"

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    @property
    def email_enabled(self) -> bool:
        return bool(self.SENDGRID_API_KEY) or self.smtp_configured

    @property
    def email_from_address(self) -> str:
        return self.EMAIL_FROM or self.SMTP_USER or "no-reply@starfeeds.app"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        """Accept the bare URLs that hosts (Render/Heroku/Neon) hand out and
        coerce them to the async driver SQLAlchemy needs.

        - postgres://...      -> postgresql+asyncpg://...
        - postgresql://...    -> postgresql+asyncpg://...
        Also strips the libpq-only `sslmode` query param, which asyncpg rejects.
        """
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]

        if v.startswith("postgresql+asyncpg://") and "sslmode=" in v:
            # Drop sslmode=... (and a trailing ?/& if it becomes empty).
            import re

            v = re.sub(r"([?&])sslmode=[^&]*(&)?", lambda m: m.group(1) if m.group(2) else "", v)
            v = v.rstrip("?&")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def _guard_production(self) -> "Settings":
        if self.is_production:
            if self.SECRET_KEY in INSECURE_SECRETS or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be a strong (>=32 char) random value in production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
                )
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError(
                    "DATABASE_URL must point to Postgres in production (got SQLite)."
                )
            if any("localhost" in o or "127.0.0.1" in o for o in self.cors_origins_list):
                # Not fatal, but almost always a misconfiguration.
                import warnings

                warnings.warn("CORS_ORIGINS still contains localhost in production.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
