from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User, UserSettings
from app.schemas.settings import BindFeishu, PasswordChange, SettingsOut, SettingsUpdate
from app.services.auth_service import hash_password, verify_password

router = APIRouter(prefix="/users/me", tags=["user-settings"])


@router.get("/settings")
async def get_settings(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    s = result.scalar_one_or_none()
    if not s:
        s = UserSettings(user_id=current_user.id)
        db.add(s)
        await db.commit()
        await db.refresh(s)
    return {"success": True, "data": SettingsOut.model_validate(s).model_dump()}


@router.put("/settings")
async def update_settings(req: SettingsUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    s = result.scalar_one_or_none()
    if not s:
        s = UserSettings(user_id=current_user.id)
        db.add(s)
    if req.default_needs_confirm is not None:
        s.default_needs_confirm = req.default_needs_confirm
    if req.confirm_rules is not None:
        s.confirm_rules = req.confirm_rules
    await db.commit()
    return {"success": True, "data": SettingsOut.model_validate(s).model_dump()}


@router.put("/password")
async def change_password(req: PasswordChange, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")
    current_user.password_hash = hash_password(req.new_password)
    current_user.force_change_password = False
    await db.commit()
    return {"success": True, "data": None}


@router.post("/bind-feishu")
async def bind_feishu(req: BindFeishu, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.user import UserOAuth
    existing = await db.execute(select(UserOAuth).where(UserOAuth.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="已绑定飞书账号")
    db.add(UserOAuth(user_id=current_user.id, provider="feishu", provider_uid=req.provider_uid))
    await db.commit()
    return {"success": True, "data": None}


@router.delete("/bind-feishu")
async def unbind_feishu(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.user import UserOAuth
    result = await db.execute(select(UserOAuth).where(UserOAuth.user_id == current_user.id))
    oauth = result.scalar_one_or_none()
    if not oauth:
        raise HTTPException(status_code=404, detail="未绑定飞书账号")
    await db.delete(oauth)
    await db.commit()
    return {"success": True, "data": None}
