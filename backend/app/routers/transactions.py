import datetime
import logging

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
from app.services.balance_service import apply_balance, reverse_balance

logger = logging.getLogger("moneyflow.transactions")

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: str | None = Query(None),
    category_id: int | None = Query(None),
    account_id: int | None = Query(None),
    start_date: datetime.date | None = Query(None),
    end_date: datetime.date | None = Query(None),
    search: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_filters = [Transaction.user_id == current_user.id, Transaction.is_deleted == False]
    if type:
        base_filters.append(Transaction.type == type)
    if category_id:
        base_filters.append(Transaction.category_id == category_id)
    if account_id:
        base_filters.append(Transaction.account_id == account_id)
    if start_date:
        base_filters.append(Transaction.date >= start_date)
    if end_date:
        base_filters.append(Transaction.date <= end_date)
    if search:
        base_filters.append(Transaction.note.ilike(f"%{search}%"))

    q = select(Transaction).where(*base_filters).order_by(Transaction.date.desc(), Transaction.id.desc())
    count_q = select(func.count(Transaction.id)).where(*base_filters)
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

    await apply_balance(db, req.type, req.amount, req.account_id, req.to_account_id)

    await db.commit()
    await db.refresh(txn)
    logger.info("Transaction created: id=%d, user=%d, type=%s, amount=%d", txn.id, current_user.id, req.type, req.amount)
    return {"success": True, "data": TransactionOut.model_validate(txn).model_dump()}


@router.put("/{transaction_id}")
async def update_transaction(transaction_id: int, req: TransactionUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.user_id != current_user.id or txn.is_deleted:
        raise HTTPException(status_code=404, detail="交易不存在")

    # Reverse old balance
    await reverse_balance(db, txn.type, txn.amount, txn.account_id)

    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(txn, k, v)

    # Apply new balance
    await apply_balance(db, txn.type, txn.amount, txn.account_id)

    await db.commit()
    logger.info("Transaction updated: id=%d, user=%d", transaction_id, current_user.id)
    return {"success": True, "data": TransactionOut.model_validate(txn).model_dump()}


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txn = await db.get(Transaction, transaction_id)
    if not txn or txn.user_id != current_user.id or txn.is_deleted:
        raise HTTPException(status_code=404, detail="交易不存在")

    txn.is_deleted = True
    await reverse_balance(db, txn.type, txn.amount, txn.account_id)

    await db.commit()
    logger.info("Transaction deleted: id=%d, user=%d", transaction_id, current_user.id)
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
