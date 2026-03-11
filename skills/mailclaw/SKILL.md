---
name: mailclaw
description: Read, search, and manage emails from the MailClaw inbox via the local CLI. Use when the user asks to check emails, read messages, search inbox, find emails from a sender, or review recent correspondence.
allowed-tools: Bash(mailclaw *), Bash(brew *), Bash(curl *), Bash(wget *), Bash(chmod *), Bash(uname *)
---

# MailClaw - Binary CLI

You have access to the local `mailclaw` binary CLI. Use it to read, search, and manage emails. Do not call the MailClaw HTTP API directly with `curl` unless the user explicitly asks for raw API requests.

By default, if `mailclaw` is missing, install it automatically and then continue the task.

## Prerequisite

Before doing anything else, verify the CLI exists:

```bash
mailclaw --version
```

- If `mailclaw` is missing on macOS, install it with Homebrew.
- If `mailclaw` is missing on Linux, download the latest release binary and install it to `/usr/local/bin/mailclaw`.
- On Windows, do not guess an install flow here. Ask the user to install the CLI manually or provide the binary path.
- Once the binary is available, use it for all inbox operations.

### Automatic install flow

1. Detect the platform with `uname -s` and `uname -m`.
2. If the system is `Darwin`, install with Homebrew:

```bash
brew tap owo-network/brew
brew install owo-network/brew/mailclaw
```

3. If the system is `Linux`, fetch the latest release tag with `curl`, map the architecture to the release target, download the binary with `wget`, put it in `/usr/local/bin/mailclaw`, and mark it executable:

```bash
ARCH="$(uname -m)"
TAG="$(curl -fsSL https://api.github.com/repos/missuo/mailclaw/releases/latest | sed -n 's/.*\"tag_name\": *\"\\([^\"]*\\)\".*/\\1/p' | head -n1)"

case "$ARCH" in
  x86_64) TARGET="x86_64-unknown-linux-gnu" ;;
  aarch64|arm64) TARGET="aarch64-unknown-linux-gnu" ;;
  *) echo "Unsupported Linux architecture: $ARCH" >&2; exit 1 ;;
esac

wget -O /usr/local/bin/mailclaw "https://github.com/missuo/mailclaw/releases/download/${TAG}/mailclaw-${TAG}-${TARGET}"
chmod +x /usr/local/bin/mailclaw
```

4. If writing to `/usr/local/bin` fails, ask the user for permission or tell them they need elevated privileges for the install.
5. If the platform is Windows, ask the user to install the CLI manually or provide the binary path.
6. Reuse the installed CLI on future invocations unless the user asks for a specific version or a source build.

## Configuration

Use the CLI to manage config instead of reading or writing `~/.mailclaw/config.json` manually.

```bash
# Save credentials
mailclaw config set --host "https://mailclaw.example.com" --api-token "your-api-token-here"

# Show current config state
mailclaw config show --json

# Verify the configured host is reachable
mailclaw health --json
```

- If config is missing, ask the user to provide their **MailClaw Host** and **API Token**, then save them with `mailclaw config set`.
- The CLI also supports global overrides `--host <HOST>` and `--api-token <TOKEN>`, but prefer persisted config unless the user wants a one-off override.
- On Windows, ask the user for the CLI path if `mailclaw` is not already available on `PATH`.

## Available Commands

### List emails (metadata only)

```bash
mailclaw list [--limit N] [--offset N] [--from sender@example.com] [--to inbox@example.com] [--q keyword] [--after 2026-03-01] [--before 2026-03-11] [--json]
```

Returns email summaries without body content. Use this for overview and browsing.

### Export emails (with full content)

```bash
mailclaw export [same filters as list] [--json]
```

Returns full emails including `text_content` and `html_content`. Use this when the user wants body content for multiple emails.

### Get single email

```bash
mailclaw get <email_id> [--json]
```

Returns one full email, including body content.

### Delete email

```bash
mailclaw delete <email_id> [--json]
```

Permanently deletes an email. Always confirm with the user before deleting.

### Health check

```bash
mailclaw health [--json]
```

Use this to verify the configured host is correct during setup.

## JSON Output

When you pass `--json`, the CLI prints the payload directly, not the original HTTP `{ success, data }` envelope.

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

### Email object (export / get)

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

```bash
# List all recent emails
mailclaw list --json

# Search emails containing "partnership"
mailclaw list --q partnership --json

# Filter by recipient and sender
mailclaw list --to bd@example.com --from partner@company.com --json

# Get emails from the last 7 days
mailclaw list --after 2026-03-03 --json

# Export emails with full content
mailclaw export --limit 10 --json

# Read a specific email
mailclaw get clx123abc --json

# Delete an email
mailclaw delete clx123abc --json
```

## Limitations

MailClaw is **receive-only**. Replying to or sending emails is not supported. If the user asks to send or reply to an email, inform them that this feature is not yet available because Cloudflare Email Sending is still in beta (waitlist). It will be supported once the feature becomes generally available.

## Guidelines

1. **Use the CLI, not curl** — All inbox operations should go through `mailclaw`.
2. **Check config through the CLI** — Use `mailclaw config show --json` and `mailclaw config set ...`; do not manually edit the config file unless the user explicitly asks.
3. **Verify on first use** — After saving a new config, call `mailclaw health --json`.
4. **Start with list** — Use `mailclaw list` first to get an overview, then drill into specific emails with `mailclaw get <id>`.
5. **Use filters** — Always apply relevant filters (`from`, `to`, `q`, date range) rather than fetching everything.
6. **Prefer text_content** — When displaying email content to the user, prefer `text_content` over `html_content` for readability.
7. **Pagination** — For large inboxes, paginate through results using `limit` and `offset`.
8. **Confirm deletes** — Always ask the user for confirmation before deleting emails.
9. **Date formatting** — The `received_at` field is a Unix timestamp in seconds. Convert it to a human-readable format when presenting to the user.
