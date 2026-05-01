import React, { useState, useEffect } from "react";
import { Banknote, Trash2 } from "lucide-react";
import api from "../api.js";
import { toast } from "./ui/Toast.jsx";
import { EmptyState, CurrencySelect, money, Spinner } from "./ui/index.jsx";

function BudgetForm({ categories, month, preferred, reload }) {
  const expCats = categories.filter((c) => c.kind === "expense");
  const [form, setForm] = useState({
    categoryId: expCats[0]?.id || "", amount: "", currency: preferred, month
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, month, categoryId: f.categoryId || expCats[0]?.id || "" }));
  }, [month, categories]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/budgets", { ...form, amount: Number(form.amount) });
      setForm((f) => ({ ...f, amount: "" }));
      await reload();
      toast.success("Budget saved");
    } catch (err) { toast.error(err.response?.data?.error || "Could not save budget"); }
    finally { setBusy(false); }
  }

  if (!expCats.length) {
    return <EmptyState title="No expense categories" body="Create expense categories first, then set budgets." />;
  }

  return (
    <form onSubmit={submit} className="form-grid compact-form">
      <div className="form-field">
        <label>Expense Category</label>
        <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
          {expCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label>Monthly Limit</label>
          <input type="number" step="0.01" min="0.01" value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
        </div>
        <div className="form-field">
          <label>Currency</label>
          <CurrencySelect value={form.currency} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} />
        </div>
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? <Spinner /> : <Banknote size={16} />} Save Budget
      </button>
    </form>
  );
}

function BudgetList({ budgets, reload }) {
  async function remove(id) {
    try {
      await api.delete(`/budgets/${id}`);
      await reload();
      toast.success("Budget deleted");
    } catch (err) { toast.error(err.response?.data?.error || "Delete failed"); }
  }

  if (!budgets.length) {
    return <EmptyState title="No budgets set" body="Set monthly limits above to start tracking." />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {budgets.map((b) => {
        const spent = Number(b.spent), amount = Number(b.amount);
        const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
        const over = spent > amount;
        const remaining = amount - spent;
        return (
          <div key={b.id} className={`budget-card ${over ? "over" : ""}`}>
            <div className="budget-line">
              <span className="budget-label">{b.category_name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="budget-amount">{money(spent, b.currency)} / {money(amount, b.currency)}</span>
                <button className="btn-icon btn-danger" style={{ width: 28, height: 28, minHeight: 28 }} onClick={() => remove(b.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="progress-bar">
              <div className={`progress-bar-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`budget-remaining ${over ? "over" : ""}`}>
              {over
                ? `${money(Math.abs(remaining), b.currency)} over budget`
                : `${money(remaining, b.currency)} remaining · ${pct.toFixed(0)}% used`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Budgets({ budgets, categories, month, preferred, reload }) {
  return (
    <div className="two-col" style={{ alignItems: "start" }}>
      <div className="panel">
        <div className="panel-head"><h3>Set Monthly Budget</h3></div>
        <BudgetForm categories={categories} month={month} preferred={preferred} reload={reload} />
      </div>
      <div className="panel">
        <div className="panel-head">
          <h3>Budget Progress</h3>
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{month}</span>
        </div>
        <BudgetList budgets={budgets} reload={reload} />
      </div>
    </div>
  );
}
