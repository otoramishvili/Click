/* Sends a message from the contact form to the store's inbox. Runs on the server. */
import { cleanContact, validateContact, type ContactResult } from "@/lib/contact";
import { sendEmail } from "@/lib/server/email";
import { contactEmail } from "@/lib/server/email-templates";

export async function sendContactMessage(raw: unknown): Promise<ContactResult> {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  /*
    Spam trap: the form has a field people cannot see. Programs that fill in
    every field give themselves away. They are told "sent" and nothing is sent.
  */
  if (typeof source.website === "string" && source.website !== "") {
    return { ok: true };
  }

  const contact = cleanContact(source);
  const fieldErrors = validateContact(contact);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Some details need fixing.", fieldErrors };
  }

  const storeInbox = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!storeInbox) {
    console.error("ORDER_NOTIFICATION_EMAIL is missing in .env.local: the contact message was not sent");
  }

  const result = storeInbox
    ? await sendEmail({ to: storeInbox, replyTo: contact.email, ...contactEmail(contact) })
    : { ok: false as const };

  return result.ok
    ? { ok: true }
    : {
        ok: false,
        message: "The message could not be sent. Try again in a minute, or call us.",
      };
}
