import { formatMinorUnits } from "../utils/currency.js";

function formatMoney(value, currency) {
  return formatMinorUnits(value, currency);
}

export function MonthlyChart({ months, currency }) {
  const max = Math.max(1, ...months.flatMap((month) => [month.incomeMinor, month.expenseMinor]));
  if (!months.length) return <p className="empty-inline">No monthly activity for this range.</p>;

  return (
    <div className="chart-list" aria-label="Monthly income and expenses">
      {months.map((month) => (
        <div className="chart-row" key={month.month}>
          <span className="chart-label">{month.month}</span>
          <div className="chart-bars">
            <div className="bar-track" aria-label={`${month.month} income ${formatMoney(month.incomeMinor, currency)}`}>
              <span className="bar bar-income" style={{ width: `${(month.incomeMinor / max) * 100}%` }} />
            </div>
            <div className="bar-track" aria-label={`${month.month} expenses ${formatMoney(month.expenseMinor, currency)}`}>
              <span className="bar bar-expense" style={{ width: `${(month.expenseMinor / max) * 100}%` }} />
            </div>
          </div>
          <span className="chart-value">{formatMoney(month.incomeMinor - month.expenseMinor, currency)}</span>
        </div>
      ))}
      <div className="chart-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span></div>
    </div>
  );
}

export function CategoryChart({ categories, currency }) {
  const total = categories.reduce((sum, item) => sum + item.expenseMinor, 0);
  if (!categories.length) return <p className="empty-inline">No expenses for this range.</p>;

  return (
    <ul className="category-chart" aria-label="Expenses by category">
      {categories.map((item) => (
        <li key={item.category}>
          <div className="category-chart-heading">
            <span>{item.category}</span>
            <span>{formatMoney(item.expenseMinor, currency)}</span>
          </div>
          <div className="category-track" aria-label={`${item.category}: ${total ? Math.round((item.expenseMinor / total) * 100) : 0}%`}>
            <span style={{ width: `${total ? (item.expenseMinor / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
