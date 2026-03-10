# MailClaw

Cloudflare Workers email inbox service. Receives emails via Email Routing (catch-all), stores in D1, exposes token-protected REST API for AI agents.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js + TypeScript
- **Database**: Cloudflare D1
- **Email Parsing**: postal-mime + html-to-text
- **Package Manager**: Bun
- **Linter/Formatter**: Biome (tabs, double quotes, semicolons, 100 char width)

## Scripts

- `bun run dev` — Local dev (remote mode)
- `bun run deploy` — Deploy to Cloudflare
- `bun run tsc` — Type check
- `bun run check` — Biome lint + format check
- `bun run db:create` — Create D1 database
- `bun run db:tables` — Apply schema
- `bun run db:indexes` — Apply indexes

## Project Structure

```
src/
├── index.ts           # Worker entry (fetch + email handlers)
├── app.ts             # Hono app setup, middleware, routes
├── env.d.ts           # CloudflareBindings secret extensions
├── types.ts           # TypeScript types
├── middleware/auth.ts  # Bearer token auth
├── routes/emails.ts    # Email CRUD + export endpoints
├── routes/health.ts    # Health check
├── database/d1.ts      # All D1 query functions
├── handlers/email.ts   # Email Routing handler (parse + store)
└── utils/              # http, helpers, mail processing
```

## API Endpoints

All `/api/emails*` routes require `Authorization: Bearer <token>`.

- `GET /api/emails` — List (metadata only, paginated)
- `GET /api/emails/export` — List with full content (paginated)
- `GET /api/emails/:id` — Single email detail
- `DELETE /api/emails/:id` — Delete email
- `GET /api/health` — Health check (no auth)

### Filter params (for list + export)

`from`, `to`, `q` (keyword), `after`, `before` (date), `limit`, `offset`
