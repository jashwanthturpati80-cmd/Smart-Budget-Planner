from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    description: str = Field(min_length=1, max_length=120)
    amount: float = Field(gt=0)
    type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=50)
    date: date


class TransactionCreate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    limit: float = Field(gt=0)


class BudgetOut(BudgetCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

