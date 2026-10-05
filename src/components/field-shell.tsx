import type { ReactNode } from "react";

/* Label above a form control, with a hint or an error message under it. */
export function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const message = error ?? hint;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {message && (
        <p
          id={`${id}-message`}
          className={`mt-1.5 text-sm ${error ? "text-error" : "text-base-content/70"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/*
  Spread onto the control inside a FieldShell so screen readers connect it to
  its message: <input id="x" {...describedBy("x", hint, error)} />
*/
export function describedBy(id: string, hint?: string, error?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": hint || error ? `${id}-message` : undefined,
  } as const;
}
