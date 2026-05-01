import React from "react";
import { TrendingUp, TrendingDown, BarChart2, PiggyBank, ArrowRight } from "lucide-react";
import { EmptyState, money } from "./ui/index.jsx";

function MetricCard({ label, value, variant, icon: Icon }) {
  return (
    <div className={`metric-card ${variant}`}>
      <div className="metric-icon"><Icon size={18} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function CategoryBars({ categories }) {
  if (!categories.length) {
    return <EmptyState title="No expense data" body="Add expense transactions to populate this chart." />;
  }
  const max = Math.max(...categories.map((c) => Number(c.amount)), 1);
  return (
    <div className="bar-chart">
      {categories.slice(0, 8).map((c) => (
        <div className="bar-row" key={`${c.currency}-${c.category_name}`}>
          <span style={{ color: "var(--ink-2)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.category_name}
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(Number(c.amount) / max) * 100}%` }} />
          </div>
          <span className="mono" style={{ textAlign: "right", fontSize: 13 }}>{money(c.amount, c.currency)}</span>
        </div>
      ))}
    </div>
  );
}

function RecentTable({ transactions }) {
  if (!transactions.length) {
    return <EmptyState title="No recent activity" body="Transactions will appear here." />;
  }
  return (
    <div className="table-wrap">
      <div className="table-head tx-grid" style={{ gridTemplateColumns: "1fr 90px 90px 110px" }}>
        <span>Description</span><span>Type</span><span>Date</span><span style={{textAlign:"right"}}>Amount</span>
      </div>
      {transactions.map((t) => (
        <div className="table-row tx-grid" key={t.id} style={{ gridTemplateColumns: "1fr 90px 90px 110px" }}>
          <div className="cell-main">
            <strong>{t.description || t.category_name || "Untitled"}</strong>
            <span>{t.category_name || "Uncategorized"}</span>
          </div>
          <span className={`badge badge-${t.kind}`}>{t.kind}</span>
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{t.transaction_date?.slice(0, 10)}</span>
          <span className="mono" style={{ textAlign: "right", color: t.kind === "income" ? "var(--green)" : t.kind === "expense" ? "var(--red)" : "var(--ink)" }}>
            {money(t.amount, t.currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BudgetMini({ budgets, changeView }) {
  if (!budgets.length) {
    return <EmptyState title="No budgets set" body="Set monthly limits to track spending." />;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {budgets.slice(0, 4).map((b) => {
        const spent = Number(b.spent), amount = Number(b.amount);
        const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
        return (
          <div key={b.id} className={`budget-card ${spent > amount ? "over" : ""}`}>
            <div className="budget-line">
              <span className="budget-label">{b.category_name}</span>
              <span className="budget-amount">{money(spent, b.currency)} / {money(amount, b.currency)}</span>
            </div>
            <div className="progress-bar">
              <div className={`progress-bar-fill ${spent > amount ? "over" : ""}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <button className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => changeView("budgets")}>
        Manage budgets <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function Overview({ totals, dashboard, budgets, changeView }) {
  const cur = totals.currency || "INR";
  return (
    <>
      <div className="metrics-grid">
        <MetricCard label="Income"    value={money(totals.income,      cur)} variant="income"  icon={TrendingUp} />
        <MetricCard label="Expenses"  value={money(totals.expenses,    cur)} variant="expense" icon={TrendingDown} />
        <MetricCard label="Invested"  value={money(totals.investments, cur)} variant="invest"  icon={BarChart2} />
        <MetricCard label="Savings"   value={money(totals.savings,     cur)} variant="savings" icon={PiggyBank} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>Expense Breakdown</h3></div>
          <CategoryBars categories={dashboard?.categories || []} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Budget Watch</h3></div>
          <BudgetMini budgets={budgets} changeView={changeView} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Recent Activity</h3></div>
        <RecentTable transactions={dashboard?.recent || []} />
      </div>
    </>
  );
}
