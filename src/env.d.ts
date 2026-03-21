// Extend CloudflareBindings with secrets not in wrangler.jsonc
interface CloudflareBindings {
	API_TOKEN: string;
	RESEND_API_KEY?: string;
	EMAIL_PROVIDER?: string; // "resend" | "cloudflare" — defaults to "resend"
}
