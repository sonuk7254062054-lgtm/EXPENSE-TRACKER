# Expense Tracker

> EXPENSE-TRACKER

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
| `NODE_ENV` | No | `development` | `development`, `test`, or `production`. Production cookies are Secure and use `SameSite=None` for the separate Vercel and Render origins. |
| `PORT` | No | `3000` | HTTP port for the backend; valid range is 1–65535. |
| `MONGODB_URI` | Yes | — | MongoDB connection URI. Use a dedicated development database for local work. |
| `SESSION_SECRET` | Yes | — | Random secret, at least 32 characters. The sample value in `.env.example` is a placeholder and must be replaced. |
| `TRUST_PROXY_HOPS` | No | `0` | Number of trusted proxy hops; configure only when the deployment topology is known. |
| `FRONTEND_ORIGIN` | Production | — | Exact HTTPS origin of the deployed frontend, such as `https://expense-tracker.vercel.app`; no path or trailing slash. Required in production and used as the sole allowed cross-origin browser origin. |
| `VITE_API_PROXY_TARGET` | No | `http://127.0.0.1:3000` | Frontend development-server proxy target for `/api`; set in the Vite process environment when the backend uses another port. |
| `VITE_API_BASE_URL` | Vercel build | `/api` | Absolute deployed API base URL including `/api`, for example `https://expense-tracker-api.onrender.com/api`. Leave unset for local development. |

The frontend calls relative `/api` URLs. In development, Vite proxies those
requests to the configured backend target. A production build can set
`VITE_API_BASE_URL` to call the separate backend origin. No API URL or
authentication secret is stored in browser local storage.

## Production deployment preparation

The project is structured for a Vercel frontend, Render Node web service, and
MongoDB Atlas database. Configure the hosting dashboards as follows:

### Verified production deployment

- Frontend: <https://expense-tracker-pi-nine-66.vercel.app>
- Backend: <https://expense-tracker-api-zt0w.onrender.com>
- Health check: <https://expense-tracker-api-zt0w.onrender.com/api/health>
  returns HTTP 200 with `{"status":"ok","database":"connected"}`.

The live application was checked for registration, login, session persistence
after refresh, transaction creation/edit/deletion, reports, and logout using
synthetic test data. The test transaction was deleted. The deployed frontend
domain is the Vercel domain shown above; use this exact origin in Render.

| Service | Root / setting | Value |
| --- | --- | --- |
| Vercel | Root directory | `frontend` |
| Vercel | Build command | `npm run build` |
| Vercel | Output directory | `dist` |
| Vercel | Environment variable | `VITE_API_BASE_URL=https://expense-tracker-api-zt0w.onrender.com/api` |
| Vercel | SPA fallback | `frontend/vercel.json` routes client-side paths to `/index.html` because the Vercel root directory is `frontend` |
| Render | Root directory | Repository root (`.`) |
| Render | Build command | `npm ci` |
| Render | Start command | `npm start` |
| Render | Health check path | `/api/health` |
| Render | `NODE_ENV` | `production` |
| Render | `PORT` | Set by Render; do not hard-code |
| Render | `TRUST_PROXY_HOPS` | `1` for the Render reverse-proxy hop; confirm against the service topology |
| Render | `MONGODB_URI` | Atlas connection URI for a dedicated production database; store only in Render's secret environment settings |
| Render | `SESSION_SECRET` | Independently generated random secret of at least 32 characters; store only in Render's secret environment settings |
| Render | `FRONTEND_ORIGIN` | `https://expense-tracker-pi-nine-66.vercel.app` |

Provision the Atlas cluster and a dedicated database user with only the
permissions the application needs on that database. Add the Render service's
outbound IP addresses (or a dedicated static outbound IP, if required by the
selected Render plan) to the Atlas IP access list. Do not use `0.0.0.0/0`.
Use Atlas' generated `mongodb+srv://` URI and keep its password out of Git,
Vercel, and the browser; set it only as Render's `MONGODB_URI`.

The backend accepts Render's injected `PORT`, connects to MongoDB before
listening, and reports readiness at `/api/health`. In production, startup
requires `FRONTEND_ORIGIN` to be a path-free HTTPS origin. CORS allows only
that exact origin and credentialed requests; production session cookies are
HTTP-only, Secure, and `SameSite=None` so browsers can send them across the
Vercel/Render origins. The frontend must use `credentials: include`, as the
existing API client does. The default `vercel.app` and `onrender.com` domains
are cross-site. Registration, login, and session persistence were verified in
the deployment browser, but stricter browser third-party-cookie protections
may still block sessions for some users even with `SameSite=None`. If that
occurs, use custom frontend and API domains under the same registrable domain
(for example `app.example.com` and `api.example.com`) or configure a
same-origin proxy. Keep Vercel preview deployments out of production access
unless their exact origins are intentionally configured.

After setting environment variables, deploy the backend first, confirm
`https://<render-service-host>/api/health` returns HTTP 200 with database
status `connected`, then set the Vercel API base URL and deploy the frontend.
Verify registration, login, session persistence, logout, and a transaction
create/list/update/delete workflow on the public URLs before calling the app
deployed. Do not use the local `.env` or local database URI in either provider.

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
