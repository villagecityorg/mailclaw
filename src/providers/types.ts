import type { SendEmailRequest, SendEmailResponse } from "@/types";

export interface EmailProvider {
	readonly name: string;
	send(request: SendEmailRequest): Promise<SendEmailResponse>;
}
