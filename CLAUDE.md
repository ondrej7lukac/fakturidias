# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a monorepo for **Fakturidias** — a Czech/Slovak invoice management app. It has two distinct layers:

- **Backend** (`backend/server.js` + `backend/lib/`): A raw Node.js HTTP server (no Express framework). CommonJS (`require`). Runs on port 5500.
- **Frontend** (`invoice-react/`): React 18 + Vite 6 + TypeScript. Builds to `dist/` at the repo root.

In production, `backend/server.js` serves the built static files from `dist/` and handles all API routes. In development, Vite runs on port 3000 and proxies `/api` and `/auth` to `http://localhost:5500`.

## Commands

### Root (backend)
```bash
npm start              # Run backend: node backend/server.js (port 5500)
npm run build          # Install frontend deps and build (outputs to dist/)
```

### Frontend (`invoice-react/`)
```bash
npm run dev            # Vite dev server on port 3000
npm run build          # TypeScript + Vite build → dist/ (must be zero TS errors)
npm run preview        # Preview production build
```

### Full local development
```bash
# Terminal 1
node backend/server.js

# Terminal 2
cd invoice-react && npm run dev
```

### Docker
```bash
docker build -t fakturidias .
docker run -p 5500:5500 --env-file .env fakturidias
```

## Environment Variables

Copy `.env.example` to `.env`. Required keys:

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `SESSION_SECRET` / `SESSION_SECRET_2` | Cookie session signing keys (required in production) |
| `MONGODB_URI` | MongoDB connection string (optional — falls back to local JSON files) |
| `RESEND_API_KEY` | Email delivery via Resend |
| `VERTEX_PROJECT_ID` / `VERTEX_LOCATION` / `GOOGLE_APPLICATION_CREDENTIALS` | Gemini AI invoice parsing via Vertex AI |

## Backend Structure (`backend/lib/`)

Each file in `backend/lib/` is a focused module required by `backend/server.js`:

| Module | Purpose |
|---|---|
| `auth.js` | Google OAuth2 flow; session-based auth (`req.session.userEmail`) |
| `storage.js` | Dual-mode persistence — MongoDB via Mongoose when `MONGODB_URI` is set, otherwise flat JSON files in `data/<userEmail>/` |
| `ares.js` | Czech company registry (ARES) lookup |
| `slovakRpo.js` | Slovak company registry (RPO) lookup |
| `email.js` | Invoice delivery via Resend |
| `gemini.js` | AI invoice parsing via Vertex AI / Gemini |
| `vies.js` | EU VAT number validation |
| `exchangeRate.js` | Currency exchange rates |
| `peppol.js` | Peppol BIS 3.0 XML export |
| `drive.js` | Google Drive invoice backup |
| `utils.js` | `sendJson`, `sendCors`, `sendNotFound`, `readJsonBody`, `logDebug` |

**Auth model**: All `/api/*` routes (except `/api/ares/*`, `/api/rpo/*`, `/api/vat/*`, `/api/exchange-rate`, `/api/ai/*`) require `req.session.userEmail`. The session is set during Google OAuth callback.

**Storage fallback**: When MongoDB is unavailable, data is stored in `data/<sanitized-email>/invoices.json`, `customers.json`, `items.json`, `settings.json`. On first MongoDB connect with existing local data, it auto-migrates.

## Deployment

- **Railway**: `railway.json` selects the `Dockerfile` builder; health check on `/health`. Env vars are set in the Railway service Variables tab. `VITE_*` vars are declared as `ARG`s in the Dockerfile so they reach the Vite build.
- **Docker / self-hosted**: `Dockerfile` builds the frontend then runs `node backend/server.js`. Pass `VITE_GA4_ID` / `VITE_CLARITY_ID` as `--build-arg`s.
- **Vite build output**: Always goes to `dist/` at the repo root (configured in `invoice-react/vite.config.ts` → `build.outDir: '../dist'`).

## Frontend — see `invoice-react/CLAUDE.md`

The frontend has its own detailed CLAUDE.md at `invoice-react/CLAUDE.md`. Key points:

- Icons always via `@/lib/icons` (never import `lucide-react` directly)
- CSS is modular: each component has its own `.css` file; no styles in `index.css` or `globals.css`
- All CSS values use `var(--token)` design tokens from `src/styles/utilities.css`
- Language (`cs`/`en`) flows as a prop from `App.tsx` down — no context/i18n library
- Vite dev server runs on port **3000** (not 5173 as some docs say — `vite.config.ts` sets `port: 3000`)

## Vite Dev Proxy

In dev, `vite.config.ts` has a custom `aresProxyPlugin` that directly calls `ares.gov.cz` — so the ARES search works without the backend running. All other `/api` and `/auth` requests proxy to `http://localhost:5500`.
