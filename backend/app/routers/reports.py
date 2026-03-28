from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/monthly")
async def monthly_report(
    year: int = Query(...), month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start = f"{year}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1}-01-01"
    else:
        end = f"{year}-{month + 1:02d}-01"

    txns = (
        await db.execute(
            select(Transaction).where(
                Transaction.user_id == current_user.id,
                Transaction.is_deleted == False,
                Transaction.date >= cast(start, Date),
                Transaction.date < cast(end, Date),
            )
        )
    ).scalars().all()

    total_income = sum(t.amount for t in txns if t.type == "income")
    total_expense = sum(t.amount for t in txns if t.type == "expense")

    # 按分类汇总
    cat_map = {c.id: c for c in (await db.execute(select(Category))).scalars().all()}
    by_cat: dict[str, int] = {}
    for t in txns:
        if t.type != "expense" or not t.category_id:
            continue
        cat_name = cat_map[t.category_id].name if t.category_id in cat_map else "未分类"
        by_cat[cat_name] = by_cat.get(cat_name, 0) + t.amount

    by_category = [{"category": k, "amount": v} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])]

    return {
        "success": True,
        "data": {
            "year": year, "month": month,
            "total_income": total_income, "total_expense": total_expense,
            "balance": total_income - total_expense,
            "by_category": by_category,
        },
    }


@router.get("/trend")
async def trend_report(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    today = date.today()

    txns = (
        await db.execute(
            select(Transaction).where(
                Transaction.user_id == current_user.id,
                Transaction.is_deleted == False,
                Transaction.date >= today - timedelta(days=months * 31),
            )
        )
    ).scalars().all()

    monthly: dict[str, dict] = {}
    for t in txns:
        m = t.date.strftime("%Y-%m")
        if m not in monthly:
            monthly[m] = {"income": 0, "expense": 0}
        if t.type == "income":
            monthly[m]["income"] += t.amount
        elif t.type == "expense":
            monthly[m]["expense"] += t.amount

    points = [
        {"month": k, "income": v["income"], "expense": v["expense"], "balance": v["income"] - v["expense"]}
        for k, v in sorted(monthly.items())
    ]
    return {"success": True, "data": points}
