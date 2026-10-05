"use client";

import { useState, type FormEvent } from "react";
import { sendContactMessageAction } from "@/app/(store)/contact/actions";
import { describedBy, FieldShell } from "@/components/field-shell";
import {
  cleanContact,
  MAX_MESSAGE_LENGTH,
  validateContact,
  type ContactErrors,
  type ContactMessage,
  type ContactResult,
} from "@/lib/contact";

const FIELD_ORDER: (keyof ContactMessage)[] = ["name", "email", "message"];
const EMPTY: ContactMessage = { name: "", email: "", message: "" };

export function ContactForm() {
  const [contact, setContact] = useState<ContactMessage>(EMPTY);
  /* The hidden spam-trap field. People never fill it in. */
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState("");

  function change(field: keyof ContactMessage, value: string) {
    setContact((current) => ({ ...current, [field]: value }));
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    const cleaned = cleanContact(contact);
    const found = validateContact(cleaned);
    setErrors(found);

    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }

    setPending(true);
    let result: ContactResult;
    try {
      result = await sendContactMessageAction({ ...cleaned, website });
    } catch (error) {
      console.error("Sending the message failed:", error);
      result = {
        ok: false,
        message: "The message could not be sent. Check your connection and try again.",
      };
    }
    setPending(false);

    if (result.ok) {
      setSentTo(cleaned.email);
      setContact(EMPTY);
      return;
    }
    setFormMessage(result.message);
    if (result.fieldErrors) setErrors(result.fieldErrors);
  }

  if (sentTo) {
    return (
      <div role="status">
        <p className="text-lg font-semibold">Message sent</p>
        <p className="mt-2 text-base-content/70">
          Our answer will come to{" "}
          <strong className="break-words text-base-content">{sentTo}</strong>.
        </p>
        <button type="button" className="btn btn-ghost mt-5" onClick={() => setSentTo("")}>
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formMessage && (
        <p role="alert" className="alert alert-error alert-soft text-sm">
          {formMessage}
        </p>
      )}

      <FieldShell id="contact-name" label="Name" error={errors.name}>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          value={contact.name}
          onChange={(event) => change("name", event.target.value)}
          className={`input w-full ${errors.name ? "input-error" : ""}`}
          {...describedBy("contact-name", undefined, errors.name)}
        />
      </FieldShell>

      <FieldShell
        id="contact-email"
        label="Email"
        hint="We answer to this address."
        error={errors.email}
      >
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          value={contact.email}
          onChange={(event) => change("email", event.target.value)}
          className={`input w-full ${errors.email ? "input-error" : ""}`}
          {...describedBy("contact-email", "We answer to this address.", errors.email)}
        />
      </FieldShell>

      {/* Spam trap: hidden from people and from screen readers, left empty */}
      <div className="hidden" aria-hidden>
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <FieldShell id="contact-message" label="Message" error={errors.message}>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          maxLength={MAX_MESSAGE_LENGTH}
          value={contact.message}
          onChange={(event) => change("message", event.target.value)}
          className={`textarea w-full ${errors.message ? "textarea-error" : ""}`}
          {...describedBy("contact-message", undefined, errors.message)}
        />
      </FieldShell>

      <button type="submit" disabled={pending} className="btn btn-primary btn-block">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
