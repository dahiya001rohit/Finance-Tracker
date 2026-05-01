import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

let toastId = 0;
const subscribers = new Set();

export function toast(message, type = "info") {
  const id = ++toastId;
  subscribers.forEach((fn) => fn({ id, message, type }));
  return id;
}
toast.success = (m) => toast(m, "success");
toast.error   = (m) => toast(m, "error");
toast.info    = (m) => toast(m, "info");

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  }, []);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" && <CheckCircle size={16} color="var(--green)" />}
          {t.type === "error"   && <XCircle     size={16} color="var(--red)" />}
          {t.type === "info"    && <Info         size={16} color="var(--accent)" />}
          <span className="toast-msg">{t.message}</span>
          <button className="btn-icon" style={{width:24,height:24,minHeight:24}} onClick={() => dismiss(t.id)}>
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
