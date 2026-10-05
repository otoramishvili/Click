/* One labelled input with an optional hint and error message under it. */
export function Field({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  hint,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
  error?: string;
}) {
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`input w-full ${error ? "input-error" : ""}`}
      />
      {message && (
        <p
          id={messageId}
          className={`mt-1.5 text-sm ${error ? "text-error" : "text-base-content/70"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
