# Smart Budget Planner

A complete college project built with React, FastAPI, SQLite, SQLAlchemy and Recharts. It tracks income and expenses, calculates savings, displays category charts, and compares spending with monthly budgets.

## Features

- Add and delete income/expense transactions
- Filter dashboard data by month
- Income, expense, balance and savings-rate cards
- Category-wise expense chart
- Create or update monthly category budgets
- Budget progress and overspending warnings
- Responsive dashboard for desktop and mobile
- SQLite database with starter demonstration data
- Interactive FastAPI documentation
- AI Financial Adviser powered by local Ollama
- Automatic offline smart advice when Ollama is unavailable

## Project structure

```text
smart-budget-planner/
├── backend/
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── schemas.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   └── package.json
└── README.md
```

## Run in VS Code on Windows

### 1. Start the backend

Open a VS Code terminal in the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Keep this terminal open. The API runs at `http://127.0.0.1:8000`. API documentation is at `http://127.0.0.1:8000/docs`.

If PowerShell blocks activation, skip it and use:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

### 2. Start the React frontend

Open a second VS Code terminal in the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Enable local AI advice (free, no API key)

The AI adviser works immediately with built-in analysis. To enable generative AI, install Ollama, open PowerShell, and run:

```powershell
ollama pull llama3.2:3b
```

Keep Ollama running, then click **Get AI advice** on the dashboard. No OpenAI key, billing, or cloud account is required.

## Database

The backend automatically creates `backend/budget.db` on first launch and inserts sample data. Delete this database file while the backend is stopped if you want to reset the demonstration.

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Backend status |
| GET/POST | `/transactions` | List or create transactions |
| DELETE | `/transactions/{id}` | Delete a transaction |
| GET/POST | `/budgets` | List or save category budgets |
| GET | `/dashboard?month=YYYY-MM` | Monthly totals and analysis |
| GET | `/ai-advice?month=YYYY-MM` | Ollama or offline personalized advice |
