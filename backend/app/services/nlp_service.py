from app.schemas.transaction import TransactionCreate


def parse_nlp(text: str) -> TransactionCreate:
    """MVP mock: 返回模拟解析结果"""
    return TransactionCreate(
        type="expense",
        amount=3500,  # 35.00元
        category_id=None,
        account_id=None,
        date=__import__("datetime").date.today(),
        note=text,
        needs_confirm=True,
    )
