# Expense Tracker

A personal expense tracker with a React/Vite frontend and an Express, MongoDB,
and Mongoose backend. Authentication uses a server-side session stored in
MongoDB and an HTTP-only cookie.

## Requirements

- Node.js 24 or newer
- npm
- MongoDB running locally, or a MongoDB URI for a development database

The backend and frontend are separate npm projects. Run their commands from the
workspace root as shown below.

## Local setup

1. Install backend dependencies:

   ```powershell
   npm.cmd install
   ```

2. Create a private backend environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Replace the `SESSION_SECRET` placeholder locally with a cryptographically
   random value. This command writes the value directly to `.env` and does not
   print it. It stops if the file no longer contains the expected placeholder:

   ```powershell
   node -e "const fs=require('node:fs');const crypto=require('node:crypto');const path='.env';const text=fs.readFileSync(path,'utf8');const placeholder='SESSION_SECRET=replace-this-with-a-random-secret-of-at-least-32-characters';if(!text.split(/\r?\n/).includes(placeholder))throw new Error('Expected SESSION_SECRET placeholder was not found');fs.writeFileSync(path,text.replace(placeholder,'SESSION_SECRET='+crypto.randomBytes(48).toString('hex')))"
   ```

   Do not commit `.env` or share its contents. `.env` is excluded by
   `.gitignore`. Set `MONGODB_URI` to a development database only; do not point
   local testing at production or a database containing personal data.

4. Install frontend dependencies:

   ```powershell
   npm.cmd --prefix frontend install
   ```

5. Start MongoDB, then start the backend and frontend in separate terminals:

   ```powershell
   npm.cmd run dev
   ```

   ```powershell
   npm.cmd --prefix frontend run dev
   ```

   The backend defaults to port `3000`; Vite defaults to port `5173` and
   proxies `/api` requests to `http://127.0.0.1:3000`. If that backend port is
   already in use, do not terminate an unknown process. Select a free backend
   port and point the Vite proxy at it with `VITE_API_PROXY_TARGET` in the
   frontend process environment. For example, use port 3001:

   ```powershell
   $env:PORT = "3001"
   npm.cmd run dev
   ```

   In the frontend terminal:

   ```powershell
   $env:VITE_API_PROXY_TARGET = "http://127.0.0.1:3001"
   npm.cmd --prefix frontend run dev
   ```

6. Open the URL printed by Vite (normally `http://localhost:5173`). Check
   backend readiness at `http://127.0.0.1:3000/api/health`.

## Environment variables

Backend settings are loaded from the root `.env` file by `dotenv`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production`. The session cookie is marked Secure in production. |
| `PORT` | No | `3000` | HTTP port for the backend; valid range is 1–65535. |
| `MONGODB_URI` | Yes | — | MongoDB connection URI. Use a dedicated development database for local work. |
| `SESSION_SECRET` | Yes | — | Random secret, at least 32 characters. The sample value in `.env.example` is a placeholder and must be replaced. |
| `TRUST_PROXY_HOPS` | No | `0` | Number of trusted proxy hops; configure only when the deployment topology is known. |
| `VITE_API_PROXY_TARGET` | No | `http://127.0.0.1:3000` | Frontend development-server proxy target for `/api`; set in the Vite process environment when the backend uses another port. |

The frontend calls relative `/api` URLs. In development, Vite proxies those
requests to the configured backend target. No API URL or authentication secret
is stored in browser local storage.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm.cmd start` | Start the backend without watch mode. |
| `npm.cmd run dev` | Start the backend with Node watch mode. |
| `npm.cmd test` | Run backend Node tests, including API integration tests. |
| `npm.cmd --prefix frontend run dev` | Start the Vite development server. |
| `npm.cmd --prefix frontend test` | Run frontend Vitest tests. |
| `npm.cmd --prefix frontend run build` | Create the frontend production build in `frontend/dist`. |
| `npm.cmd audit` | Audit backend dependencies. |
| `npm.cmd --prefix frontend audit` | Audit frontend dependencies. |

Backend integration tests require a local MongoDB at
`mongodb://127.0.0.1:27017`. They create uniquely named test databases and drop
those databases during teardown. Run tests only when that local MongoDB is a
test instance and you understand that test teardown behavior.

