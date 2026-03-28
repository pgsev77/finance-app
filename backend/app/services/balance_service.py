import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account

logger = logging.getLogger("moneyflow.balance")


async def _get_account_for_update(db: AsyncSession, account_id: int) -> Account | None:
    """Fetch account with row-level lock for atomic updates."""
    result = await db.execute(
        select(Account).where(Account.id == account_id).with_for_update()
    )
    return result.scalar_one_or_none()


async def apply_balance(db: AsyncSession, txn_type: str, amount: int, account_id: int | None, to_account_id: int | None = None):
    """Apply balance changes for a transaction create."""
    if not account_id:
        return
    acc = await _get_account_for_update(db, account_id)
    if not acc:
        return
    if txn_type == "expense":
        acc.balance -= amount
    elif txn_type == "income":
        acc.balance += amount
    elif txn_type == "transfer" and to_account_id:
        acc.balance -= amount
        to_acc = await _get_account_for_update(db, to_account_id)
        if to_acc:
            to_acc.balance += amount
    logger.info("Balance updated: account=%d, type=%s, amount=%d", account_id, txn_type, amount)


async def reverse_balance(db: AsyncSession, txn_type: str, amount: int, account_id: int | None):
    """Reverse balance changes for a transaction delete/update."""
    if not account_id:
        return
    acc = await _get_account_for_update(db, account_id)
    if not acc:
        return
    if txn_type == "expense":
        acc.balance += amount
    elif txn_type == "income":
        acc.balance -= amount
    logger.info("Balance reversed: account=%d, type=%s, amount=%d", account_id, txn_type, amount)
