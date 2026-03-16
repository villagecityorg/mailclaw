#!/usr/bin/env bash
set -euo pipefail

REPO="missuo/mailclaw"
BINARY="mailclaw"
INSTALL_DIR="/usr/local/bin"

info()  { printf '\033[1;34m%s\033[0m\n' "$*"; }
error() { printf '\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

detect_platform() {
	local os arch
	os="$(uname -s)"
	arch="$(uname -m)"

	case "$os" in
		Darwin) OS="darwin" ;;
		Linux)  OS="linux" ;;
		*)      error "Unsupported OS: $os" ;;
	esac

	case "$arch" in
		x86_64|amd64)  ARCH="x86_64" ;;
		aarch64|arm64) ARCH="aarch64" ;;
		*)             error "Unsupported architecture: $arch" ;;
	esac
}

install_macos() {
	info "Detected macOS — installing via Homebrew..."

	if ! command -v brew &>/dev/null; then
		error "Homebrew is not installed. Install it from https://brew.sh"
	fi

	brew tap owo-network/brew
	brew install owo-network/brew/mailclaw

	info "Installed successfully via Homebrew."
}

install_linux() {
	info "Detected Linux ($ARCH) — installing from GitHub Releases..."

	local target
	case "$ARCH" in
		x86_64)  target="x86_64-unknown-linux-gnu" ;;
		aarch64) target="aarch64-unknown-linux-gnu" ;;
	esac

	# Fetch latest release tag
	local tag
	tag="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
		| grep '"tag_name"' | head -1 | cut -d '"' -f 4)"

	if [ -z "$tag" ]; then
		error "Failed to determine the latest release version."
	fi

	info "Latest version: $tag"

	local url="https://github.com/${REPO}/releases/download/${tag}/${BINARY}-${tag}-${target}"
	local tmpfile
	tmpfile="$(mktemp)"

	info "Downloading ${BINARY}-${tag}-${target}..."
	curl -fsSL -o "$tmpfile" "$url" || error "Download failed. URL: $url"
	chmod +x "$tmpfile"

	# Install to INSTALL_DIR (may need sudo)
	if [ -w "$INSTALL_DIR" ]; then
		mv "$tmpfile" "${INSTALL_DIR}/${BINARY}"
	else
		info "Writing to ${INSTALL_DIR} requires elevated permissions."
		sudo mv "$tmpfile" "${INSTALL_DIR}/${BINARY}"
	fi

	info "Installed ${BINARY} ${tag} to ${INSTALL_DIR}/${BINARY}"
}

prompt_configure() {
	printf '\n'
	info "Would you like to configure MailClaw now? [y/N] "
	read -r answer
	case "$answer" in
		[yY]|[yY][eE][sS])
			printf 'Enter your MailClaw host (e.g. https://mailclaw.example.com): '
			read -r host
			printf 'Enter your API token: '
			read -r token
			"${INSTALL_DIR}/${BINARY}" config set --host "$host" --api-token "$token"
			info "Configuration saved."
			;;
		*)
			info "Skipped. You can configure later with: ${BINARY} config set --host <HOST> --api-token <TOKEN>"
			;;
	esac
}

main() {
	detect_platform

	case "$OS" in
		darwin) install_macos ;;
		linux)  install_linux ;;
	esac

	info "Run '${BINARY} --help' to get started."

	prompt_configure
}

main
