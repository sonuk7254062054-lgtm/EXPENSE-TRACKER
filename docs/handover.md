# Phase 7 testing and handover report

**Verification date:** 2026-10-11
**Scope:** Local test environment only; no deployment or production data.

## Final checklist

| # | Handover criterion | Result | Evidence and notes |
| --- | --- | --- | --- |
| 1 | Correct frontend and backend identified | **PASS** | Backend entry is `src/server.js`; `npm.cmd run dev` uses `node --watch src/server.js`. Frontend is Vite under `frontend/`; `/api` proxy defaults to port 3000 and supports `VITE_API_PROXY_TARGET`. |
| 2 | Automated tests and production build verified | **PASS** | `npm.cmd test`: 20 passed, 0 failed. `npm.cmd --prefix frontend test`: 24 passed in 7 files. `npm.cmd --prefix frontend run build`: succeeded. |
| 3 | Live end-to-end workflow tested | **PASS** | Real browser used this Vite frontend on port 5174, proxying to this project's backend on port 3001. Registered and signed in a QA account, created/listed transactions, edited one, deleted one, and verified reports against the resulting data. |
| 4 | Authorization and cross-user isolation tested | **PASS** | Unauthenticated transaction request returned 401. A second QA account saw zero transactions; GET, PATCH, and DELETE against the first account's transaction each returned 404. Logout redirected to login and a protected request afterward returned 401. |
| 5 | Responsive UI and error states verified | **PASS** | At viewport width 390px, dashboard and transactions body width/scroll width were both 375px (no horizontal overflow). Live checks observed loading, empty, success, invalid-login, and invalid-currency form states. Automated frontend tests cover mocked API failures and empty states. |
| 6 | Environment secrets and configuration reviewed | **PASS, with limitation** | `.env.example` contains a replace-me secret placeholder, not a real secret; `.gitignore` excludes `.env`. No root or frontend `.env` exists, so the normal local database target and secret configuration are not confirmed. The live run used a generated runtime-only session secret. |
| 7 | README and setup instructions completed | **PASS** | Root `README.md` documents setup, scripts, environment variables, API overview, test behavior, and troubleshooting. |
| 8 | Known issues and final handover report documented | **PASS, with limitations** | This report records verification and limitations. The workspace is not a Git repository, and an unrelated process occupies port 3000; it was left untouched. |

## Commands and results

Executed from the workspace root:

```text
npm.cmd test
  20 tests passed; 0 failed.

npm.cmd --prefix frontend test
  7 test files passed; 24 tests passed.

npm.cmd --prefix frontend run build
  Vite production build succeeded.

npm.cmd audit --json
  0 known vulnerabilities (0 info, low, moderate, high, or critical).

npm.cmd --prefix frontend audit --json
  0 known vulnerabilities (0 info, low, moderate, high, or critical).
```

Frontend tests stub the API. Backend tests exercise Express and MongoDB using
uniquely named test databases; the existing test teardown drops those test
databases. Tests were run with the local MongoDB service, not against a
production database.

## Live browser evidence

- **Services:** this project's backend entry (`node src/server.js`) ran on port
  3001; Vite ran on port 5174 with
  `VITE_API_PROXY_TARGET=http://127.0.0.1:3001`. The default port-3000 process
  was not stopped or used.
- **Database:** isolated local QA database
  `expense_tracker_handover_2236715bc11b44b1b7ee6e19bd8ac8fa`. No real personal
  data was used.
- **Authentication:** registration and login worked; refreshing the dashboard
  restored the session. Invalid credentials showed the expected error.
- **Transactions:** created 11 records through the UI, observed 10 on page 1
  and 1 on page 2, searched and filtered by type/category, edited income from
  $200.00 to $201.00, and deleted the $1.00 `QA Expense 1` record.
- **Reports:** after the edit and deletion, actual API-backed dashboard totals
  were income **$201.00**, expenses **$167.45**, and net **$33.55**. Monthly
  totals showed October 2026; income was excluded from expense categories.
- **Ownership:** the second account had no transactions. Attempts to read,
  patch, or delete the first account's transaction returned 404.
- **Logout:** after logout, the protected transactions endpoint returned 401.
- **Responsive view:** at 390px viewport width, the dashboard and transactions
  page had no horizontal overflow.

The backend entry was launched as `node src/server.js` with per-process
development settings; this is the same entry point as `npm.cmd start`. The
documented `npm.cmd run dev` script was inspected in `package.json` but was not
used for the live browser run. The frontend was launched with
`npm.cmd --prefix frontend run dev -- --host 127.0.0.1 --port 5174`.

## Environment, data, and remaining limitations

- The `.env.example` template is present and contains a placeholder
  `SESSION_SECRET`; replace it before local use. No `.env` was present during
  this verification, so the developer's intended default database selection
  and secret were not verified.
- The local MongoDB daemon existed before the live test. The run used the
  isolated QA database named above. **That database was intentionally not
  dropped** because destructive database operations were prohibited. It
  contains only the temporary QA users and generated transaction data from
  this run.
- Only the backend and Vite processes started for this QA run were stopped.
  Port 3000's `node server.js`, the pre-existing Vite process on port 5173, and
  MongoDB were left untouched. Ports 3001 and 5174 no longer had QA listeners
  after the run.
- Git status/diff could not be verified: this workspace has no `.git`
  directory.
- No deployment, production-database test, automated browser E2E suite, or
  real-user-data test was performed. Browser E2E checks in this report were
  manual browser interactions; frontend Vitest results are mocked UI tests.

## Client sign-off

The eight requested handover criteria passed for this local QA run, subject to
the explicit limitations above. Before ordinary local development, create
`.env` from `.env.example`, set a private random session secret, and confirm
that `MONGODB_URI` selects the intended development database. Do not reuse the
QA database as a permanent or production database.
