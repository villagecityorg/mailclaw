import { Hono } from "hono";
import * as db from "@/database/d1";
import { createEmailProvider } from "@/providers";
import type { EmailFilters, SendEmailRequest } from "@/types";
import { parseTimestamp } from "@/utils/helpers";
import { ERR, OK } from "@/utils/http";

const emails = new Hono<{ Bindings: CloudflareBindings }>();

function parseFilters(query: Record<string, string>): EmailFilters {
	const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
	const offset = Math.max(Number(query.offset) || 0, 0);

	return {
		from: query.from || undefined,
		to: query.to || undefined,
		q: query.q || undefined,
		after: query.after ? (parseTimestamp(query.after) ?? undefined) : undefined,
		before: query.before ? (parseTimestamp(query.before) ?? undefined) : undefined,
		limit,
		offset,
	};
}

// List emails (metadata only)
emails.get("/api/emails", async (c) => {
	const filters = parseFilters(c.req.query());
	const { emails: results, total, error } = await db.getEmails(c.env.D1, filters);

	if (error) return c.json(ERR("D1_ERROR", error.message), 500);
	return c.json(OK({ emails: results, total, limit: filters.limit, offset: filters.offset }));
});

// Export emails (with full content)
emails.get("/api/emails/export", async (c) => {
	const filters = parseFilters(c.req.query());
	const { emails: results, total, error } = await db.getEmailsExport(c.env.D1, filters);

	if (error) return c.json(ERR("D1_ERROR", error.message), 500);
	return c.json(OK({ emails: results, total, limit: filters.limit, offset: filters.offset }));
});

// Get single email
emails.get("/api/emails/:id", async (c) => {
	const { email, error } = await db.getEmailById(c.env.D1, c.req.param("id"));

	if (error) return c.json(ERR("D1_ERROR", error.message), 500);
	if (!email) return c.json(ERR("NOT_FOUND", "Email not found"), 404);
	return c.json(OK(email));
});

// Delete single email
emails.delete("/api/emails/:id", async (c) => {
	const { deleted, error } = await db.deleteEmailById(c.env.D1, c.req.param("id"));

	if (error) return c.json(ERR("D1_ERROR", error.message), 500);
	if (!deleted) return c.json(ERR("NOT_FOUND", "Email not found"), 404);
	return c.json(OK({ message: "Email deleted" }));
});

// Send email
emails.post("/api/emails/send", async (c) => {
	let body: SendEmailRequest;
	try {
		body = await c.req.json<SendEmailRequest>();
	} catch {
		return c.json(ERR("INVALID_BODY", "Request body must be valid JSON"), 400);
	}

	if (!body.from || !body.to || !body.subject) {
		return c.json(ERR("MISSING_FIELDS", "from, to, and subject are required"), 400);
	}

	if (!body.html && !body.text) {
		return c.json(ERR("MISSING_CONTENT", "Either html or text content is required"), 400);
	}

	try {
		const provider = createEmailProvider(c.env);
		const result = await provider.send(body);
		return c.json(OK(result));
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to send email";
		return c.json(ERR("SEND_FAILED", message), 500);
	}
});

export default emails;
