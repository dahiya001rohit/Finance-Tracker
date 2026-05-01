import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Camera, Upload, FolderPlus, Pencil, X, Check } from "lucide-react";
import api from "../api.js";
import { toast } from "./ui/Toast.jsx";
import { EmptyState, Badge, CurrencySelect, money, Modal, Spinner } from "./ui/index.jsx";

// ── Transaction Form ─────────────────────────────────────────────────────────
function TxForm({ categories, month, preferred, reload, onClose }) {
  const [form, setForm] = useState({
    kind: "expense", categoryId: "", amount: "", currency: preferred,
    transactionDate: `${month}-01`, description: ""
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, transactionDate: `${month}-01` }));
  }, [month]);

  const matching = useMemo(
    () => categories.filter((c) => c.kind === form.kind || (form.kind === "refund" && c.kind === "expense")),
    [categories, form.kind]
  );

  function set(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/transactions", { ...form, categoryId: form.categoryId || null, amount: Number(form.amount) });
      setForm((f) => ({ ...f, amount: "", description: "" }));
      await reload();
      toast.success("Transaction added");
      if (onClose) onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not add transaction");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-row">
        <div className="form-field">
          <label>Type</label>
          <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value, categoryId: "" }))}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="investment">Investment</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        <div className="form-field">
          <label>Category</label>
          <select value={form.categoryId} onChange={set("categoryId")}>
            <option value="">Uncategorized</option>
            {matching.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label>Amount</label>
          <input type="number" step="0.01" min="0" value={form.amount} onChange={set("amount")} required />
        </div>
        <div className="form-field">
          <label>Currency</label>
          <CurrencySelect value={form.currency} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label>Date</label>
          <input type="date" value={form.transactionDate} onChange={set("transactionDate")} required />
        </div>
        <div className="form-field">
          <label>Description</label>
          <input value={form.description} onChange={set("description")} placeholder="Salary, rent, groceries…" />
        </div>
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? <Spinner /> : <Plus size={16} />} Add Transaction
      </button>
    </form>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ tx, categories, preferred, reload, onClose }) {
  const [form, setForm] = useState({
    kind: tx.kind, categoryId: tx.category_id || "",
    amount: tx.amount, currency: tx.currency,
    transactionDate: tx.transaction_date?.slice(0, 10) || "",
    description: tx.description || ""
  });
  const [busy, setBusy] = useState(false);

  const matching = useMemo(
    () => categories.filter((c) => c.kind === form.kind || (form.kind === "refund" && c.kind === "expense")),
    [categories, form.kind]
  );

  function set(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/transactions/${tx.id}`, { ...form, categoryId: form.categoryId || null, amount: Number(form.amount) });
      await reload();
      toast.success("Transaction updated");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update");
    } finally { setBusy(false); }
  }

  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <div className="form-row">
          <div className="form-field">
            <label>Type</label>
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value, categoryId: "" }))}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="investment">Investment</option>
              <option value="refund">Refund</option>
            </select>
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={form.categoryId} onChange={set("categoryId")}>
              <option value="">Uncategorized</option>
              {matching.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Amount</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={set("amount")} required />
          </div>
          <div className="form-field">
            <label>Currency</label>
            <CurrencySelect value={form.currency} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.transactionDate} onChange={set("transactionDate")} required />
          </div>
          <div className="form-field">
            <label>Description</label>
            <input value={form.description} onChange={set("description")} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner /> : <Check size={16} />} Save Changes
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}><X size={16} /> Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ tx, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(tx.receipt_url);

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("receipt", file);
    setUploading(true);
    try {
      const res = await api.post(`/transactions/${tx.id}/receipt`, body, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUrl(res.data.receipt.url);
      toast.success("Receipt uploaded");
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally { setUploading(false); }
  }

  const fullUrl = url ? `http://localhost:4000${url}` : null;

  return (
    <Modal title="Receipt" onClose={onClose}>
      <div style={{ display: "grid", gap: 16 }}>
        {fullUrl && (
          url.endsWith(".pdf")
            ? <a href={fullUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">Open PDF receipt</a>
            : <img src={fullUrl} alt="Receipt" className="receipt-thumb" />
        )}
        <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
          {uploading ? <><Spinner /> Uploading…</> : <><Camera size={16} /> {url ? "Replace Receipt" : "Upload Receipt"}</>}
          <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={upload} />
        </label>
      </div>
    </Modal>
  );
}

// ── Transaction Table ─────────────────────────────────────────────────────────
function TxTable({ transactions, categories, preferred, reload }) {
  const [editTx, setEditTx] = useState(null);
  const [receiptTx, setReceiptTx] = useState(null);

  async function remove(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      await reload();
      toast.success("Transaction deleted");
    } catch (err) { toast.error(err.response?.data?.error || "Delete failed"); }
  }

  if (!transactions.length) {
    return <EmptyState title="No transactions" body="Add income, expenses, or investments for the selected month." />;
  }

  return (
    <>
      <div className="table-wrap">
        <div className="table-head tx-grid">
          <span>Description</span><span>Type</span><span>Date</span>
          <span style={{ textAlign: "right" }}>Amount</span><span />
        </div>
        {transactions.map((t) => (
          <div className="table-row tx-grid" key={t.id}>
            <div className="cell-main">
              <strong>{t.description || t.category_name || "Untitled"}</strong>
              <span>{t.category_name || "Uncategorized"}</span>
            </div>
            <Badge kind={t.kind} />
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{t.transaction_date?.slice(0, 10)}</span>
            <span className="mono" style={{ textAlign: "right", color: t.kind === "income" ? "var(--green)" : t.kind === "expense" ? "var(--red)" : "var(--ink)" }}>
              {money(t.amount, t.currency)}
            </span>
            <div className="row-actions">
              <button className="btn-icon" title="Receipt" onClick={() => setReceiptTx(t)}>
                <Camera size={14} />
                {t.receipt_url && <span style={{ width: 6, height: 6, background: "var(--green)", borderRadius: "50%", position: "absolute", top: 6, right: 6 }} />}
              </button>
              <button className="btn-icon" title="Edit" onClick={() => setEditTx(t)}><Pencil size={14} /></button>
              <button className="btn-icon btn-danger" title="Delete" onClick={() => remove(t.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {editTx    && <EditModal    tx={editTx}    categories={categories} preferred={preferred} reload={reload} onClose={() => setEditTx(null)}    />}
      {receiptTx && <ReceiptModal tx={receiptTx}                                                              onClose={() => setReceiptTx(null)} />}
    </>
  );
}

// ── Category Panel ────────────────────────────────────────────────────────────
function CategoryPanel({ categories, reload }) {
  const [form, setForm] = useState({ name: "", kind: "expense" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/categories", form);
      setForm({ name: "", kind: "expense" });
      await reload();
      toast.success("Category created");
    } catch (err) { toast.error(err.response?.data?.error || "Could not create category"); }
    finally { setBusy(false); }
  }

  async function remove(c) {
    try {
      const res = await api.delete(`/categories/${c.id}`);
      await reload();
      toast.success(res.data.softDeleted ? "Category archived (has transactions)" : "Category deleted");
    } catch (err) { toast.error(err.response?.data?.error || "Delete failed"); }
  }

  return (
    <div>
      <form onSubmit={submit} className="inline-form compact-form">
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Category name" required />
        <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="investment">Investment</option>
        </select>
        <button className="btn-icon" disabled={busy} title="Add category"><FolderPlus size={16} /></button>
      </form>
      <div style={{ display: "grid", gap: 8 }}>
        {categories.map((c) => (
          <div key={c.id} className="cat-pill">
            <div>
              <div className="cat-name">{c.name}</div>
              <div className="cat-kind">{c.kind}</div>
            </div>
            <button className="btn-icon btn-danger" onClick={() => remove(c)}><Trash2 size={13} /></button>
          </div>
        ))}
        {!categories.length && <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No categories yet.</p>}
      </div>
    </div>
  );
}

// ── CSV Import ────────────────────────────────────────────────────────────────
function CsvImport({ preferred, reload }) {
  const [file, setFile] = useState(null);
  const [currency, setCurrency] = useState(preferred);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) { toast.error("Choose a CSV file first"); return; }
    const body = new FormData();
    body.append("statement", file);
    body.append("currency", currency);
    setBusy(true); setResult(null);
    try {
      const res = await api.post("/transactions/import-csv", body, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
      setFile(null);
      e.target.reset();
      await reload();
      toast.success(`Imported ${res.data.importedCount} transaction(s)`);
    } catch (err) { toast.error(err.response?.data?.error || "Import failed"); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <label className="csv-zone">
        <Upload size={24} color="var(--ink-3)" style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>{file ? file.name : "Click to select CSV"}</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>Bank statement · max 5 MB</div>
        <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      <div className="form-field">
        <label>Default Currency</label>
        <CurrencySelect value={currency} onChange={setCurrency} />
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? <Spinner /> : <Upload size={16} />} Import CSV
      </button>
      <p className="csv-hint">Supported columns: date, description, amount, debit, credit, type, category, currency.</p>
      {result && (
        <div className="banner banner-success">
          {result.importedCount} imported · {result.skippedCount} skipped
          {result.skipped?.slice(0, 3).map((s) => (
            <div key={s.row} style={{ fontSize: 12, opacity: 0.8 }}>Row {s.row}: {s.reason}</div>
          ))}
        </div>
      )}
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Transactions({ categories, transactions, month, preferred, reload }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="two-col wide-left" style={{ alignItems: "start" }}>
      <div style={{ display: "grid", gap: 18 }}>
        <div className="panel">
          <div className="panel-head">
            <h3>Transactions</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add
            </button>
          </div>
          <TxTable transactions={transactions} categories={categories} preferred={preferred} reload={reload} />
        </div>
      </div>

      <div className="side-stack">
        <div className="panel">
          <div className="panel-head"><h3>CSV Import</h3></div>
          <CsvImport preferred={preferred} reload={reload} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Categories</h3></div>
          <CategoryPanel categories={categories} reload={reload} />
        </div>
      </div>

      {showForm && (
        <Modal title="Add Transaction" onClose={() => setShowForm(false)}>
          <TxForm categories={categories} month={month} preferred={preferred} reload={reload} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}
