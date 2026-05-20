# Node.js Backend Patterns — Fakturidias

Raw Node.js HTTP server (no Express). CommonJS. All patterns below are in force across `backend/`.

---

## 1. Router must await handlers

```js
// routes/router.js — ALWAYS await the handler
await route.handler(ctx);
```

Without `await`, async route errors become silent unhandled rejections. The server's catch block in `handleRequest` never sees them.

---

## 2. Body parsing — use `parseBody`, not the callback form

```js
const { parseBody } = require('../lib/utils');

// In any POST/PUT handler:
let body;
try { body = await parseBody(req); }
catch { return sendJson(res, 400, { error: 'Invalid request body' }); }
```

`parseBody` is a Promise wrapper around the existing `readJsonBody`. Never use the callback form directly in route handlers — it breaks async/await error propagation.

---

## 3. Route handlers are always `async`

```js
router.add('POST', '/api/something', async ({ req, res, userEmail }) => {
    // ...
});
```

Even read-only handlers should be `async` for consistency.

---

## 4. Service functions live in `lib/`, routes own HTTP

**lib/ functions:**
- Accept plain arguments (no `req`, no `res`)
- Return data on success
- Throw `Error` with `.statusCode` for expected failures (4xx/5xx), plain `Error` for 500

```js
// lib/someService.js
async function doSomething(param) {
    if (!param) {
        const err = new Error('param is required');
        err.statusCode = 400;
        throw err;
    }
    // ... do work ...
    return { result };
}
module.exports = { doSomething };
```

**routes/ files:**
- Call service, handle HTTP response
- Map `err.statusCode` to response status (default 500)

```js
// routes/something.js
const { doSomething } = require('../lib/someService');

router.add('POST', '/api/something', async ({ req, res }) => {
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

    if (!body.param) return sendJson(res, 400, { error: 'param is required' });

    try {
        const result = await doSomething(body.param);
        return sendJson(res, 200, { success: true, ...result });
    } catch (err) {
        return sendJson(res, err.statusCode || 500, { error: err.message });
    }
});
```

---

## 5. Error shape

Services throw structured errors:

```js
const err = new Error('Human-readable message');
err.statusCode = 502;   // optional — routes default to 500 without it
err.details  = '...';  // optional extra context
throw err;
```

Routes read `err.statusCode || 500` and forward `err.message` as `error` in the JSON body.

---

## 6. Validation at the route boundary

Routes validate required fields before calling services. Do not re-validate inside lib functions unless the function is also called from non-HTTP contexts.

```js
if (!body.invoice?.id) return sendJson(res, 400, { error: 'Invoice id is required' });
```

---

## 7. What NOT to put in lib/

- `req` / `res` references
- `sendJson` calls
- URL/query-string parsing

These belong in routes only. lib/ functions must be callable without an HTTP context.

---

## 8. File map

| Folder | Responsibility |
|--------|---------------|
| `lib/utils.js` | `sendJson`, `sendCors`, `parseBody`, `SECURITY_HEADERS`, `logDebug` |
| `lib/storage.js` | MongoDB + filesystem data access |
| `lib/auth.js` | Google OAuth flow (special: owns req/res for redirect handling) |
| `lib/*.js` | Pure service functions — no HTTP |
| `routes/router.js` | `createRouter()` — match + `await handler` |
| `routes/*.js` | Parse body → validate → call service → sendJson |
| `server.js` | Wire routers, session middleware, static file serving |
