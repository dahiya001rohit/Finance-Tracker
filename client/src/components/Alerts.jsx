import React from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import api from "../api.js";
import { toast } from "./ui/Toast.jsx";
import { EmptyState } from "./ui/index.jsx";

export default function Alerts({ notifications, month, reload }) {
  async function checkOverruns() {
    try {
      const res = await api.post("/budgets/check-overruns", { month });
      await reload();
      const n = res.data.overruns.length;
      toast[n ? "error" : "success"](n ? `${n} budget overrun alert(s) created` : "All budgets within limits ✓");
    } catch (err) { toast.error(err.response?.data?.error || "Check failed"); }
  }

  async function markAllRead() {
    try {
      await api.patch("/notifications/read-all");
      await reload();
      toast.success("All notifications marked as read");
    } catch (err) { toast.error("Failed to mark as read"); }
  }

  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    try {
      await api.delete("/notifications");
      await reload();
      toast.success("Notifications cleared");
    } catch (err) { toast.error("Failed to clear"); }
  }

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      await reload();
    } catch (_) {}
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>
          Budget Alerts
          {unread > 0 && <span className="badge badge-info" style={{ marginLeft: 10 }}>{unread} unread</span>}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          {unread > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</button>
          )}
          {notifications.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={clearAll}><Trash2 size={14} /> Clear</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={checkOverruns}><Bell size={14} /> Check Budgets</button>
        </div>
      </div>

      {!notifications.length ? (
        <EmptyState title="No alerts" body="Run a budget check after entering expenses to generate overrun alerts." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notice ${!n.is_read ? "unread" : ""}`}
              onClick={() => !n.is_read && markRead(n.id)}
              style={{ cursor: !n.is_read ? "pointer" : "default" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <span className="notice-title">{n.title}</span>
                {!n.is_read && (
                  <span className="badge badge-info" style={{ fontSize: 10, padding: "2px 6px" }}>NEW</span>
                )}
              </div>
              <span className="notice-body">{n.body}</span>
              <span className="notice-time">{new Date(n.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
