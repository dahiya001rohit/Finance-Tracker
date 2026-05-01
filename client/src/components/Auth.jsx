import React, { useState } from "react";
import { Wallet, ShieldCheck, Eye, EyeOff } from "lucide-react";
import api from "../api.js";
import { CurrencySelect } from "./ui/index.jsx";
import { toast } from "./ui/Toast.jsx";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", preferredCurrency: "INR" });
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : form;
      const res = await api.post(path, payload);
      onAuth(res.data.token, res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="auth-logo"><Wallet size={22} /></div>
          <div>
            <h1>Finance Tracker</h1>
            <p>Your personal finance command center</p>
          </div>
        </div>

        <div className="segmented">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign In</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create Account</button>
        </div>

        <form onSubmit={submit} className="form-grid">
          {mode === "register" && (
            <div className="form-field">
              <label>Full Name</label>
              <input value={form.name} onChange={set("name")} placeholder="Your name" required minLength={2} />
            </div>
          )}

          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </div>

          <div className="form-field">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                required
                minLength={mode === "register" ? 8 : 1}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--ink-3)", padding:4 }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="form-field">
              <label>Preferred Currency</label>
              <CurrencySelect value={form.preferredCurrency} onChange={(v) => setForm((f) => ({ ...f, preferredCurrency: v }))} />
            </div>
          )}

          <button className="btn btn-primary btn-full" disabled={busy}>
            <ShieldCheck size={16} />
            {busy ? "Working…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="divider" style={{ margin: "16px 0 0" }}>or</div>
        <a className="google-btn" href="/api/auth/google">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>
      </div>
    </main>
  );
}
