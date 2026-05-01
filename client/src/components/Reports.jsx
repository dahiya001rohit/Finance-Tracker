import React, { useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import api from "../api.js";
import { toast } from "./ui/Toast.jsx";
import { EmptyState, money, Spinner } from "./ui/index.jsx";

function MonthlyChart({ report }) {
  if (!report.length) return <EmptyState title="No data yet" body="Transactions will appear here over time." />;
  const maxVal = Math.max(...report.map((r) => Math.max(Number(r.income), Number(r.expenses))), 1);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {report.map((row) => (
        <div key={`${row.month}-${row.currency}`} style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>
              {row.month} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{row.currency}</span>
            </span>
            <span style={{ color: "var(--green)", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
              {money(row.income, row.currency)}
            </span>
          </div>
          <div className="bar-track" style={{ height: 10 }}>
            <div className="bar-fill" style={{ width: `${(Number(row.income) / maxVal) * 100}%`, background: "var(--green)" }} />
          </div>
          <div className="bar-track" style={{ height: 10 }}>
            <div className="bar-fill" style={{ width: `${(Number(row.expenses) / maxVal) * 100}%`, background: "var(--red)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)" }}>
            <span>
              <span style={{ color: "var(--green)" }}>▲</span> Income &nbsp;
              <span style={{ color: "var(--red)" }}>▼</span> Expenses
            </span>
            <span style={{ color: "var(--red)" }}>{money(row.expenses, row.currency)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategorySummary({ summary }) {
  if (!summary.length) return <EmptyState title="No category data" body="Add categorized transactions first." />;
  const groups = summary.reduce((acc, item) => {
    (acc[item.kind] = acc[item.kind] || []).push(item);
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {Object.entries(groups).map(([kind, items]) => (
        <div key={kind}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "var(--ink-3)",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8
          }}>
            {kind}
          </div>
          {items.map((item) => (
            <div
              key={`${item.kind}-${item.currency}-${item.category_name}`}
              style={{
                display: "flex", justifyContent: "space-between",
                padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 14
              }}
            >
              <span>{item.category_name}</span>
              <span className="mono" style={{ fontSize: 13 }}>{money(item.amount, item.currency)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AiInsightPanel({ month }) {
  const [insight, setInsight] = useState(null);
  const [configured, setConfigured] = useState(true); // optimistic — server will tell us
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setBusy(true);
    setInsight(null);
    try {
      const res = await api.get(`/reports/ai-insight?month=${month}`);
      setConfigured(!res.data.comingSoon);
      setInsight(res.data.insight?.summary || res.data.message);
      setGenerated(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "AI insight failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ gridColumn: "1 / -1" }}>
      <div className="panel-head">
        <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Brain size={18} color="var(--violet)" />
          AI Finance Insight
          {!configured && generated && (
            <span className="coming-soon-badge"><Sparkles size={11} /> Groq key needed</span>
          )}
        </h3>
        <button className="btn btn-primary btn-sm" onClick={generate} disabled={busy}>
          {busy ? <Spinner size={14} /> : <Brain size={14} />}
          {busy ? "Analysing…" : "Generate Insight"}
        </button>
      </div>

      {insight ? (
        <div style={{ display: "grid", gap: 12 }}>
          <p className="insight-text">{insight}</p>
          {!configured && (
            <div className="banner banner-error" style={{
              background: "var(--amber-dim)", borderColor: "rgba(245,158,11,0.3)", color: "var(--amber)"
            }}>
              💡 Add <code style={{ fontFamily: "JetBrains Mono, monospace" }}>GROQ_API_KEY</code> to{" "}
              <code style={{ fontFamily: "JetBrains Mono, monospace" }}>.env</code> to enable real AI insights.
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: "var(--ink-3)", fontSize: 14, lineHeight: 1.7 }}>
          Click <strong>Generate Insight</strong> to get an AI-powered analysis of your {month} finances.{" "}
          {configured
            ? "Powered by Groq."
            : <>Requires <code style={{ fontFamily: "JetBrains Mono, monospace" }}>GROQ_API_KEY</code> in <code style={{ fontFamily: "JetBrains Mono, monospace" }}>.env</code>.</>
          }
        </p>
      )}
    </div>
  );
}

export default function Reports({ month, monthlyReport, categorySummary }) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="two-col" style={{ alignItems: "start" }}>
        <div className="panel">
          <div className="panel-head"><h3>Monthly Trend (6 months)</h3></div>
          <MonthlyChart report={monthlyReport} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Category Breakdown</h3></div>
          <CategorySummary summary={categorySummary} />
        </div>
      </div>
      <AiInsightPanel month={month} />
    </div>
  );
}
