"use server";

import type { ContactMessage, ContactResult } from "@/lib/contact";
import { sendContactMessage } from "@/lib/server/contact";

/* Runs on the server when the contact form is sent. */
export async function sendContactMessageAction(
  input: ContactMessage & { website: string },
): Promise<ContactResult> {
  return sendContactMessage(input);
}
