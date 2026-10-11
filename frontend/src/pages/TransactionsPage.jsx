import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { TransactionForm } from "../components/TransactionForm.jsx";
import { TransactionTable } from "../components/TransactionTable.jsx";

const initialFilters = {
  q: "",
  type: "",
  category: "",
  currency: "",
  dateFrom: "",
  dateTo: "",
  sort: "transactionDate",
  order: "desc",
};

export function TransactionsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const query = useMemo(() => ({ ...filters, page, limit: 10 }), [filters, page]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await api.transactions(query));
    } catch (requestError) {
      setError(requestError.message || "Could not load transactions.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  async function saveTransaction(data) {
    setSaving(true);
    setError("");
    try {
      if (editor?.transaction) {
        await api.updateTransaction(editor.transaction._id, data);
        setSuccess("Transaction updated.");
      } else {
        await api.createTransaction(data);
        setSuccess("Transaction added.");
      }
      setEditor(null);
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not save transaction.");
      throw requestError;
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(transaction) {
    if (!window.confirm(`Delete the ${transaction.category} transaction? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      await api.deleteTransaction(transaction._id);
      setSuccess("Transaction deleted.");
      if (result?.data.length === 1 && page > 1) setPage((value) => value - 1);
      else await load();
    } catch (requestError) {
      setError(requestError.message || "Could not delete transaction.");
    }
  }

  const categories = [...new Set(result?.data.map((item) => item.category) ?? [])].sort();
  const pages = result?.pagination.pages ?? 0;

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR ACTIVITY</p>
          <h1>Transactions</h1>
          <p className="muted">Search and manage your income and expenses.</p>
        </div>
        <button className="button button-primary" onClick={() => setEditor({ transaction: null })}>＋ Add transaction</button>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      {editor && (
        <section className="panel editor-panel" aria-labelledby="transaction-editor-title">
          <div className="panel-heading">
            <div><h2 id="transaction-editor-title">{editor.transaction ? "Edit transaction" : "Add transaction"}</h2><p>Dates are interpreted in UTC.</p></div>
            <button className="icon-button" aria-label="Close form" onClick={() => setEditor(null)}>×</button>
          </div>
          <TransactionForm
            transaction={editor.transaction}
            onSubmit={saveTransaction}
            onCancel={() => setEditor(null)}
            busy={saving}
          />
        </section>
      )}

      <section className="panel">
        <div className="filters" aria-label="Transaction filters">
          <label className="search-field">Search
            <input type="search" placeholder="Merchant, note, category…" value={filters.q} onChange={(event) => updateFilter("q", event.target.value)} />
          </label>
          <label>Type
            <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}>
              <option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option>
            </select>
          </label>
          <label>Category
            <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label>Currency
            <input aria-label="Filter currency" maxLength="3" placeholder="Any" value={filters.currency} onChange={(event) => updateFilter("currency", event.target.value.toUpperCase())} />
          </label>
          <label>From
            <input aria-label="Filter start date" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          </label>
          <label>To
            <input aria-label="Filter end date" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
          </label>
          <label>Sort by
            <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              <option value="transactionDate">Date</option><option value="amountMinor">Amount</option><option value="createdAt">Created</option>
            </select>
          </label>
          <label>Order
            <select value={filters.order} onChange={(event) => updateFilter("order", event.target.value)}>
              <option value="desc">Newest / highest</option><option value="asc">Oldest / lowest</option>
            </select>
          </label>
        </div>

        {loading ? <div className="loading-block" role="status">Loading transactions…</div> : (
          <TransactionTable
            transactions={result?.data ?? []}
            onEdit={(transaction) => setEditor({ transaction })}
            onDelete={deleteTransaction}
          />
        )}

        <div className="pagination">
          <span>{result ? `${result.pagination.total} transaction${result.pagination.total === 1 ? "" : "s"}` : " "}</span>
          <div>
            <button className="button button-quiet" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span className="page-number">{pages ? `${page} of ${pages}` : "0 pages"}</span>
            <button className="button button-quiet" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </section>
    </section>
  );
}
