export function now(): number {
	return Math.floor(Date.now() / 1000);
}

export function parseTimestamp(value: string): number | null {
	// Try Unix timestamp
	const num = Number(value);
	if (!Number.isNaN(num) && num > 0) {
		return num;
	}
	// Try ISO 8601 date string
	const date = new Date(value);
	if (!Number.isNaN(date.getTime())) {
		return Math.floor(date.getTime() / 1000);
	}
	return null;
}
