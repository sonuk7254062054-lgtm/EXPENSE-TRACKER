import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";

export function AppShell() {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onLogout() {
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Could not end the session. Please retry.");
    }
  }

  return (
    <div className="app-layout">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="Expense Tracker home">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span>Expense<span className="brand-light">Tracker</span></span>
        </NavLink>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end>Overview</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
        </nav>
        <div className="user-menu">
          <span className="user-email">{user?.email}</span>
          <button className="button button-quiet" onClick={onLogout}>Log out</button>
        </div>
      </header>
      {error && <p className="global-error" role="alert">{error}</p>}
      <main className="page-content"><Outlet /></main>
      <footer className="footer">Your finances, clearly in view.</footer>
    </div>
  );
}
