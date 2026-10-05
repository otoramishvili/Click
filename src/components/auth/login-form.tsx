"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/auth/field";
import { logIn } from "@/lib/auth";
import { routes } from "@/lib/site";
import { isValidEmail } from "@/lib/validation";

type Errors = { email?: string; password?: string };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    /* 1. Check the fields */
    const found: Errors = {};
    if (!email.trim()) {
      found.email = "Enter your email address.";
    } else if (!isValidEmail(email)) {
      found.email = "Enter a full email address, like name@example.com.";
    }
    if (!password) {
      found.password = "Enter your password.";
    }
    setErrors(found);

    /* 2. If something is wrong, move to the first field that needs fixing */
    const firstInvalid = (["email", "password"] as const).find(
      (key) => found[key],
    );
    if (firstInvalid) {
      document.getElementById(`login-${firstInvalid}`)?.focus();
      return;
    }

    /* 3. Log in */
    setPending(true);
    const result = await logIn(email.trim(), password);
    setPending(false);

    if (result.ok) {
      /* /login?next=/admin sends the user back where they came from */
      const next = new URLSearchParams(window.location.search).get("next") ?? "";
      /* Only a path on this site: "/admin", never "//other.site" or "/\other.site" */
      const isLocal = /^\/(?![/\\])[^\\]*$/.test(next);
      router.push(isLocal ? next : routes.home);
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
        id="login-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
      />
      <Field
        id="login-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
