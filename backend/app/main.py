import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine, Base
from app.models import User, UserOAuth, UserSettings, Account, Category, Transaction, Subscription, SubscriptionCategory
from app.auth.router import router as auth_router
from app.routers import users, accounts, categories, transactions, subscriptions, reports, settings as settings_router
from app.services.auth_service import hash_password

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("moneyflow")

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate settings
    settings.validate()
    logger.info("Starting MoneyFlow (env=%s)", settings.ENVIRONMENT)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Initialize default admin + preset categories
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == settings.DEFAULT_ADMIN_USERNAME))
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                username=settings.DEFAULT_ADMIN_USERNAME,
                password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                role="admin",
                force_change_password=True,
            )
            db.add(admin)
            await db.flush()
            logger.info("Created default admin user: %s", settings.DEFAULT_ADMIN_USERNAME)

            presets = [
                ("餐饮", "expense", None, "#ef4444"),
                ("交通", "expense", None, "#3b82f6"),
                ("购物", "expense", None, "#f59e0b"),
                ("住房", "expense", None, "#8b5cf6"),
                ("娱乐", "expense", None, "#ec4899"),
                ("医疗", "expense", None, "#10b981"),
                ("教育", "expense", None, "#6366f1"),
                ("其他支出", "expense", None, "#6b7280"),
                ("工资", "income", None, "#22c55e"),
                ("投资收益", "income", None, "#14b8a6"),
                ("其他收入", "income", None, "#84cc16"),
            ]
            for name, typ, parent_id, color in presets:
                db.add(Category(user_id=admin.id, name=name, type=typ, parent_id=parent_id, color=color))

            db.add(UserSettings(user_id=admin.id))

            sub_cat_presets = [
                ("流媒体", "play", "#ef4444"),
                ("音乐", "music", "#8b5cf6"),
                ("云存储", "cloud", "#3b82f6"),
                ("生产力工具", "briefcase", "#f59e0b"),
                ("社交网络", "users", "#ec4899"),
                ("游戏", "gamepad-2", "#10b981"),
                ("新闻资讯", "newspaper", "#6366f1"),
                ("学习教育", "book-open", "#14b8a6"),
                ("健康健身", "heart", "#ef4444"),
                ("设计创意", "palette", "#f97316"),
                ("开发工具", "code-2", "#64748b"),
                ("其他", "more-horizontal", "#9ca3af"),
            ]
            for name, icon, color in sub_cat_presets:
                db.add(SubscriptionCategory(user_id=admin.id, name=name, icon=icon, color=color))

            await db.commit()
            logger.info("Initialized preset categories and subscription categories")

    yield
    logger.info("Shutting down MoneyFlow")


app = FastAPI(title="MoneyFlow", version="0.2.0", lifespan=lifespan)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# API routes
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(settings_router.router, prefix=settings.API_PREFIX)
app.include_router(accounts.router, prefix=settings.API_PREFIX)
app.include_router(categories.router, prefix=settings.API_PREFIX)
app.include_router(transactions.router, prefix=settings.API_PREFIX)
app.include_router(subscriptions.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)

# Serve frontend static files in production
static_dir = Path(os.getenv("STATIC_DIR", "../static"))
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file = static_dir / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(static_dir / "index.html"))
