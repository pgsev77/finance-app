import datetime
from datetime import date

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"), nullable=True)
    subscription_category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subscription_categories.id"), nullable=True)
    account_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("accounts.id"), nullable=True)

    # 周期相关
    cycle_type: Mapped[str] = mapped_column(String(20), nullable=False, default="monthly")  # weekly/monthly/quarterly/yearly/custom/once
    cycle_days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 自定义周期天数
    next_date: Mapped[date] = mapped_column(Date, nullable=False)

    # 试用相关
    trial_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trial_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # 状态: trial/active/paused/cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    # 向下兼容旧字段
    cycle: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # 新增字段
    auto_record: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="CNY")

    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )
