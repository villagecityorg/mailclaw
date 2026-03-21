import { ResendProvider } from "./resend";
import type { EmailProvider } from "./types";

export function createEmailProvider(env: CloudflareBindings): EmailProvider {
	const provider = (env.EMAIL_PROVIDER || "resend").toLowerCase();

	switch (provider) {
		case "resend": {
			if (!env.RESEND_API_KEY) {
				throw new Error("RESEND_API_KEY is required when using the Resend provider");
			}
			return new ResendProvider(env.RESEND_API_KEY);
		}
		case "cloudflare":
			throw new Error("Cloudflare email send provider is not yet supported");
		default:
			throw new Error(`Unknown email provider: ${provider}`);
	}
}
