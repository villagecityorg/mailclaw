---
name: mailclaw
description: Read, search, and manage emails from the MailClaw inbox API. Use when the user asks to check emails, read messages, search inbox, find emails from a sender, or review recent correspondence.
allowed-tools: Bash(curl *), Read, Write, WebFetch
---

# MailClaw - Email Inbox API

You have access to the MailClaw email inbox API. Use it to read, search, and manage emails.

## Configuration

Before making any API calls, read the config file at `~/.mailclaw/config.json`:

```json
{
  "host": "https://mailclaw.example.com",
  "api_token": "your-api-token-here"
}
```

- If the file does not exist or is missing fields, ask the user to provide their **MailClaw Host** (e.g., `https://mailclaw.example.com`) and **API Token**.
- Once the user provides them, create `~/.mailclaw/config.json` with the values and proceed.
- All `/api/emails*` endpoints require the header: `Authorization: Bearer <api_token>`

## Available Endpoints

### List emails (metadata only)

```
GET <host>/api/emails
```

Returns email summaries without body content. Use this for overview and browsing.

Query parameters:
- `limit` (number, default 20, max 100) — Page size
- `offset` (number, default 0) — Pagination offset
- `from` (string) — Filter by sender address (exact match)
- `to` (string) — Filter by recipient address (exact match)
- `q` (string) — Search keyword in subject and body
- `after` (string) — Emails after this date (ISO 8601 like `2026-03-01` or Unix timestamp)
- `before` (string) — Emails before this date (ISO 8601 or Unix timestamp)

All filter parameters can be combined.

### Export emails (with full content)

```
GET <host>/api/emails/export
```

Same parameters as list, but response includes `text_content` and `html_content`. Use this when the user wants to read email bodies.

### Get single email

```
GET <host>/api/emails/:id
```

Returns full email content including body. Use after identifying an email from the list.

### Delete email

```
DELETE <host>/api/emails/:id
```

Permanently deletes an email. Always confirm with the user before deleting.

### Health check

```
GET <host>/api/health
```

No authentication required. Use this to verify the host is correct during initial setup.

## Response Format

All responses follow this structure:

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Email object (list)

```json
{
  "id": "clx...",
  "from_address": "sender@example.com",
  "to_address": "bd@example.com",
  "subject": "Subject line",
  "received_at": 1710000000,
  "has_attachments": false,
  "attachment_count": 0
}
```

### Email object (export / detail)

Same as above, plus:
```json
{
  "text_content": "Plain text body...",
  "html_content": "<p>HTML body...</p>"
}
```

### Paginated response

```json
{
  "emails": [ ... ],
  "total": 128,
  "limit": 20,
  "offset": 0
}
```

## Usage Examples

Replace `$HOST` and `$TOKEN` with values from `~/.mailclaw/config.json`.

```bash
# List all recent emails
curl -s -H "Authorization: Bearer $TOKEN" "$HOST/api/emails" | jq .

# Search emails containing "partnership"
curl -s -H "Authorization: Bearer $TOKEN" "$HOST/api/emails?q=partnership" | jq .

# Filter by recipient and sender
curl -s -H "Authorization: Bearer $TOKEN" "$HOST/api/emails?to=bd@example.com&from=partner@company.com" | jq .

# Get emails from the last 7 days
curl -s -H "Authorization: Bearer $TOKEN" "$HOST/api/emails?after=2026-03-03" | jq .

# Export emails with full content
curl -s -H "Authorization: Bearer $TOKEN" "$HOST/api/emails/export?limit=10" | jq .

# Read a specific email
curl -s -H "Authorization: Bearer $TOKEN" "$HOST/api/emails/clx123abc" | jq .

# Delete an email
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$HOST/api/emails/clx123abc" | jq .
```

## Limitations

MailClaw is **receive-only**. Replying to or sending emails is not supported. If the user asks to send or reply to an email, inform them that this feature is not yet available because Cloudflare Email Sending is still in beta (waitlist). It will be supported once the feature becomes generally available.

## Guidelines

1. **Read config first** — Always read `~/.mailclaw/config.json` before making API calls. If it doesn't exist, ask the user for host and token, then save the config.
2. **Verify on first use** — After saving a new config, call `GET <host>/api/health` to verify the host is reachable.
3. **Start with list** — Use `GET /api/emails` first to get an overview, then drill into specific emails with `GET /api/emails/:id`.
4. **Use filters** — Always apply relevant filters (`from`, `to`, `q`, date range) rather than fetching everything.
5. **Prefer text_content** — When displaying email content to the user, prefer `text_content` over `html_content` for readability.
6. **Pagination** — For large inboxes, paginate through results using `limit` and `offset`.
7. **Confirm deletes** — Always ask the user for confirmation before deleting emails.
8. **Date formatting** — The `received_at` field is a Unix timestamp in seconds. Convert it to a human-readable format when presenting to the user.
9. **Pipe to jq** — When using curl in Bash, pipe output through `jq .` for readable formatting.
