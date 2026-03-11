---
name: mailclaw
description: Read, search, and manage emails from the MailClaw inbox via the local CLI. Use when the user asks to check emails, read messages, search inbox, find emails from a sender, or review recent correspondence.
allowed-tools: Bash(mailclaw *), Bash(curl *), Bash(python3 *)
---

# MailClaw - Binary CLI

You have access to the local `mailclaw` binary CLI. Use it to read, search, and manage emails. Do not call the MailClaw HTTP API directly with `curl` unless the user explicitly asks for raw API requests.

By default, if `mailclaw` is missing, install the latest released binary automatically from GitHub Releases and then continue the task.

## Prerequisite

Before doing anything else, verify the CLI exists:

```bash
mailclaw --version
```

- If `mailclaw` is missing, install the latest release binary automatically instead of asking the user to build it manually.
- Prefer GitHub Releases over local source builds unless the user explicitly asks to build from source.
- Once the binary is available, use it for all inbox operations.

### Automatic install flow

Use `python3` for installation so the same process works on macOS, Linux, and Windows.

Platform mapping:
- `Darwin` + `arm64` -> `aarch64-apple-darwin`
- `Darwin` + `x86_64` -> `x86_64-apple-darwin`
- `Linux` + `aarch64` or `arm64` -> `aarch64-unknown-linux-gnu`
- `Linux` + `x86_64` -> `x86_64-unknown-linux-gnu`
- `Windows` + `AMD64` or `x86_64` -> `x86_64-pc-windows-msvc`

Install behavior:
- Download the latest release metadata from `https://api.github.com/repos/missuo/mailclaw/releases/latest`.
- Download the matching binary asset for the detected target.
- Install to a user-writable bin directory:
  - macOS/Linux: `~/.local/bin/mailclaw`
  - Windows: `~/.local/bin/mailclaw.exe`
- On Unix, set mode `0755`.
- If the install directory is not already on `PATH`, call the installed binary by absolute path for the current task.

Recommended installation command:

```bash
python3 - <<'PY'
import json
import os
import pathlib
import platform
import shutil
import stat
import sys
import tempfile
import urllib.request

API_URL = "https://api.github.com/repos/missuo/mailclaw/releases/latest"

system = platform.system()
machine = platform.machine().lower()
target_map = {
    ("Darwin", "arm64"): ("aarch64-apple-darwin", ""),
    ("Darwin", "x86_64"): ("x86_64-apple-darwin", ""),
    ("Linux", "aarch64"): ("aarch64-unknown-linux-gnu", ""),
    ("Linux", "arm64"): ("aarch64-unknown-linux-gnu", ""),
    ("Linux", "x86_64"): ("x86_64-unknown-linux-gnu", ""),
    ("Windows", "amd64"): ("x86_64-pc-windows-msvc", ".exe"),
    ("Windows", "x86_64"): ("x86_64-pc-windows-msvc", ".exe"),
}

target_info = target_map.get((system, machine))
if not target_info:
    raise SystemExit(f"unsupported platform: {system} {machine}")

target, ext = target_info
with urllib.request.urlopen(API_URL) as response:
    release = json.load(response)

tag = release["tag_name"]
asset_name = f"mailclaw-{tag}-{target}{ext}"
asset = next((a for a in release.get("assets", []) if a.get("name") == asset_name), None)
if not asset:
    raise SystemExit(f"release asset not found: {asset_name}")

home = pathlib.Path.home()
bin_dir = home / ".local" / "bin"
bin_dir.mkdir(parents=True, exist_ok=True)
dest = bin_dir / f"mailclaw{ext}"

with tempfile.NamedTemporaryFile(delete=False) as tmp:
    tmp_path = pathlib.Path(tmp.name)

with urllib.request.urlopen(asset["browser_download_url"]) as response, tmp_path.open("wb") as out:
    shutil.copyfileobj(response, out)

tmp_path.replace(dest)
if ext == "":
    dest.chmod(dest.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

print(dest)
PY
```

- Capture the printed installed path and use that binary directly if `mailclaw` is still not on `PATH`.
- If the platform is unsupported or the download fails, then tell the user and fall back to asking them to build from source.
- Reuse the installed latest-release binary on future invocations unless the user asks for a specific version or a source build.

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
- On Windows, prefer the installed absolute path such as `C:\Users\<user>\.local\bin\mailclaw.exe` if `mailclaw` is not yet on `PATH`.

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

1. **Use the CLI, not curl** — All inbox operations should go through `mailclaw` or the installed absolute binary path.
2. **Check config through the CLI** — Use `mailclaw config show --json` and `mailclaw config set ...`; do not manually edit the config file unless the user explicitly asks.
3. **Verify on first use** — After saving a new config, call `mailclaw health --json`.
4. **Start with list** — Use `mailclaw list` first to get an overview, then drill into specific emails with `mailclaw get <id>`.
5. **Use filters** — Always apply relevant filters (`from`, `to`, `q`, date range) rather than fetching everything.
6. **Prefer text_content** — When displaying email content to the user, prefer `text_content` over `html_content` for readability.
7. **Pagination** — For large inboxes, paginate through results using `limit` and `offset`.
8. **Confirm deletes** — Always ask the user for confirmation before deleting emails.
9. **Date formatting** — The `received_at` field is a Unix timestamp in seconds. Convert it to a human-readable format when presenting to the user.
