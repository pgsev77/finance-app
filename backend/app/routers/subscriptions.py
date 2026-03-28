from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.schemas.subscription import SubscriptionCreate, SubscriptionOut, SubscriptionUpdate

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("")
async def list_subscriptions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id).order_by(Subscription.next_date)
    )
    items = [SubscriptionOut.model_validate(s).model_dump() for s in result.scalars().all()]
    return {"success": True, "data": items}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_subscription(req: SubscriptionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    sub = Subscription(user_id=current_user.id, **req.model_dump())
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return {"success": True, "data": SubscriptionOut.model_validate(sub).model_dump()}


@router.put("/{sub_id}")
async def update_subscription(sub_id: int, req: SubscriptionUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    sub = await db.get(Subscription, sub_id)
    if not sub or sub.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="订阅不存在")
    for k, v in req.model_dump(exclude_unset=True).items():
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
            Subscription.is_active == True,
            Subscription.next_date >= today,
            Subscription.next_date <= end,
        ).order_by(Subscription.next_date)
    )
    items = [SubscriptionOut.model_validate(s).model_dump() for s in result.scalars().all()]
    return {"success": True, "data": items}
