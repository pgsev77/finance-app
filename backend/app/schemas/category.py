from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    type: str  # expense, income
    parent_id: int | None = None
    icon: str | None = None
    color: str | None = None
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryTree(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    parent_id: int | None = None
    icon: str | None = None
    color: str | None = None
    sort_order: int = 0
    is_active: bool = True
    children: list["CategoryTree"] = []
