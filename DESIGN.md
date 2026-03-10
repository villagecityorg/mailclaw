# MailClaw - Design Document

## Overview

MailClaw is a Cloudflare Workers-based email inbox service that receives emails via Cloudflare Email Routing (catch-all), stores them in D1, and exposes a token-protected REST API for reading, searching, and exporting emails. Designed to be consumed by AI agents (e.g., Claude Code Skills, OpenClaw) for automated email processing.

## Cloudflare Services

| Service | Purpose | Required |
|---|---|---|
| **Workers** | HTTP API + Email handler | Yes |
| **Email Routing** | Catch-all `*@domain.com` → Worker | Yes |
| **D1 Database** | Email metadata + content storage | Yes |
| **R2 Storage** | Attachment file storage | Optional (Phase 2) |

## Architecture

```
Sender → Cloudflare Email Routing (catch-all) → Worker (email handler)
                                                     ↓
                                                postal-mime parse
                                                     ↓
                                                D1 (store email)

AI Agent → HTTP API (Bearer Token) → Worker (fetch handler) → D1 (query)
```

## Database Schema

### `emails` table

| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | CUID2 unique identifier |
| `from_address` | TEXT NOT NULL | Sender email address |
| `to_address` | TEXT NOT NULL | Recipient email address |
| `subject` | TEXT | Email subject line |
| `received_at` | INTEGER NOT NULL | Unix timestamp (seconds) |
| `html_content` | TEXT | Original HTML body |
| `text_content` | TEXT | Plain text body |
| `has_attachments` | BOOLEAN | Whether email has attachments |
| `attachment_count` | INTEGER | Number of attachments |

### Indexes

- `(to_address, received_at DESC)` — filter by recipient, sort by date
- `(from_address, received_at DESC)` — filter by sender
- `(received_at DESC)` — date range queries
- `(subject)` — subject search (LIKE queries)

## API Design

### Authentication

All endpoints require `Authorization: Bearer <token>` header. Token is stored as a Cloudflare Worker secret (`API_TOKEN`).

### Endpoints

#### `GET /api/emails`

List emails with metadata only (no body content). Supports filtering and pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 20 | Page size (max 100) |
| `offset` | number | 0 | Pagination offset |
| `from` | string | — | Filter by sender address (exact match) |
| `to` | string | — | Filter by recipient address (exact match) |
| `q` | string | — | Keyword search in subject + text_content |
| `after` | string | — | Emails after this date (ISO 8601 or Unix timestamp) |
| `before` | string | — | Emails before this date (ISO 8601 or Unix timestamp) |

**Response:**

```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "clx...",
        "from_address": "partner@company.com",
        "to_address": "bd@example.com",
        "subject": "Partnership Inquiry",
        "received_at": 1710000000,
        "has_attachments": false,
        "attachment_count": 0
      }
    ],
    "total": 128,
    "limit": 20,
    "offset": 0
  }
}
```

#### `GET /api/emails/export`

Export emails with full body content. Same query parameters as `GET /api/emails`.

**Response:**

```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "clx...",
        "from_address": "partner@company.com",
        "to_address": "bd@example.com",
        "subject": "Partnership Inquiry",
        "received_at": 1710000000,
        "has_attachments": false,
        "attachment_count": 0,
        "text_content": "Hello, we would like to...",
        "html_content": "<p>Hello, we would like to...</p>"
      }
    ],
    "total": 128,
    "limit": 20,
    "offset": 0
  }
}
```

#### `GET /api/emails/:id`

Get a single email with full content.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "from_address": "partner@company.com",
    "to_address": "bd@example.com",
    "subject": "Partnership Inquiry",
    "received_at": 1710000000,
    "text_content": "Hello, we would like to...",
    "html_content": "<p>Hello, we would like to...</p>",
    "has_attachments": false,
    "attachment_count": 0
  }
}
```

#### `DELETE /api/emails/:id`

Delete a single email.

#### `GET /api/health`

Health check endpoint (no auth required).

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Language**: TypeScript
- **Validation**: Zod
- **Email Parsing**: postal-mime
- **HTML to Text**: html-to-text
- **ID Generation**: @paralleldrive/cuid2
- **Package Manager**: Bun
- **Linter/Formatter**: Biome

## Project Structure

```
src/
├── index.ts              # Worker entry point (email, fetch)
├── app.ts                # Hono app setup with auth middleware
├── middleware/
│   └── auth.ts           # Bearer token authentication
├── routes/
│   ├── emails.ts         # Email list, export, detail, delete
│   └── health.ts         # Health check
├── database/
│   └── d1.ts             # D1 query functions
├── handlers/
│   └── email.ts          # Cloudflare Email Routing handler
├── utils/
│   ├── http.ts           # Response helpers (OK, ERR)
│   ├── mail.ts           # Email content processing
│   └── helpers.ts        # Utility functions
└── types.ts              # TypeScript type definitions

sql/
├── schema.sql            # Table definitions
└── indexes.sql           # Index definitions
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API token"
  }
}
```

## Configuration

### Environment Variables (wrangler.jsonc `vars`)

None required for initial setup.

### Secrets (wrangler secret)

| Secret | Description |
|---|---|
| `API_TOKEN` | Bearer token for API authentication |

### Cloudflare Bindings

| Binding | Type | Description |
|---|---|---|
| `D1` | D1Database | Email storage database |
