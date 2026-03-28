from datetime import date as date_type, datetime
from pydantic import BaseModel, ConfigDict


class TransactionCreate(BaseModel):
    type: str
    amount: int
    category_id: int | None = None
    account_id: int | None = None
    to_account_id: int | None = None
    date: date_type
    note: str | None = None
    needs_confirm: bool = False


class TransactionUpdate(BaseModel):
    type: str | None = None
    amount: int | None = None
    category_id: int | None = None
    account_id: int | None = None
    to_account_id: int | None = None
    date: date_type | None = None
    note: str | None = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    amount: int
    category_id: int | None = None
    account_id: int | None = None
    to_account_id: int | None = None
    date: date_type
    note: str | None = None
    needs_confirm: bool = True
    confirmed_at: datetime | None = None
    is_deleted: bool = False
