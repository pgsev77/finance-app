from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountOut, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("")
async def list_accounts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id).order_by(Account.sort_order, Account.id)
    )
    items = [AccountOut.model_validate(a).model_dump() for a in result.scalars().all()]
    return {"success": True, "data": items}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(req: AccountCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acc = Account(user_id=current_user.id, **req.model_dump())
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return {"success": True, "data": AccountOut.model_validate(acc).model_dump()}


@router.put("/{account_id}")
async def update_account(account_id: int, req: AccountUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acc = await db.get(Account, account_id)
    if not acc or acc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="账户不存在")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(acc, k, v)
    await db.commit()
    return {"success": True, "data": AccountOut.model_validate(acc).model_dump()}


@router.delete("/{account_id}")
async def delete_account(account_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acc = await db.get(Account, account_id)
    if not acc or acc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="账户不存在")
    await db.delete(acc)
    await db.commit()
    return {"success": True, "data": None}
