# Finance Tracker

A production-ready personal finance tracker built with **Node.js + Express + MongoDB + React**.

## Structure

```
Finance-Tracker/
├── client/          # React (Vite) frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Shared UI (Modal, Toast, Badge…)
│   │   │   ├── Auth.jsx
│   │   │   ├── Workspace.jsx
│   │   │   ├── Overview.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Budgets.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Alerts.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── server/          # Express + Mongoose backend
    ├── src/
    │   ├── routes/
    │   ├── models/
    │   ├── middleware/
    │   ├── services/
    │   ├── utils/
    │   ├── app.js
    │   ├── config.js
    │   └── index.js
    ├── tests/
    ├── uploads/
    ├── package.json
    └── .env.example
```

## Quick Start

```bash
# 1. Clone and enter the project
cd Finance-Tracker

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env — set MONGO_URL and JWT_SECRET

# 4. Start development servers
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/transactions` | Transactions |
| POST | `/api/transactions/import-csv` | CSV import |
| GET/POST | `/api/budgets` | Budgets |
| POST | `/api/budgets/check-overruns` | Budget alerts |
| GET | `/api/reports/dashboard` | Dashboard data |
| GET | `/api/reports/monthly` | Monthly trend |
| GET | `/api/reports/ai-insight` | AI insight (Groq) |
| GET/PATCH/DELETE | `/api/notifications` | Alerts |
| GET/PUT | `/api/profile` | Profile |
| PUT | `/api/profile/password` | Change password |
| GET | `/api/currencies` | Supported currencies |

## Environment Variables

See `server/.env.example` for all required and optional variables.

### Required
- `MONGO_URL` — MongoDB connection string
- `JWT_SECRET` — Long random secret (use `openssl rand -hex 64`)

### Optional
- `GROQ_API_KEY` — Enables AI financial insights (free at console.groq.com)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
