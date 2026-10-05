/* Sends one email through Resend. Server only: it uses the secret API key. */
import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /* Where a reply to this email goes */
  replyTo?: string;
};

export type EmailResult = { ok: true } | { ok: false; reason: string };

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("Email not sent: RESEND_API_KEY or EMAIL_FROM is missing in .env.local");
    return { ok: false, reason: "Email is not set up" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });

    if (error) {
      console.error(`Email to ${message.to} was rejected by Resend:`, error);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error(`Email to ${message.to} failed:`, error);
    return { ok: false, reason: "Could not reach Resend" };
  }
}
