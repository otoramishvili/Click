"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { LuCheck } from "react-icons/lu";
import { lookupOrderStatusAction } from "@/app/(store)/order-status/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { describedBy, FieldShell } from "@/components/field-shell";
import { formatPrice } from "@/lib/format";
import {
  cleanLookup,
  STATUS_STEPS,
  statusInfo,
  validateLookup,
  type OrderStatusView,
  type StatusLookupErrors,
  type StatusLookupResult,
} from "@/lib/order-status";
import { routes, site } from "@/lib/site";

/* "02.10.2026, 14:05" in Georgian time */
function formatDateTime(iso: string | null): string {
  const date = new Date(iso ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(/\//g, ".");
}

/* The order's status, its path so far, and what was ordered */
function StatusCard({ order }: { order: OrderStatusView }) {
  const info = statusInfo(order.status);
  const cancelled = order.status === "cancelled";
  /* How far along the normal path the order is (-1 when cancelled) */
  const reached = STATUS_STEPS.indexOf(order.status);
  const changed = formatDateTime(order.deliveredAt ?? order.statusUpdatedAt);

  return (
    <section
      aria-labelledby="status-title"
      className="rounded-box border border-base-300 p-5 sm:p-8"
    >
      <p className="text-sm tabular-nums text-base-content/70">
        Order № {order.number}, placed {formatDateTime(order.placedAt)}
      </p>
      <h2
        id="status-title"
        className={`font-wide mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
          cancelled ? "text-error" : ""
        }`}
      >
        {info.headline}
      </h2>
      <p className="mt-2 text-base-content/70">
        {info.text}
        {changed && <> Updated {changed}.</>}
      </p>

      {/* The steps an order goes through. A cancelled order is not on this path. */}
      {!cancelled && (
        <ol className="mt-6 grid gap-3 sm:grid-cols-4 sm:gap-0">
          {STATUS_STEPS.map((step, index) => {
            const done = index <= reached;
            return (
              <li
                key={step}
                aria-current={index === reached ? "step" : undefined}
                className={`flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2 sm:border-t-2 sm:pt-3 ${
                  done ? "sm:border-primary" : "sm:border-base-300"
                }`}
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-base-content/60"
                  }`}
                  aria-hidden
                >
                  {done ? <LuCheck className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={`text-sm ${
                    index === reached
                      ? "font-semibold"
                      : done
                        ? "font-medium"
                        : "text-base-content/60"
                  }`}
                >
                  {statusInfo(step).label}
                  <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <ul className="mt-6 divide-y divide-base-200 border-t border-base-300 text-sm">
        {order.lines.map((line, index) => (
          <li key={index} className="flex justify-between gap-4 py-2.5">
            <span className="min-w-0 font-medium">{line.name}</span>
            <span className="shrink-0 tabular-nums text-base-content/70">
              × {line.quantity}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex items-baseline justify-between gap-4 border-t border-base-300 pt-3">
        <span className="font-medium">Total</span>
        <span className="text-xl font-bold tabular-nums">{formatPrice(order.total)}</span>
      </p>

      <p className="mt-5 text-sm text-base-content/70">
        A question about this order? Call{" "}
        <span className="whitespace-nowrap">{site.phone}</span> or{" "}
        <Link href={routes.contact} className="link link-primary font-medium">
          write to us
        </Link>
        .
      </p>
    </section>
  );
}

/* The form on the Order status page, and the answer under it. */
export function OrderStatusForm() {
  const { user } = useAuth();
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<StatusLookupErrors>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<OrderStatusView | null>(null);

  /* /order-status?number=1001 (the link on the "order received" page) fills in the number */
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("number");
    if (fromLink) setNumber(fromLink.replace(/\D/g, "").slice(0, 12));
  }, []);

  /* A logged-in customer does not have to type their email */
  useEffect(() => {
    if (!user?.email) return;
    setEmail((current) => current || user.email);
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setOrder(null);

    const lookup = cleanLookup({ number, email });
    const found = validateLookup(lookup);
    setErrors(found);
    if (found.number) {
      document.getElementById("status-number")?.focus();
      return;
    }
    if (found.email) {
      document.getElementById("status-email")?.focus();
      return;
    }

    setPending(true);
    let result: StatusLookupResult;
    try {
      result = await lookupOrderStatusAction(lookup);
    } catch (error) {
      console.error("Asking for the order status failed:", error);
      result = {
        ok: false,
        message: "The order could not be looked up. Check your connection and try again.",
      };
    }
    setPending(false);

    if (result.ok) {
      setOrder(result.order);
      return;
    }
    setMessage(result.message);
    if (result.fieldErrors) setErrors(result.fieldErrors);
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-box border border-base-300 p-5 sm:p-8"
      >
        <FieldShell id="status-number" label="Order number" error={errors.number}>
          <input
            id="status-number"
            name="number"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={number}
            onChange={(event) => {
              setNumber(event.target.value);
              setErrors((current) => ({ ...current, number: undefined }));
            }}
            className={`input w-full tabular-nums ${errors.number ? "input-error" : ""}`}
            {...describedBy("status-number", undefined, errors.number)}
          />
        </FieldShell>

        <FieldShell id="status-email" label="Email" error={errors.email}>
          <input
            id="status-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            className={`input w-full ${errors.email ? "input-error" : ""}`}
            {...describedBy("status-email", undefined, errors.email)}
          />
        </FieldShell>

        <button type="submit" disabled={pending} className="btn btn-primary btn-block">
          {pending ? "Checking…" : "Check status"}
        </button>
      </form>

      <div>
        {message && (
          <p role="alert" className="alert alert-error alert-soft text-sm">
            {message}
          </p>
        )}
        {/* role="status": screen readers read the answer out when it arrives */}
        {order && (
          <div role="status">
            <StatusCard order={order} />
          </div>
        )}
      </div>
    </div>
  );
}
