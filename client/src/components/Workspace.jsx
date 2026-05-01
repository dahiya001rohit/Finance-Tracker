import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, CircleDollarSign, Banknote,
  BarChart3, Bell, LogOut, Wallet, RefreshCcw, Menu, X
} from "lucide-react";
import api from "../api.js";
import { toast } from "./ui/Toast.jsx";
import Overview from "./Overview.jsx";
import Transactions from "./Transactions.jsx";
import Budgets from "./Budgets.jsx";
import Reports from "./Reports.jsx";
import Alerts from "./Alerts.jsx";

const VIEWS = [
  { id: "overview",      label: "Overview",      icon: LayoutDashboard  },
  { id: "transactions",  label: "Transactions",  icon: CircleDollarSign },
  { id: "budgets",       label: "Budgets",        icon: Banknote         },
  { id: "reports",       label: "Reports",        icon: BarChart3        },
  { id: "alerts",        label: "Alerts",         icon: Bell             }
];

function monthNow() { return new Date().toISOString().slice(0, 7); }

export default function Workspace({ user, onLogout }) {
  const hash = window.location.hash.replace("#", "");
  const [view, setView] = useState(VIEWS.some((v) => v.id === hash) ? hash : "overview");
  const [month, setMonth] = useState(monthNow());
  const [loading, setLoading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [state, setState] = useState({
    categories: [], transactions: [], dashboard: null,
    budgets: [], notifications: [], monthlyReport: [], categorySummary: []
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catR, txR, dashR, budR, noteR, monthR, sumR] = await Promise.all([
        api.get("/categories"),
        api.get(`/transactions?month=${month}`),
        api.get(`/reports/dashboard?month=${month}`),
        api.get(`/budgets?month=${month}`),
        api.get("/notifications"),
        api.get("/reports/monthly?months=6"),
        api.get(`/reports/category-summary?month=${month}`)
      ]);
      setState({
        categories:      catR.data.categories,
        transactions:    txR.data.transactions,
        dashboard:       dashR.data,
        budgets:         budR.data.budgets,
        notifications:   noteR.data.notifications,
        monthlyReport:   monthR.data.report,
        categorySummary: sumR.data.summary
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load data");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  function changeView(v) {
    setView(v);
    setMobileNav(false);
    window.history.replaceState({}, "", `#${v}`);
  }

  const preferred = user.preferred_currency || "INR";
  const totals = state.dashboard?.totals?.[0] || { currency: preferred, income: 0, expenses: 0, investments: 0, savings: 0 };
  const unread = state.notifications.filter((n) => !n.is_read).length;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo"><Wallet size={18} /></div>
          <div>
            <h1>Finance Tracker</h1>
            <p style={{ fontSize: 11, color: "var(--ink-3)", wordBreak: "break-all" }}>{user.email}</p>
          </div>
          <button className="btn-icon" style={{ marginLeft: "auto", display: "none" }} onClick={() => setMobileNav((s) => !s)} id="mobile-menu-btn">
            {mobileNav ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="side-nav">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-btn ${view === id ? "active" : ""}`} onClick={() => changeView(id)}>
              <span className="nav-icon">
                <Icon size={17} />
              </span>
              {label}
              {id === "alerts" && unread > 0 && (
                <span className="badge badge-info" style={{ marginLeft: "auto", padding: "2px 7px" }}>{unread}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-full" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="content">
        <header className="topbar">
          <div className="topbar-left">
            <p>Personal finance workspace</p>
            <h2>{VIEWS.find((v) => v.id === view)?.label || "Overview"}</h2>
          </div>
          <div className="topbar-right">
            <input
              type="month" value={month} aria-label="Reporting month"
              onChange={(e) => setMonth(e.target.value)}
              style={{ width: 148 }}
            />
            <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={loading}>
              {loading ? <div className="spinner" /> : <RefreshCcw size={15} />}
              {loading ? "Loading" : "Refresh"}
            </button>
          </div>
        </header>

        <div className="main-content">
          {view === "overview"     && <Overview totals={totals} dashboard={state.dashboard} budgets={state.budgets} changeView={changeView} />}
          {view === "transactions" && <Transactions categories={state.categories} transactions={state.transactions} month={month} preferred={preferred} reload={loadData} />}
          {view === "budgets"      && <Budgets budgets={state.budgets} categories={state.categories} month={month} preferred={preferred} reload={loadData} />}
          {view === "reports"      && <Reports month={month} dashboard={state.dashboard} monthlyReport={state.monthlyReport} categorySummary={state.categorySummary} />}
          {view === "alerts"       && <Alerts notifications={state.notifications} month={month} reload={loadData} />}
        </div>
      </div>
    </div>
  );
}
