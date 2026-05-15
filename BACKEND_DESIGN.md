# Backend Design - Robust Architecture

## Goals

- Predictable API behavior with explicit method handling.
- Better security defaults (headers, bounded payload size, controlled CORS).
- Safer operations with payload validation.
- Traceability with per-request IDs.
- Operational health visibility with a health endpoint.
- Basic abuse protection via in-memory rate limiting.

## Current Runtime

- Runtime: Node.js HTTP server (no Express).
- Entry points:
  - `server.js` (root compatibility wrapper)
  - `backend/server.js` (actual backend implementation)
- Serverless adapter: `api/index.js`
- Domain modules:
  - `backend/lib/auth.js`
  - `backend/lib/storage.js`
  - `backend/lib/ares.js`
  - `backend/lib/drive.js`
- HTTP helpers: `backend/lib/utils.js`
- Validation layer: `backend/lib/validators.js`

## Folder Structure

```txt
.
|-- server.js                  # wrapper -> backend/server.js
|-- backend/
|   |-- server.js
|   |-- middleware/
|   |   |-- rateLimit.js
|   |   `-- session.js
|   |-- routes/
|   |   |-- health.js
|   |   |-- ares.js
|   |   |-- auth.js
|   |   |-- api.js
|   |   |-- api/
|   |   |   |-- index.js
|   |   |   |-- helpers.js
|   |   |   |-- invoices.js
|   |   |   |-- customers.js
|   |   |   |-- items.js
|   |   |   |-- settings.js
|   |   |   |-- drive.js
|   |   |   `-- email.js
|   |   `-- static.js
|   `-- lib/
|       |-- utils.js
|       |-- validators.js
|       |-- storage.js
|       |-- auth.js
|       |-- ares.js
|       `-- drive.js
|-- lib/                       # wrapper modules -> backend/lib/*
|-- api/
|   `-- index.js               # serverless wrapper -> ../server
```

## Request Flow

1. Request enters `requestHandler` in `backend/server.js`.
2. Request ID is attached (`X-Request-Id` header).
3. Rate limiting middleware gate runs for `/api` and `/auth` routes.
4. Session middleware is applied.
5. Dispatcher runs in this order:
6. health route
7. ARES route
8. auth route
9. business API route
10. static route
11. Business API route dispatches again by resource in `routes/api/index.js`.
12. Route-level validation is applied in `routes/api/*.js` modules.
13. Response includes security headers and request ID.

## Security Hardening

### 1) Headers

All responses now include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Request-Id`

### 2) CORS

- Default is permissive for compatibility (`*`) when `CORS_ORIGINS` is unset.
- Production recommendation: set explicit allowlist via `CORS_ORIGINS`.

Example:

```bash
CORS_ORIGINS=https://your-app.vercel.app,https://admin.your-app.com
```

### 3) Payload Size Limits

`readJsonBody` now enforces max size. Route-specific limits are used:

- Invoice write: 2 MB
- Drive backup payload: 15 MB
- Other write endpoints: 512 KB

### 4) Rate Limiting

In-memory limiter for `/api` and `/auth`:

- `RATE_LIMIT_WINDOW_MS` (default: 60000)
- `RATE_LIMIT_MAX` (default: 240)

This is process-local and simple by design. For multi-instance deployments, replace with Redis-backed limiter.

## Reliability and API Discipline

### 1) Method Enforcement

Every known endpoint now returns `405 Method Not Allowed` for unsupported methods with an `Allow` hint.

### 2) Health Endpoint

`GET /healthz` returns:

- service status
- uptime
- MongoDB connectivity status
- request ID

### 3) API Version Alias

`/api/v1/*` is accepted as an alias and normalized to `/api/*`.

## Validation Layer

Implemented in `lib/validators.js`:

- `validateInvoice`
- `validateCustomer`
- `validateItem`
- `validateSettings`
- `validateDriveBackupPayload`

These protect writes from malformed data and return a clear validation error payload.

## Environment Variables

### Existing

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `SESSION_SECRET`
- `SESSION_SECRET_2`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### New / Recommended

- `CORS_ORIGINS` (recommended in production)
- `MAX_BODY_BYTES` (global default fallback)
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

## Deployment Notes

- Keep secrets out of repo and in deployment secret manager.
- Use explicit `CORS_ORIGINS` in production.
- Use HTTPS in production (already assumed by cookie-session `secure` logic).
- If horizontal scaling is enabled, replace in-memory limiter with shared storage (Redis).

## Refinement Notes (Impeccable-Style)

The local impeccable CLI currently does not expose backend shaping in this environment (`Warning: cannot access shape`), so the same design principles were applied manually to backend architecture:

1. Single-responsibility route modules (`invoices`, `customers`, `items`, `settings`, `drive`, `email`).
2. Shared helper layer for auth/validation response behavior.
3. Thin composition at `routes/api/index.js` and `backend/server.js`.
4. Stable compatibility wrappers preserved at root.

## Next Robustness Steps

1. Replace in-memory rate limiter with Redis.
2. Add structured logging sink (JSON logs with request IDs).
3. Add integration tests for API contracts and validation failures.
4. Add schema-level validation for nested invoice fields in Mongo models.
5. Add centralized error taxonomy with stable error codes.
