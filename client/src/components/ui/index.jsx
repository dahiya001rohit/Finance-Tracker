import React from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children, width = 480 }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: `min(${width}px,100%)` }}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h4>{title}</h4>
      {body && <p>{body}</p>}
    </div>
  );
}

export function Spinner({ size = 18 }) {
  return <div className="spinner" style={{ width: size, height: size }} />;
}

export function Badge({ kind }) {
  const map = {
    income: "badge-income", expense: "badge-expense",
    investment: "badge-investment", refund: "badge-refund"
  };
  return <span className={`badge ${map[kind] || "badge-info"}`}>{kind}</span>;
}

const CURRENCIES = ["INR","USD","EUR","GBP","AED","SGD","JPY","CAD","AUD","CHF"];
export function CurrencySelect({ value, onChange, className }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}

export function money(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 2
  }).format(Number(value || 0));
}
