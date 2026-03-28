import calendar
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.models.subscription_category import SubscriptionCategory
from app.schemas.subscription import (
    SubscriptionCategoryCreate, SubscriptionCategoryOut,
    SubscriptionCreate, SubscriptionOut, SubscriptionUpdate, SubscriptionSummary,
)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# ─── 周期天数映射 ───
CYCLE_DAYS_MAP = {
    "weekly": 7,
    "monthly": 30,
    "quarterly": 90,
    "yearly": 365,
}


def calc_monthly_equivalent(amount: int, cycle_type: str, cycle_days: int | None = None) -> int:
    """计算月均费用（分）"""
    if cycle_type == "once":
        return 0
    days = cycle_days or CYCLE_DAYS_MAP.get(cycle_type, 30)
    if days <= 0:
        return amount
    return round(amount * 30 / days)


def calc_next_date(start: date, cycle_type: str, cycle_days: int | None = None) -> date:
    """计算下次扣费日期，处理月末边界"""
    if cycle_type == "once":
        return start

    days = cycle_days or CYCLE_DAYS_MAP.get(cycle_type, 30)

    if cycle_type == "monthly":
        # 加一个月，处理月末
        month = start.month % 12 + 1
        year = start.year + (1 if start.month == 12 else 0)
        max_day = calendar.monthrange(year, month)[1]
        day = min(start.day, max_day)
        return date(year, month, day)
    elif cycle_type == "quarterly":
        month = start.month + 3
        year = start.year + (month - 1) // 12
        month = (month - 1) % 12 + 1
        max_day = calendar.monthrange(year, month)[1]
        day = min(start.day, max_day)
        return date(year, month, day)
    elif cycle_type == "yearly":
        try:
            return start.replace(year=start.year + 1)
        except ValueError:
            return start.replace(year=start.year + 1, day=28)
    else:
        # weekly / custom
        return start + timedelta(days=days)


# ─── 订阅 CRUD ───

@router.get("")
async def list_subscriptions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id).order_by(Subscription.next_date)
    )
    items = [SubscriptionOut.model_validate(s).model_dump() for s in result.scalars().all()]
    return {"success": True, "data": items}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_subscription(req: SubscriptionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = req.model_dump(exclude={"cycle", "is_active"}, exclude_none=True)

    # 向下兼容: 如果只传了旧字段 cycle，映射到 cycle_type
    if req.cycle and not req.cycle_type:
        data["cycle_type"] = req.cycle
    if req.is_active is False:
        data["status"] = "paused"

    # 试用状态处理
    if data.get("trial_days") and data.get("trial_start_date"):
        data["status"] = "trial"

    sub = Subscription(user_id=current_user.id, **data)
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return {"success": True, "data": SubscriptionOut.model_validate(sub).model_dump()}


@router.put("/{sub_id}")
async def update_subscription(sub_id: int, req: SubscriptionUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    sub = await db.get(Subscription, sub_id)
    if not sub or sub.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="订阅不存在")

    data = req.model_dump(exclude_unset=True)
    # 向下兼容
    if "is_active" in data and "status" not in data:
        data.pop("is_active")
        if not req.is_active:
            data["status"] = "paused"
        elif req.is_active:
            data["status"] = "active"

    for k, v in data.items():
        setattr(sub, k, v)
    await db.commit()
    return {"success": True, "data": SubscriptionOut.model_validate(sub).model_dump()}


@router.delete("/{sub_id}")
async def delete_subscription(sub_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    sub = await db.get(Subscription, sub_id)
    if not sub or sub.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="订阅不存在")
    await db.delete(sub)
    await db.commit()
    return {"success": True, "data": None}


@router.get("/upcoming")
async def upcoming_subscriptions(days: int = Query(7, ge=1, le=30), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    end = today + timedelta(days=days)
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status.in_(["active", "trial"]),
            Subscription.next_date >= today,
            Subscription.next_date <= end,
        ).order_by(Subscription.next_date)
    )
    items = [SubscriptionOut.model_validate(s).model_dump() for s in result.scalars().all()]
    return {"success": True, "data": items}


@router.get("/summary")
async def subscription_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """订阅汇总看板"""
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status.in_(["active", "trial"]),
        )
    )
    subs = result.scalars().all()

    monthly_total = sum(calc_monthly_equivalent(s.amount, s.cycle_type, s.cycle_days) for s in subs)
    yearly_total = monthly_total * 12
    total_count = len(subs)

    # 按订阅分类统计
    cat_ids = list(set(s.subscription_category_id for s in subs if s.subscription_category_id))
    cat_map = {}
    if cat_ids:
        cat_result = await db.execute(
            select(SubscriptionCategory).where(SubscriptionCategory.id.in_(cat_ids))
        )
        for c in cat_result.scalars().all():
            cat_map[c.id] = c

    cat_stats: dict[int, dict] = {}
    for s in subs:
        cid = s.subscription_category_id
        monthly = calc_monthly_equivalent(s.amount, s.cycle_type, s.cycle_days)
        if cid not in cat_stats:
            cat_name = cat_map[cid].name if cid in cat_map else "未分类"
            icon = cat_map[cid].icon if cid in cat_map else None
            color = cat_map[cid].color if cid in cat_map else None
            cat_stats[cid] = {"category_id": cid, "category_name": cat_name, "icon": icon, "color": color, "monthly_amount": 0, "count": 0}
        cat_stats[cid]["monthly_amount"] += monthly
        cat_stats[cid]["count"] += 1

    by_category = sorted(cat_stats.values(), key=lambda x: x["monthly_amount"], reverse=True)

    # 即将到期（7天内）
    today = date.today()
    upcoming = []
    for s in sorted(subs, key=lambda x: x.next_date):
        days_until = (s.next_date - today).days
        if 0 <= days_until <= 7:
            upcoming.append({
                "id": s.id,
                "name": s.name,
                "amount": s.amount,
                "next_date": s.next_date.isoformat(),
                "days_until": days_until,
            })

    summary = SubscriptionSummary(
        monthly_total=monthly_total,
        yearly_total=yearly_total,
        total_count=total_count,
        by_category=by_category,
        upcoming=upcoming,
    )
    return {"success": True, "data": summary.model_dump()}


# ─── 订阅分类 CRUD ───

@router.get("/categories")
async def list_subscription_categories(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SubscriptionCategory).where(
            SubscriptionCategory.user_id == current_user.id,
            SubscriptionCategory.is_active == True,
        ).order_by(SubscriptionCategory.id)
    )
    items = [SubscriptionCategoryOut.model_validate(c).model_dump() for c in result.scalars().all()]
    return {"success": True, "data": items}


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_subscription_category(req: SubscriptionCategoryCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cat = SubscriptionCategory(user_id=current_user.id, **req.model_dump())
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return {"success": True, "data": SubscriptionCategoryOut.model_validate(cat).model_dump()}
