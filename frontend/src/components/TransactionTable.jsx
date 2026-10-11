import { formatMinorUnits } from "../utils/currency.js";

export function TransactionTable({ transactions, onEdit, onDelete }) {
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">↗</span>
        <h2>No transactions found</h2>
        <p>Try another filter or add a transaction to get started.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <caption className="visually-hidden">Your transactions</caption>
        <thead>
          <tr>
            <th scope="col">Transaction</th>
            <th scope="col">Category</th>
            <th scope="col">Date</th>
            <th scope="col">Amount</th>
            <th scope="col"><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction._id}>
              <td>
                <span className="transaction-title">{transaction.merchant || transaction.description || transaction.category}</span>
                <span className="transaction-subtitle">{transaction.type === "income" ? "Income" : "Expense"}</span>
              </td>
              <td><span className="category-pill">{transaction.category}</span></td>
              <td>{new Date(transaction.transactionDate).toISOString().slice(0, 10)}</td>
              <td className={transaction.type === "income" ? "amount-positive" : "amount-negative"}>
                {transaction.type === "income" ? "+" : "−"}{formatMinorUnits(transaction.amountMinor, transaction.currency)}
              </td>
              <td>
                <div className="row-actions">
                  <button className="text-button" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.category} transaction`}>Edit</button>
                  <button className="text-button text-danger" onClick={() => onDelete(transaction)} aria-label={`Delete ${transaction.category} transaction`}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
