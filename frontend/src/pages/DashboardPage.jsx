import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { CategoryChart, MonthlyChart } from "../components/ReportCharts.jsx";
import { formatMinorUnits } from "../utils/currency.js";

function currentMonthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, now.getUTCMonth() + 1, 0)).getUTCDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function DashboardPage() {
  const [range, setRange] = useState(currentMonthRange);
  const [currency, setCurrency] = useState("USD");
  const [reports, setReports] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!/^[A-Z]{3}$/.test(currency)) {
      setReports(null);
      setBusy(false);
      setError("Enter a three-letter currency code.");
      return () => { active = false; };
    }
    if (range.from && range.to && range.from > range.to) {
      setReports(null);
      setBusy(false);
      setError("The start date must be on or before the end date.");
      return () => { active = false; };
    }
    setReports(null);
    setBusy(true);
    setError("");
    const filters = { ...range, currency };
    Promise.all([
      api.summary(filters),
      api.monthly(filters),
      api.categories(filters),
    ]).then(([summary, monthly, categories]) => {
      if (active) setReports({ summary: summary.data, monthly: monthly.data, categories: categories.data });
    }).catch((requestError) => {
      if (active) setError(requestError.message || "Could not load reports.");
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [range, currency]);

  function updateRange(key, value) {
    setRange((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR MONEY AT A GLANCE</p>
          <h1>Overview</h1>
          <p className="muted">A thoughtful snapshot of your finances.</p>
        </div>
        <div className="range-controls">
          <label>From <input aria-label="Report start date" type="date" value={range.from} onChange={(event) => updateRange("from", event.target.value)} /></label>
          <label>To <input aria-label="Report end date" type="date" value={range.to} onChange={(event) => updateRange("to", event.target.value)} /></label>
          <label>Currency
            <input aria-label="Report currency" maxLength="3" pattern="[A-Za-z]{3}" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          </label>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {busy && <div className="loading-block" role="status">Loading your reports…</div>}
      {!busy && reports && (
        <>
          <div className="summary-grid">
            <article className="summary-card">
              <span className="summary-label">Income</span>
              <strong className="summary-value amount-positive">{formatMinorUnits(reports.summary.incomeMinor, currency)}</strong>
              <span className="summary-note">For the selected period</span>
            </article>
            <article className="summary-card">
              <span className="summary-label">Expenses</span>
              <strong className="summary-value">{formatMinorUnits(reports.summary.expenseMinor, currency)}</strong>
              <span className="summary-note">For the selected period</span>
            </article>
            <article className="summary-card summary-card-accent">
              <span className="summary-label">Net balance</span>
              <strong className="summary-value">{formatMinorUnits(reports.summary.netMinor, currency)}</strong>
              <span className="summary-note">Income minus expenses</span>
            </article>
          </div>
          <div className="report-grid">
            <article className="panel">
              <div className="panel-heading"><div><h2>Monthly cash flow</h2><p>Income and expenses by UTC month</p></div></div>
              <MonthlyChart months={reports.monthly} currency={currency} />
            </article>
            <article className="panel">
              <div className="panel-heading"><div><h2>Spending by category</h2><p>Expense distribution for this period</p></div></div>
              <CategoryChart categories={reports.categories} currency={currency} />
            </article>
          </div>
        </>
      )}
      {!busy && !error && !reports && <div className="empty-state"><h2>Reports unavailable</h2><p>Please try again.</p></div>}
    </section>
  );
}
