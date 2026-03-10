import { convert } from "html-to-text";

const MAX_HTML_LENGTH = 500_000;
const MAX_TEXT_LENGTH = 200_000;

export function processEmailContent(
	html: string | null,
	text: string | null,
): { htmlContent: string | null; textContent: string | null } {
	const htmlContent = html ? html.slice(0, MAX_HTML_LENGTH) : null;
	let textContent = text ? text.slice(0, MAX_TEXT_LENGTH) : null;

	// Generate text from HTML if no plain text provided
	if (!textContent && htmlContent) {
		try {
			textContent = convert(htmlContent, {
				wordwrap: false,
				selectors: [
					{ selector: "img", format: "skip" },
					{ selector: "a", options: { ignoreHref: true } },
				],
			}).slice(0, MAX_TEXT_LENGTH);
		} catch {
			textContent = null;
		}
	}

	return { htmlContent, textContent };
}
