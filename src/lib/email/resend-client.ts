import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "resend";
}

export async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    return { success: false, error: "Resend API key not configured", provider: "resend" };
  }

  try {
    const from = input.from || process.env.EMAIL_FROM || "noreply@dropshiphub.com";
    const result = await client.emails.send({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
      tags: input.tags,
    });

    if (result.error) {
      return { success: false, error: result.error.message, provider: "resend" };
    }

    return { success: true, messageId: result.data?.id, provider: "resend" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Resend error",
      provider: "resend",
    };
  }
}

export function isResendAvailable(): boolean {
  return !!process.env.RESEND_API_KEY;
}
