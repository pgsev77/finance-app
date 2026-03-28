from pydantic import BaseModel


class MonthlyReport(BaseModel):
    year: int
    month: int
    total_income: int
    total_expense: int
    balance: int
    by_category: list[dict]


class TrendPoint(BaseModel):
    month: str  # "2024-01"
    income: int
    expense: int
    balance: int
