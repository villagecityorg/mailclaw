# MailClaw

A Cloudflare Workers-based email inbox service. Receives all emails sent to `*@yourdomain.com` via catch-all Email Routing, stores them in D1, and exposes a token-protected REST API for reading and searching emails.

Built to be consumed by AI agents (Claude Code, OpenClaw, etc.) for automated email processing.

## Features

- **Catch-all inbox** — Receive emails to any address on your domain
- **Full-text search** — Search emails by keyword in subject and body
- **Flexible filtering** — Filter by sender, recipient, date range
- **Export API** — Paginated export with full email content
- **Token authentication** — All API endpoints protected with Bearer token
- **Edge computing** — Runs on Cloudflare's global network

## Tech Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — Runtime
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — SQLite database
- [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) — Email receiving
- [Hono](https://hono.dev/) — Web framework
- [postal-mime](https://github.com/nicbn/postal-mime) — Email parsing
- [Bun](https://bun.sh/) — Package manager

## Prerequisites

- [Bun](https://bun.sh/) installed
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) with Workers access
- A domain added to Cloudflare with Email Routing enabled

## Deployment

### 1. Clone and install

```bash
git clone https://github.com/missuo/mailclaw
cd mailclaw
bun install
```

### 2. Authenticate with Cloudflare

```bash
bunx wrangler login
```

### 3. Create D1 database

```bash
bun run db:create
```

This will output a database ID. Copy it.

### 4. Update wrangler config

Edit `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_DATABASE_ID` with the ID from step 3:

```jsonc
"d1_databases": [
  {
    "binding": "D1",
    "database_name": "mailclaw-d1",
    "database_id": "your-database-id-here"
  }
]
```

### 5. Initialize database

```bash
bun run db:tables
bun run db:indexes
```

### 6. Set API token

Generate a secure token and set it as a Worker secret:

```bash
# Generate a random token
openssl rand -hex 32

# Set it as a secret
bunx wrangler secret put API_TOKEN
```

Save this token — you'll need it to authenticate API requests.

### 7. Deploy

```bash
bun run deploy
```

Note the Worker URL from the output (e.g., `https://mailclaw.<your-subdomain>.workers.dev`).

### 8. Configure Email Routing

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain
3. Navigate to **Email** > **Email Routing** > **Routing rules**
4. Under **Catch-all address**, click **Edit**
5. Set action to **Send to a Worker**
6. Select the `mailclaw` worker
7. Save

All emails sent to `*@yourdomain.com` will now be received by MailClaw.

## API Reference

All `/api/emails*` endpoints require the `Authorization` header:

```
Authorization: Bearer <your-api-token>
```

### List emails

```
GET /api/emails
```

Returns email metadata (no body content). Supports pagination and filtering.

**Query parameters:**

| Parameter | Type   | Default | Description                                     |
| --------- | ------ | ------- | ----------------------------------------------- |
| `limit`   | number | 20      | Page size (1-100)                               |
| `offset`  | number | 0       | Pagination offset                               |
| `from`    | string | —       | Filter by sender (exact match)                  |
| `to`      | string | —       | Filter by recipient (exact match)               |
| `q`       | string | —       | Search keyword in subject and body              |
| `after`   | string | —       | Emails after date (ISO 8601 or Unix timestamp)  |
| `before`  | string | —       | Emails before date (ISO 8601 or Unix timestamp) |

**Example:**

```bash
# List recent emails
curl -H "Authorization: Bearer $TOKEN" \
  "https://mailclaw.example.com/api/emails"

# Filter by sender and date range
curl -H "Authorization: Bearer $TOKEN" \
  "https://mailclaw.example.com/api/emails?from=partner@company.com&after=2026-03-01"

# Search by keyword
curl -H "Authorization: Bearer $TOKEN" \
  "https://mailclaw.example.com/api/emails?q=partnership"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "clx...",
        "from_address": "partner@company.com",
        "to_address": "bd@yourdomain.com",
        "subject": "Partnership Inquiry",
        "received_at": 1710000000,
        "has_attachments": false,
        "attachment_count": 0
      }
    ],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

### Export emails (with content)

```
GET /api/emails/export
```

Same parameters as list, but includes `text_content` and `html_content` in the response.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://mailclaw.example.com/api/emails/export?limit=10"
```

### Get single email

```
GET /api/emails/:id
```

Returns full email including body content.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://mailclaw.example.com/api/emails/clx123abc"
```

### Delete email

```
DELETE /api/emails/:id
```

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://mailclaw.example.com/api/emails/clx123abc"
```

### Health check

```
GET /api/health
```

No authentication required.

```bash
curl "https://mailclaw.example.com/api/health"
```

## AI Agent Skills

MailClaw ships with a built-in [skill](https://agentskills.io) that lets AI agents (Claude Code, OpenClaw, etc.) read and manage your inbox.

### Add to Claude Code

```bash
npx skills add https://github.com/missuo/mailclaw
```

On first use, the skill will ask you for your **MailClaw Host** and **API Token**, then save them to `~/.mailclaw/config.json` for future sessions.

Once installed, you can use natural language like:

- "Check my recent emails"
- "Search emails from partner@company.com"
- "Read the latest email about partnership"
- "Show me all emails sent to bd@uid.si this week"

The skill will automatically use the MailClaw API to fetch and display results.

### Add to other AI agents

The skill definition is located at `skills/mailclaw/SKILL.md`. You can copy or adapt it for any AI agent framework that supports markdown-based skill definitions.

## Limitations

MailClaw currently supports **receiving and reading** emails only. Replying to and sending emails are not yet supported because [Cloudflare Email Sending](https://developers.cloudflare.com/email-routing/email-workers/send-emails/) is still in beta with a waitlist. We will add send/reply support once the feature becomes generally available.

## Local Development

Create a `.dev.vars` file for local secrets:

```
API_TOKEN=dev-token-here
```

Start the dev server:

```bash
bun run dev
```

## License

MIT
