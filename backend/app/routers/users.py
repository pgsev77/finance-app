from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserBrief, UserCreate
from app.services.auth_service import hash_password

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    total_q = await db.execute(select(func.count(User.id)))
    total = total_q.scalar()
    result = await db.execute(select(User).order_by(User.id).offset((page - 1) * page_size).limit(page_size))
    users = result.scalars().all()
    items = [UserBrief.model_validate(u).model_dump() for u in users]
    return {"success": True, "data": {"items": items, "total": total, "page": page, "page_size": page_size}}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(req: UserCreate, db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)):
    user = User(username=req.username, password_hash=hash_password(req.password), role=req.role, force_change_password=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"success": True, "data": UserBrief.model_validate(user).model_dump()}


@router.put("/{user_id}/toggle-active")
async def toggle_active(user_id: int, db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_active = not user.is_active
    await db.commit()
    return {"success": True, "data": UserBrief.model_validate(user).model_dump()}
