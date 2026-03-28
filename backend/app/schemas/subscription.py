from datetime import date as date_type
from pydantic import BaseModel, ConfigDict


class SubscriptionCreate(BaseModel):
    name: str
    amount: int
    category_id: int | None = None
    account_id: int | None = None
    cycle: str  # weekly, monthly, yearly, custom
    cycle_days: int | None = None
    next_date: date_type
    note: str | None = None


class SubscriptionUpdate(BaseModel):
    name: str | None = None
    amount: int | None = None
    category_id: int | None = None
    account_id: int | None = None
    cycle: str | None = None
    cycle_days: int | None = None
    next_date: date_type | None = None
    is_active: bool | None = None
    note: str | None = None


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    amount: int
    category_id: int | None = None
    account_id: int | None = None
    cycle: str
    cycle_days: int | None = None
    next_date: date_type
    is_active: bool
    note: str | None = None
