import os
import logging

logger = logging.getLogger("moneyflow")


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "moneyflow-dev-secret-change-in-prod")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", "7"))
    API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")
    DEFAULT_ADMIN_USERNAME: str = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    ALLOWED_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8000").split(",") if o.strip()
    ]
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    def validate(self):
        """Validate critical settings for production."""
        if self.ENVIRONMENT == "production":
            if self.JWT_SECRET == "moneyflow-dev-secret-change-in-prod":
                raise ValueError("JWT_SECRET must be changed in production!")
            if len(self.JWT_SECRET) < 32:
                raise ValueError("JWT_SECRET must be at least 32 characters in production!")
            if self.DEFAULT_ADMIN_PASSWORD == "admin123":
                logger.warning("DEFAULT_ADMIN_PASSWORD is still using default value!")


settings = Settings()
