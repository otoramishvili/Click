"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/auth/field";
import { signUp } from "@/lib/auth";
import { routes } from "@/lib/site";
import { isValidEmail, MIN_PASSWORD_LENGTH } from "@/lib/validation";

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    /* 1. Check the fields */
    const found: Errors = {};
    if (!name.trim()) {
      found.name = "Enter your name.";
    }
    if (!email.trim()) {
      found.email = "Enter your email address.";
    } else if (!isValidEmail(email)) {
      found.email = "Enter a full email address, like name@example.com.";
    }
    if (!password) {
      found.password = "Choose a password.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      found.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirm) {
      found.confirm = "Type the password again.";
    } else if (confirm !== password) {
      found.confirm = "The two passwords are different.";
    }
    setErrors(found);

    /* 2. If something is wrong, move to the first field that needs fixing */
    const firstInvalid = (["name", "email", "password", "confirm"] as const).find(
      (key) => found[key],
    );
    if (firstInvalid) {
      document.getElementById(`signup-${firstInvalid}`)?.focus();
      return;
    }

    /* 3. Create the account */
    setPending(true);
    const result = await signUp(name.trim(), email.trim(), password);
    setPending(false);

    if (result.ok) {
      /* A full page load, so the header picks up the new account's name */
      window.location.assign(routes.home);
    } else {
      setFormError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <div role="alert" className="alert alert-error alert-soft text-sm">
          {formError}
        </div>
      )}

      <Field
        id="signup-name"
        name="name"
        label="Full name"
        autoComplete="name"
        value={name}
        onChange={setName}
        error={errors.name}
      />
      <Field
        id="signup-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        hint="Your invoices are sent to this address."
        error={errors.email}
      />
      <Field
        id="signup-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={errors.password}
      />
      <Field
        id="signup-confirm"
        name="confirm"
        label="Repeat password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        error={errors.confirm}
      />

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block"
      >
        {pending ? "Creating account…" : "Create an account"}
      </button>
    </form>
  );
}
