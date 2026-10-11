# Reports API contract

All reports require an authenticated session. The server derives the owner
from the authenticated session; callers cannot select another user.

Each endpoint accepts the following query parameters:

| Parameter | Required | Contract |
| --- | --- | --- |
| `currency` | Yes | Three-letter currency code, case-insensitive on input and uppercase in responses. Totals never combine currencies. |
| `from` | No | Inclusive UTC calendar date in `YYYY-MM-DD` format. |
| `to` | No | Inclusive UTC calendar date in `YYYY-MM-DD` format. |

If both dates are supplied, `from` must not be after `to` and the range must
not exceed five calendar years. A single endpoint boundary is permitted. An
omitted boundary leaves that side unbounded. Unknown query parameters are
rejected.

Transaction dates are stored as `Date` values from UTC date-only inputs.
Filtering uses midnight UTC as the lower bound and midnight UTC on the day
after `to` as an exclusive upper bound. Monthly grouping uses UTC calendar
months. The API does not report according to a user-selected timezone.

## `GET /api/reports/summary`

Returns totals for the selected currency and range. Empty results return zero
values.

```json
{
  "data": {
    "currency": "USD",
    "range": { "from": "2026-10-01", "to": "2026-10-31" },
    "incomeMinor": 500000,
    "expenseMinor": 125000,
    "netMinor": 375000
  }
}
```

## `GET /api/reports/monthly`

Returns income and expense totals per UTC month, ordered chronologically.
When both range boundaries are provided, every month intersecting the range
is included, with zero totals for months without matching transactions.
Without a complete range, only months with matching transactions are
returned. Empty results return an empty array.

```json
{
  "data": [
    { "month": "2026-09", "incomeMinor": 420000, "expenseMinor": 112000 },
    { "month": "2026-10", "incomeMinor": 500000, "expenseMinor": 125000 }
  ]
}
```

## `GET /api/reports/categories`

Returns expense totals grouped by exact category string, in descending
expense order. Income transactions are excluded. Empty results return an
empty array.

```json
{
  "data": [
    { "category": "groceries", "expenseMinor": 55000 },
    { "category": "transport", "expenseMinor": 20000 }
  ]
}
```

Invalid currency/date/range values, missing currency, and unexpected query
parameters return HTTP 400 with the standard `VALIDATION_ERROR` response.
Unauthenticated requests return HTTP 401.
