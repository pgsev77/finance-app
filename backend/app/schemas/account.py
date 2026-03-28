from pydantic import BaseModel, ConfigDict


class AccountCreate(BaseModel):
    name: str
    type: str
    icon: str | None = None
    sort_order: int = 0


class AccountUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    icon: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    balance: int
    icon: str | None = None
    sort_order: int
    is_active: bool
