/* Sends one email through Resend. Server only: it uses the secret API key. */
import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /* Where a reply to this email goes */
  replyTo?: string;
  /* Files sent with the email, for example the PDF invoice */
  attachments?: EmailAttachment[];
};

export type EmailAttachment = {
  /* The name the receiver sees, for example "invoice-1001.pdf" */
  filename: string;
  /* The bytes of the file */
  content: Uint8Array;
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
      attachments: message.attachments?.map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.content),
      })),
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
