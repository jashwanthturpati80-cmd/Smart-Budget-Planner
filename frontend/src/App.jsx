import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bot, CircleDollarSign, Plus, PiggyBank, Sparkles, Trash2, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const API = "http://127.0.0.1:8000";
const COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#f43f5e", "#38bdf8", "#a855f7"];
const CATEGORIES = ["Salary", "Freelance", "Food", "Housing", "Transport", "Utilities", "Health", "Education", "Entertainment", "Shopping", "Other"];
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const currentMonth = new Date().toISOString().slice(0, 7);

function App() {
  const [month, setMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, savings_rate: 0, category_totals: [], budget_status: [] });
  const [showTransaction, setShowTransaction] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState("");
  const [adviceSource, setAdviceSource] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const [txRes, dashRes] = await Promise.all([
        fetch(`${API}/transactions?month=${month}`), fetch(`${API}/dashboard?month=${month}`)
      ]);
      if (!txRes.ok || !dashRes.ok) throw new Error("Backend unavailable");
      setTransactions(await txRes.json());
      setSummary(await dashRes.json());
    } catch {
      setError("Cannot connect to the backend. Start FastAPI on port 8000.");
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  async function removeTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;
    await fetch(`${API}/transactions/${id}`, { method: "DELETE" });
    loadData();
  }

  async function getAiAdvice() {
    try {
      setAiLoading(true);
      const res = await fetch(`${API}/ai-advice?month=${month}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdvice(data.advice);
      setAdviceSource(data.source === "ollama" ? "Ollama AI • llama3.2:3b" : "Smart offline analysis");
    } catch {
      setAdvice("The adviser could not connect. Confirm that the FastAPI backend is running.");
      setAdviceSource("Connection error");
    } finally { setAiLoading(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><WalletCards /></span><div>SmartBudget<small>Plan. Track. Grow.</small></div></div>
      <nav><a className="active"><BarChart3 /> Dashboard</a><a href="#transactions"><CircleDollarSign /> Transactions</a><a href="#budgets"><PiggyBank /> Budgets</a></nav>
      <div className="sidebar-tip"><PiggyBank /><strong>Smart Tip</strong><p>Try saving at least 20% of your monthly income.</p></div>
    </aside>

    <main>
      <header><div><p className="eyebrow">PERSONAL FINANCE</p><h1>Budget Dashboard</h1><p>See where your money goes and make every rupee count.</p></div><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></header>
      {error && <div className="error">{error}</div>}

      <section className="stats">
        <Stat title="Total Income" value={summary.income} icon={<TrendingUp />} type="income" />
        <Stat title="Total Expenses" value={summary.expenses} icon={<TrendingDown />} type="expense" />
        <Stat title="Available Balance" value={summary.balance} icon={<WalletCards />} type="balance" />
        <Stat title="Savings Rate" value={`${summary.savings_rate}%`} icon={<PiggyBank />} type="saving" raw />
      </section>

      <section className="card ai-adviser">
        <div className="ai-orb"><Bot /></div>
        <div className="ai-content">
          <p className="eyebrow"><Sparkles size={13} /> AI FINANCIAL ADVISER</p>
          <h2>Personalized budget advice</h2>
          {advice ? <div className="advice-text">{advice}</div> : <p>Let AI analyze this month’s income, expenses, savings rate, and budget progress.</p>}
          {adviceSource && <small>{adviceSource}</small>}
        </div>
        <button onClick={getAiAdvice} disabled={aiLoading}>{aiLoading ? "Analyzing…" : advice ? "Analyze again" : "Get AI advice"}</button>
      </section>

      <section className="grid-two">
        <article className="card chart-card"><div className="card-heading"><div><h2>Expense Breakdown</h2><p>Spending by category</p></div></div>
          {summary.category_totals.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={summary.category_totals} dataKey="amount" nameKey="category" innerRadius={60} outerRadius={95} paddingAngle={3}>{summary.category_totals.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={money} /></PieChart></ResponsiveContainer><div className="legend">{summary.category_totals.map((item, i) => <span key={item.category}><i style={{background: COLORS[i % COLORS.length]}} />{item.category}: {money(item.amount)}</span>)}</div></div> : <Empty text="No expenses for this month" />}
        </article>

        <article className="card" id="budgets"><div className="card-heading"><div><h2>Budget Progress</h2><p>Monthly category limits</p></div><button className="secondary" onClick={() => setShowBudget(true)}><Plus size={17} /> Set budget</button></div>
          <div className="budget-list">{summary.budget_status.map(item => <div className="budget-row" key={item.category}><div><strong>{item.category}</strong><span>{money(item.spent)} of {money(item.limit)}</span></div><div className="progress"><i className={item.percentage > 100 ? "over" : ""} style={{width: `${Math.min(item.percentage, 100)}%`}} /></div><small className={item.remaining < 0 ? "danger" : ""}>{item.remaining >= 0 ? `${money(item.remaining)} left` : `${money(-item.remaining)} over budget`}</small></div>)}</div>
        </article>
      </section>

      <section className="card transactions" id="transactions"><div className="card-heading"><div><h2>Recent Transactions</h2><p>Your income and expenses for the selected month</p></div><button onClick={() => setShowTransaction(true)}><Plus size={18} /> Add transaction</button></div>
        <div className="table-wrap"><table><thead><tr><th>Description</th><th>Category</th><th>Date</th><th>Type</th><th>Amount</th><th></th></tr></thead><tbody>{transactions.map(tx => <tr key={tx.id}><td><strong>{tx.description}</strong></td><td>{tx.category}</td><td>{new Date(`${tx.date}T00:00:00`).toLocaleDateString("en-IN")}</td><td><span className={`pill ${tx.type}`}>{tx.type}</span></td><td className={tx.type}>{tx.type === "income" ? "+" : "-"}{money(tx.amount)}</td><td><button className="icon-btn" onClick={() => removeTransaction(tx.id)}><Trash2 size={17} /></button></td></tr>)}</tbody></table>{!loading && !transactions.length && <Empty text="No transactions for this month" />}</div>
      </section>
    </main>
    {showTransaction && <TransactionModal onClose={() => setShowTransaction(false)} onSaved={() => { setShowTransaction(false); loadData(); }} />}
    {showBudget && <BudgetModal onClose={() => setShowBudget(false)} onSaved={() => { setShowBudget(false); loadData(); }} />}
  </div>;
}

function Stat({ title, value, icon, type, raw }) { return <article className={`stat ${type}`}><span className="stat-icon">{icon}</span><div><p>{title}</p><h3>{raw ? value : money(value)}</h3></div></article>; }
function Empty({ text }) { return <div className="empty"><CircleDollarSign /><p>{text}</p></div>; }

function TransactionModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ description: "", amount: "", type: "expense", category: "Food", date: new Date().toISOString().slice(0, 10) });
  async function submit(e) { e.preventDefault(); const res = await fetch(`${API}/transactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) }); if (res.ok) onSaved(); }
  return <Modal title="Add transaction" onClose={onClose}><form onSubmit={submit}><label>Description<input required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Grocery shopping" /></label><div className="form-row"><label>Amount (₹)<input required type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></label><label>Type<select value={form.type} onChange={e => setForm({...form, type: e.target.value, category: e.target.value === "income" ? "Salary" : "Food"})}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><div className="form-row"><label>Category<select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label><label>Date<input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></label></div><button type="submit">Save transaction</button></form></Modal>;
}

function BudgetModal({ onClose, onSaved }) {
  const [category, setCategory] = useState("Food"); const [limit, setLimit] = useState("");
  async function submit(e) { e.preventDefault(); const res = await fetch(`${API}/budgets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, limit: Number(limit) }) }); if (res.ok) onSaved(); }
  return <Modal title="Set monthly budget" onClose={onClose}><form onSubmit={submit}><label>Expense category<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.filter(c => !["Salary", "Freelance"].includes(c)).map(c => <option key={c}>{c}</option>)}</select></label><label>Monthly limit (₹)<input required type="number" min="1" value={limit} onChange={e => setLimit(e.target.value)} /></label><button type="submit">Save budget</button></form></Modal>;
}

function Modal({ title, onClose, children }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="card-heading"><h2>{title}</h2><button className="close" onClick={onClose}>×</button></div>{children}</div></div>; }

export default App;
