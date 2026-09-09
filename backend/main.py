from collections import defaultdict
from datetime import date
import json
from urllib import error, request

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Budget Planner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://effortless-cajeta-1430c0.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def add_sample_data():
    db = SessionLocal()
    try:
        if db.query(models.Transaction).count() == 0:
            today = date.today()
            db.add_all([
                models.Transaction(description="Monthly salary", amount=45000, type="income", category="Salary", date=today),
                models.Transaction(description="House rent", amount=12000, type="expense", category="Housing", date=today),
                models.Transaction(description="Groceries", amount=3500, type="expense", category="Food", date=today),
                models.Transaction(description="Internet bill", amount=999, type="expense", category="Utilities", date=today),
            ])
        if db.query(models.Budget).count() == 0:
            db.add_all([
                models.Budget(category="Food", limit=6000),
                models.Budget(category="Housing", limit=15000),
                models.Budget(category="Transport", limit=4000),
                models.Budget(category="Utilities", limit=3000),
            ])
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Smart Budget Planner API is running"}


@app.get("/health")
def health():
    return {"status": "online"}


@app.get("/transactions", response_model=list[schemas.TransactionOut])
def get_transactions(month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db)):
    query = db.query(models.Transaction)
    rows = query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).all()
    if month:
        rows = [row for row in rows if row.date.strftime("%Y-%m") == month]
    return rows


@app.post("/transactions", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db)):
    row = models.Transaction(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Transaction, transaction_id)
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(row)
    db.commit()


@app.get("/budgets", response_model=list[schemas.BudgetOut])
def get_budgets(db: Session = Depends(get_db)):
    return db.query(models.Budget).order_by(models.Budget.category).all()


@app.post("/budgets", response_model=schemas.BudgetOut)
def save_budget(payload: schemas.BudgetCreate, db: Session = Depends(get_db)):
    row = db.query(models.Budget).filter(models.Budget.category == payload.category).first()
    if row:
        row.limit = payload.limit
    else:
        row = models.Budget(**payload.model_dump())
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/dashboard")
def dashboard(month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db)):
    selected_month = month or date.today().strftime("%Y-%m")
    rows = [row for row in db.query(models.Transaction).all() if row.date.strftime("%Y-%m") == selected_month]
    income = sum(row.amount for row in rows if row.type == "income")
    expenses = sum(row.amount for row in rows if row.type == "expense")
    category_totals = defaultdict(float)
    for row in rows:
        if row.type == "expense":
            category_totals[row.category] += row.amount
    budgets = db.query(models.Budget).all()
    budget_status = [
        {
            "category": item.category,
            "limit": item.limit,
            "spent": category_totals.get(item.category, 0),
            "remaining": item.limit - category_totals.get(item.category, 0),
            "percentage": round((category_totals.get(item.category, 0) / item.limit) * 100, 1),
        }
        for item in budgets
    ]
    return {
        "month": selected_month,
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "savings_rate": round(((income - expenses) / income) * 100, 1) if income else 0,
        "category_totals": [{"category": key, "amount": value} for key, value in category_totals.items()],
        "budget_status": budget_status,
    }


def built_in_advice(income: float, expenses: float, category_totals: dict, budget_status: list) -> list[str]:
    """Reliable advice used both as context for Ollama and as an offline fallback."""
    advice = []
    balance = income - expenses
    savings_rate = (balance / income * 100) if income else 0

    if income == 0:
        advice.append("Add your monthly income so I can calculate a useful savings target.")
    elif savings_rate >= 20:
        advice.append(f"Great work—your savings rate is {savings_rate:.1f}%, above the recommended 20% target.")
    elif balance > 0:
        target = income * 0.20
        advice.append(f"Try to save ₹{target:,.0f} per month. You need ₹{max(target - balance, 0):,.0f} more to reach a 20% savings rate.")
    else:
        advice.append(f"Your expenses exceed income by ₹{abs(balance):,.0f}. Pause non-essential purchases until the balance is positive.")

    if category_totals:
        biggest = max(category_totals, key=category_totals.get)
        advice.append(f"Your largest expense is {biggest} at ₹{category_totals[biggest]:,.0f}. Review this category first for possible savings.")

    over = [item for item in budget_status if item["remaining"] < 0]
    if over:
        names = ", ".join(item["category"] for item in over)
        advice.append(f"You are over budget in {names}. Reduce or postpone spending in these categories.")
    else:
        close = [item for item in budget_status if item["percentage"] >= 80]
        if close:
            advice.append(f"Watch {', '.join(item['category'] for item in close)}—you have already used at least 80% of the budget.")

    advice.append("Build an emergency fund equal to 3–6 months of essential expenses before taking high-risk investments.")
    return advice


@app.get("/ai-advice")
def ai_advice(month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db)):
    selected_month = month or date.today().strftime("%Y-%m")
    rows = [row for row in db.query(models.Transaction).all() if row.date.strftime("%Y-%m") == selected_month]
    income = sum(row.amount for row in rows if row.type == "income")
    expenses = sum(row.amount for row in rows if row.type == "expense")
    category_totals = defaultdict(float)
    for row in rows:
        if row.type == "expense":
            category_totals[row.category] += row.amount

    budget_status = []
    for item in db.query(models.Budget).all():
        spent = category_totals.get(item.category, 0)
        budget_status.append({
            "category": item.category, "limit": item.limit, "spent": spent,
            "remaining": item.limit - spent,
            "percentage": round(spent / item.limit * 100, 1),
        })

    fallback = built_in_advice(income, expenses, dict(category_totals), budget_status)
    financial_data = {
        "month": selected_month, "income": income, "expenses": expenses,
        "balance": income - expenses, "expenses_by_category": dict(category_totals),
        "budgets": budget_status,
    }
    prompt = f"""You are a careful personal budget coach for an Indian college project.
Analyze this monthly financial data: {json.dumps(financial_data)}
Give exactly 4 short, practical, personalized suggestions. Use Indian rupees (₹).
Do not recommend specific stocks, loans, or risky investments. Return plain text with one suggestion per line."""

    try:
        payload = json.dumps({"model": "llama3.2:3b", "prompt": prompt, "stream": False}).encode()
        req = request.Request("http://127.0.0.1:11434/api/generate", data=payload, headers={"Content-Type": "application/json"})
        with request.urlopen(req, timeout=45) as response:
            generated = json.loads(response.read().decode()).get("response", "").strip()
        if generated:
            return {"source": "ollama", "model": "llama3.2:3b", "advice": generated, "data": financial_data}
    except (error.URLError, TimeoutError, json.JSONDecodeError):
        pass

    return {"source": "smart-fallback", "model": None, "advice": "\n".join(f"• {tip}" for tip in fallback[:4]), "data": financial_data}
