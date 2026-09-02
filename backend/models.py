from datetime import date

from sqlalchemy import Date, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    description: Mapped[str] = mapped_column(String(120))
    amount: Mapped[float] = mapped_column(Float)
    type: Mapped[str] = mapped_column(String(10))
    category: Mapped[str] = mapped_column(String(50))
    date: Mapped[date] = mapped_column(Date)


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(50), unique=True)
    limit: Mapped[float] = mapped_column(Float)

