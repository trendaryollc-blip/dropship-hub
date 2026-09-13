import sgMail from "@sendgrid/mail";

let sendgridInitialized = false;

function ensureSendGrid(): boolean {
  if (sendgridInitialized) return true;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return false;
  sgMail.setApiKey(apiKey);
  sendgridInitialized = true;
  return true;
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
  provider: "sendgrid";
}

export async function sendWithSendGrid(input: SendEmailInput): Promise<SendEmailResult> {
  if (!ensureSendGrid()) {
    return { success: false, error: "SendGrid API key not configured", provider: "sendgrid" };
  }

  try {
    const from = input.from || process.env.EMAIL_FROM || "noreply@dropshiphub.com";
    const recipients = Array.isArray(input.to) ? input.to : [input.to];

    const msg: sgMail.MailDataRequired = {
      to: recipients,
      from,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo ? { email: input.replyTo } : undefined,
      customArgs: input.tags?.reduce((acc, tag) => ({ ...acc, [tag.name]: tag.value }), {} as Record<string, string>),
    };

    const [response] = await sgMail.send(msg);
    return {
      success: true,
      messageId: response.headers["x-message-id"],
      provider: "sendgrid",
    };
  } catch (error) {
    const err = error as { code?: number; response?: { body?: unknown } };
    return {
      success: false,
      error: err.code ? `SendGrid error ${err.code}` : error instanceof Error ? error.message : "Unknown SendGrid error",
      provider: "sendgrid",
    };
  }
}

export function isSendGridAvailable(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}
