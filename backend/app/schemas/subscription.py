from datetime import date as date_type
from pydantic import BaseModel, ConfigDict


class SubscriptionCategoryCreate(BaseModel):
    name: str
    icon: str | None = None
    color: str | None = None


class SubscriptionCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    icon: str | None = None
    color: str | None = None
    is_active: bool


class SubscriptionCreate(BaseModel):
    name: str
    amount: int
    category_id: int | None = None
    subscription_category_id: int | None = None
    account_id: int | None = None
    cycle_type: str = "monthly"  # weekly/monthly/quarterly/yearly/custom/once
    cycle_days: int | None = None
    next_date: date_type
    trial_days: int | None = None
    trial_start_date: date_type | None = None
    status: str = "active"  # trial/active/paused/cancelled
    auto_record: bool = False
    currency: str = "CNY"
    note: str | None = None

    # 向下兼容
    cycle: str | None = None
    is_active: bool | None = None


class SubscriptionUpdate(BaseModel):
    name: str | None = None
    amount: int | None = None
    category_id: int | None = None
    subscription_category_id: int | None = None
    account_id: int | None = None
    cycle_type: str | None = None
    cycle_days: int | None = None
    next_date: date_type | None = None
    trial_days: int | None = None
    trial_start_date: date_type | None = None
    status: str | None = None
    auto_record: bool | None = None
    currency: str | None = None
    is_active: bool | None = None
    note: str | None = None


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    amount: int
    category_id: int | None = None
    subscription_category_id: int | None = None
    account_id: int | None = None
    cycle_type: str
    cycle_days: int | None = None
    next_date: date_type
    trial_days: int | None = None
    trial_start_date: date_type | None = None
    status: str
    auto_record: bool
    currency: str
    is_active: bool
    note: str | None = None


class SubscriptionSummary(BaseModel):
    monthly_total: int  # 分为单位
    yearly_total: int
    total_count: int
    by_category: list[dict]  # [{category_id, category_name, icon, color, monthly_amount, count}]
    upcoming: list[dict]  # [{id, name, amount, next_date, days_until}]
