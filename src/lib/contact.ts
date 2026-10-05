/*
  The contact form's fields and the rules for a valid message.
  Used by the form in the browser and checked again on the server.
*/
import { isValidEmail } from "@/lib/validation";

export type ContactMessage = { name: string; email: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactMessage, string>>;

export const MAX_MESSAGE_LENGTH = 2000;

/* A one-line field: line breaks and runs of spaces become a single space */
function line(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/* The message itself keeps its line breaks */
function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function cleanContact(raw: unknown): ContactMessage {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    name: line(source.name, 200),
    email: line(source.email, 200),
    message: text(source.message, MAX_MESSAGE_LENGTH),
  };
}

export function validateContact(contact: ContactMessage): ContactErrors {
  const errors: ContactErrors = {};

  if (contact.name.length < 2) {
    errors.name = "Enter your name.";
  }
  if (!contact.email) {
    errors.email = "Enter your email address.";
  } else if (!isValidEmail(contact.email)) {
    errors.email = "Enter a full email address, like name@example.com.";
  }
  if (contact.message.length < 5) {
    errors.message = "Write your message.";
  }

  return errors;
}

export type ContactResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: ContactErrors };