## API overview

All endpoints are under `/api`. JSON responses use a `data` field for normal
results; errors use an `error` object. Health is available without
authentication.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Readiness and MongoDB connection status. |
| `GET` | `/auth/csrf` | Obtain the CSRF token required by state-changing auth and transaction requests. |
| `POST` | `/auth/register` | Register with an email and password (minimum 12 characters). |
| `POST` | `/auth/login` | Authenticate and establish the session. |
| `GET` | `/auth/me` | Return the authenticated current user. |
| `POST` | `/auth/logout` | Destroy the current session. |
| `GET` | `/transactions` | List the current user's transactions with filters and pagination. |
| `POST` | `/transactions` | Create a transaction. |
| `GET` | `/transactions/:id` | Read one transaction owned by the current user. |
| `PATCH` | `/transactions/:id` | Update an owned transaction. |
| `DELETE` | `/transactions/:id` | Delete an owned transaction. |
| `GET` | `/reports/summary` | Income, expense, and net totals. |
| `GET` | `/reports/monthly` | UTC-month income and expense totals. |
| `GET` | `/reports/categories` | Expense-only totals grouped by category. |

Authentication uses a server-side session cookie. The browser client sends
credentials with API requests; state-changing requests use the CSRF token.
Transaction and report endpoints derive ownership from the authenticated
session; clients must not supply an owner ID.

Transaction amounts are integer minor units (for example, `1234` means `$12.34`
for USD), with a three-letter currency code. Transaction list query parameters
include `page`, `limit`, `sort`, `order`, `q`, `type`, `category`, `currency`,
`dateFrom`, `dateTo`, `minAmount`, and `maxAmount`. Pagination defaults to page
1 and 20 results, with a maximum page size of 100.

Report endpoints require a `currency` query parameter and accept optional
inclusive UTC date boundaries `from` and `to` in `YYYY-MM-DD` form. Monthly
grouping uses UTC months. Full request and response details for reports are
documented in [docs/reports-api.md](docs/reports-api.md).

## Test and QA guidance

- Frontend component tests use mocked API responses; they verify UI behavior,
  not a live backend connection.
- Backend Supertest integration tests exercise Express routes and MongoDB
  behavior against isolated test databases.
- For a live browser check, run the project's backend and Vite frontend, verify
  `/api/health`, and use only temporary test accounts and a dedicated local QA
  database. Do not use production databases or real personal information.
- There is no seed script. Create demo records through the application using
  disposable QA accounts, then remove only the explicitly identified QA data
  when finished.

## Troubleshooting

- **Port 3000 is already in use:** Do not kill an unidentified process. Start
  this backend on a known free port with `PORT`, and set
  `VITE_API_PROXY_TARGET` to `http://127.0.0.1:<that-port>` for Vite.
- **Health returns 503:** Confirm the backend's `MONGODB_URI` points to the
  intended development database and that MongoDB is running and reachable.
- **Backend refuses to start:** Confirm `MONGODB_URI` is a MongoDB URI and
  `SESSION_SECRET` is present, random, and at least 32 characters.
- **Frontend API requests fail:** Check that the backend health endpoint works
  and that Vite's proxy target matches the backend port. Restart Vite after
  changing its process environment.
- **Session requests fail:** Use the frontend's same-origin `/api` proxy so
  cookies and CSRF tokens are sent as expected. In production, HTTPS is
  required for the Secure session cookie.

## Handover status

The project has automated backend and frontend tests and a production frontend
build. A live end-to-end run is environment-specific and must be recorded
separately from mocked frontend tests. Confirm the active backend process,
database target, secret configuration, dependency audit, and live browser
workflow in the handover checklist before client sign-off.

See [docs/handover.md](docs/handover.md) for the latest recorded verification,
evidence, and outstanding environment limitations.
