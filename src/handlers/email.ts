import { createId } from "@paralleldrive/cuid2";
import PostalMime from "postal-mime";
import { insertEmail } from "@/database/d1";
import { now } from "@/utils/helpers";
import { processEmailContent } from "@/utils/mail";

export async function handleEmail(
	message: ForwardableEmailMessage,
	env: CloudflareBindings,
	_ctx: ExecutionContext,
) {
	try {
		const emailId = createId();
		const parsed = await PostalMime.parse(message.raw);

		const { htmlContent, textContent } = processEmailContent(
			parsed.html ?? null,
			parsed.text ?? null,
		);

		const hasAttachments = (parsed.attachments?.length ?? 0) > 0;

		const { success, error } = await insertEmail(env.D1, {
			id: emailId,
			from_address: message.from,
			to_address: message.to,
			subject: parsed.subject || null,
			received_at: now(),
			html_content: htmlContent,
			text_content: textContent,
			has_attachments: hasAttachments,
			attachment_count: parsed.attachments?.length ?? 0,
		});

		if (!success) {
			throw new Error(`Failed to insert email: ${error}`);
		}

		console.log(`Email ${emailId} stored: ${message.from} → ${message.to}`);
	} catch (error) {
		console.error("Failed to process email:", error);
		throw error;
	}
}
