import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.account import Account
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate
from app.services.nlp_service import parse_nlp

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Transaction).where(Transaction.user_id == current_user.id, Transaction.is_deleted == False)
    if type:
        q = q.where(Transaction.type == type)
    q = q.order_by(Transaction.date.desc(), Transaction.id.desc())

    count_q = select(func.count(Transaction.id)).where(
        Transaction.user_id == current_user.id, Transaction.is_deleted == False
    )
    if type:
        count_q = count_q.where(Transaction.type == type)
    total = (await db.execute(count_q)).scalar()

    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = [TransactionOut.model_validate(t).model_dump() for t in result.scalars().all()]
    return {"success": True, "data": {"items": items, "total": total, "page": page, "page_size": page_size}}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_transaction(req: TransactionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = Transaction(user_id=current_user.id, **req.model_dump())
    db.add(txn)
    await db.flush()

    # 更新账户余额
    if req.account_id:
        acc = await db.get(Account, req.account_id)
        if acc:
            if req.type == "expense":
                acc.balance -= req.amount
            elif req.type == "income":
                acc.balance += req.amount
            elif req.type == "transfer" and req.to_account_id:
                acc.balance -= req.amount
                to_acc = await db.get(Account, req.to_account_id)
                if to_acc:
                    to_acc.balance += req.amount

    await db.commit()
    await db.refresh(txn)
    return {"success": True, "data": TransactionOut.model_validate(txn).model_dump()}


@router.put("/{transaction_id}")
async def update_transaction(transaction_id: int, req: TransactionUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.user_id != current_user.id or txn.is_deleted:
        raise HTTPException(status_code=404, detail="交易不存在")

    # 反向调整旧余额
    if txn.account_id:
        acc = await db.get(Account, txn.account_id)
        if acc:
            if txn.type == "expense":
                acc.balance += txn.amount
            elif txn.type == "income":
                acc.balance -= txn.amount

    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(txn, k, v)

    # 正向调整新余额
    if txn.account_id:
        acc = await db.get(Account, txn.account_id)
        if acc:
            if txn.type == "expense":
                acc.balance -= txn.amount
            elif txn.type == "income":
                acc.balance += txn.amount

    await db.commit()
    return {"success": True, "data": TransactionOut.model_validate(txn).model_dump()}


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.user_id != current_user.id or txn.is_deleted:
        raise HTTPException(status_code=404, detail="交易不存在")

    txn.is_deleted = True
    if txn.account_id:
        acc = await db.get(Account, txn.account_id)
        if acc:
            if txn.type == "expense":
                acc.balance += txn.amount
            elif txn.type == "income":
                acc.balance -= txn.amount

    await db.commit()
    return {"success": True, "data": None}


@router.post("/parse")
async def parse_text(text: str = Query(...), _user: User = Depends(get_current_user)):
    parsed = parse_nlp(text)
    return {"success": True, "data": parsed.model_dump()}


@router.post("/parse-confirm")
async def parse_confirm(req: TransactionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    req.needs_confirm = True
    return await create_transaction(req, current_user, db)


@router.get("/pending")
async def list_pending(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == current_user.id,
            Transaction.needs_confirm == True,
            Transaction.confirmed_at == None,
            Transaction.is_deleted == False,
        ).order_by(Transaction.created_at.desc())
    )
    items = [TransactionOut.model_validate(t).model_dump() for t in result.scalars().all()]
    return {"success": True, "data": items}


@router.post("/{transaction_id}/confirm")
async def confirm_transaction(transaction_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="交易不存在")
    txn.confirmed_at = datetime.datetime.now(datetime.timezone.utc)
    txn.needs_confirm = False
    await db.commit()
    return {"success": True, "data": TransactionOut.model_validate(txn).model_dump()}


@router.post("/{transaction_id}/reject")
async def reject_transaction(transaction_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="交易不存在")
    txn.is_deleted = True
    await db.commit()
    return {"success": True, "data": None}
