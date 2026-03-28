from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.jwt import create_access_token
from app.database import get_db
from app.models.user import User, UserOAuth, UserSettings
from app.schemas.auth import AutoRegisterRequest, LoginRequest, LoginResponse, UserOut
from app.services.auth_service import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="用户已禁用")

    token = create_access_token(user.id, user.role)
    response.set_cookie("token", token, httponly=True, max_age=7 * 86400, path="/", samesite="lax")

    return {"success": True, "data": LoginResponse(token=token, user=UserOut.model_validate(user)).model_dump()}


@router.post("/auto-register")
async def auto_register(req: AutoRegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # 查找已绑定的 OAuth
    result = await db.execute(
        select(UserOAuth).where(UserOAuth.provider == req.provider, UserOAuth.provider_uid == req.provider_uid)
    )
    oauth = result.scalar_one_or_none()

    if oauth:
        user = await db.get(User, oauth.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="用户已禁用")
    else:
        username = f"{req.provider}_{req.provider_uid}"
        user = User(
            username=username,
            password_hash=hash_password("change_me"),
            role="user",
            force_change_password=True,
        )
        db.add(user)
        await db.flush()

        db.add(UserOAuth(user_id=user.id, provider=req.provider, provider_uid=req.provider_uid))
        db.add(UserSettings(user_id=user.id))
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user.id, user.role)
    response.set_cookie("token", token, httponly=True, max_age=7 * 86400, path="/", samesite="lax")

    return {"success": True, "data": LoginResponse(token=token, user=UserOut.model_validate(user)).model_dump()}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("token", path="/")
    return {"success": True, "data": None}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {"success": True, "data": UserOut.model_validate(current_user).model_dump()}
