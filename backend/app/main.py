from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.models import User, UserOAuth, UserSettings, Account, Category, Transaction, Subscription
from app.auth.router import router as auth_router
from app.routers import users, accounts, categories, transactions, subscriptions, reports, settings as settings_router
from app.services.auth_service import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 同步创建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 初始化默认admin + 预设分类
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

            # 初始化预设分类
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
            await db.commit()

    yield


app = FastAPI(title="MoneyFlow", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(settings_router.router, prefix=settings.API_PREFIX)
app.include_router(accounts.router, prefix=settings.API_PREFIX)
app.include_router(categories.router, prefix=settings.API_PREFIX)
app.include_router(transactions.router, prefix=settings.API_PREFIX)
app.include_router(subscriptions.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
