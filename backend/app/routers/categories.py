from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryTree, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def list_categories(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category).where(Category.user_id == current_user.id).order_by(Category.sort_order, Category.id)
    )
    all_cats = result.scalars().all()

    def to_tree(cat: Category) -> dict:
        return CategoryTree(
            id=cat.id, name=cat.name, type=cat.type, parent_id=cat.parent_id,
            icon=cat.icon, color=cat.color, sort_order=cat.sort_order,
            is_active=cat.is_active, children=[],
        ).model_dump()

    nodes = {c.id: to_tree(c) for c in all_cats}
    tree = []
    for c in all_cats:
        if c.parent_id and c.parent_id in nodes:
            nodes[c.parent_id]["children"].append(nodes[c.id])
        else:
            tree.append(nodes[c.id])
    return {"success": True, "data": tree}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(req: CategoryCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cat = Category(user_id=current_user.id, **req.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return {"success": True, "data": to_tree_dict(cat)}


@router.put("/{category_id}")
async def update_category(category_id: int, req: CategoryUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cat = await db.get(Category, category_id)
    if not cat or cat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="分类不存在")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    await db.commit()
    return {"success": True, "data": to_tree_dict(cat)}


@router.delete("/{category_id}")
async def delete_category(category_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cat = await db.get(Category, category_id)
    if not cat or cat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="分类不存在")
    await db.delete(cat)
    await db.commit()
    return {"success": True, "data": None}


def to_tree_dict(cat: Category) -> dict:
    return CategoryTree(
        id=cat.id, name=cat.name, type=cat.type, parent_id=cat.parent_id,
        icon=cat.icon, color=cat.color, sort_order=cat.sort_order,
        is_active=cat.is_active, children=[],
    ).model_dump()
