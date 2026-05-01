import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import api from "./api.js";
import Auth from "./components/Auth.jsx";
import Workspace from "./components/Workspace.jsx";
import { ToastContainer } from "./components/ui/Toast.jsx";
import "./styles.css";

function App() {
  const urlToken = new URLSearchParams(window.location.search).get("token");
  const [token, setToken] = useState(urlToken || localStorage.getItem("finance-token") || "");
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Consume token from OAuth redirect
  useEffect(() => {
    if (urlToken) {
      localStorage.setItem("finance-token", urlToken);
      window.history.replaceState({}, "", "/");
    }
  }, [urlToken]);

  // Auto-logout on 401
  useEffect(() => {
    const handler = () => {
      setToken("");
      setUser(null);
    };
    window.addEventListener("finance:logout", handler);
    return () => window.removeEventListener("finance:logout", handler);
  }, []);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setReady(true); return; }
    api.get("/auth/me")
      .then((res) => { setUser(res.data.user); })
      .catch(() => {
        localStorage.removeItem("finance-token");
        setToken("");
      })
      .finally(() => setReady(true)); // ← was false, causing infinite spinner
  }, [token]);

  function handleAuth(nextToken, nextUser) {
    localStorage.setItem("finance-token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("finance-token");
    setToken("");
    setUser(null);
  }

  if (!ready && token && !user) {
    // Loading state while verifying token
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <>
      {!token || !user
        ? <Auth onAuth={handleAuth} />
        : <Workspace user={user} onLogout={logout} />
      }
      <ToastContainer />
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
