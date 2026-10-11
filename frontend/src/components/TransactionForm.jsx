import { useEffect, useState } from "react";
import { FormField } from "./FormField.jsx";
import { amountToMinorUnits, currencyFractionDigits } from "../utils/currency.js";

const blank = {
  type: "expense",
  amount: "",
  currency: "USD",
  category: "",
  description: "",
  merchant: "",
  transactionDate: new Date().toISOString().slice(0, 10),
};

export function TransactionForm({ transaction, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(transaction ? {
      type: transaction.type,
      amount: (transaction.amountMinor / 10 ** currencyFractionDigits(transaction.currency))
        .toFixed(currencyFractionDigits(transaction.currency)),
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description ?? "",
      merchant: transaction.merchant ?? "",
      transactionDate: new Date(transaction.transactionDate).toISOString().slice(0, 10),
    } : blank);
  }, [transaction]);

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
      setError("Enter a valid three-letter currency code.");
      return;
    }
    const amountMinor = amountToMinorUnits(form.amount, form.currency);
    if (amountMinor === null) {
      const digits = currencyFractionDigits(form.currency);
      setError(`Enter an amount greater than zero with at most ${digits} decimal places.`);
      return;
    }
    if (!form.category.trim()) {
      setError("Enter a category.");
      return;
    }
    try {
      await onSubmit({
        type: form.type,
        amountMinor,
        currency: form.currency.trim().toUpperCase(),
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        merchant: form.merchant.trim() || undefined,
        transactionDate: form.transactionDate,
      });
    } catch (submitError) {
      setError(submitError.message || "Could not save the transaction.");
    }
  }

  return (
    <form className="transaction-form" onSubmit={submit} noValidate>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="transaction-type">Type</label>
          <select id="transaction-type" name="type" value={form.type} onChange={change}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <FormField id="transaction-amount" name="amount" label="Amount" type="number" min="0.01" step={10 ** -currencyFractionDigits(form.currency)} inputMode="decimal" required value={form.amount} onChange={change} />
        <FormField id="transaction-currency" name="currency" label="Currency code" maxLength="3" pattern="[A-Za-z]{3}" required value={form.currency} onChange={change} />
        <FormField id="transaction-category" name="category" label="Category" maxLength="64" required value={form.category} onChange={change} />
        <FormField id="transaction-date" name="transactionDate" label="Date (UTC)" type="date" required value={form.transactionDate} onChange={change} />
        <FormField id="transaction-merchant" name="merchant" label="Merchant (optional)" maxLength="128" value={form.merchant} onChange={change} />
        <FormField id="transaction-description" name="description" label="Description (optional)" maxLength="500" value={form.description} onChange={change} />
      </div>
      <div className="form-actions">
        {onCancel && <button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button>}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : transaction ? "Save changes" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}
