"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { LuCircleCheck } from "react-icons/lu";
import { placeOrderAction } from "@/app/(store)/checkout/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { Container } from "@/components/container";
import { describedBy, FieldShell } from "@/components/field-shell";
import { formatPrice, fromTetri, toTetri } from "@/lib/format";
import {
  cleanCustomer,
  emptyCustomer,
  validateCustomer,
  type Customer,
  type CustomerErrors,
  type CustomerType,
  type PlaceOrderResult,
} from "@/lib/orders";
import { ORDER_STATUS_URL } from "@/lib/order-status";
import { routes, site } from "@/lib/site";

/* The order the fields appear in, used to jump to the first one with an error */
const FIELD_ORDER: (keyof Customer)[] = [
  "companyName",
  "companyId",
  "fullName",
  "email",
  "phone",
  "city",
  "address",
  "note",
];

const ORDER_TYPES: { value: CustomerType; label: string }[] = [
  { value: "personal", label: "A person" },
  { value: "business", label: "A company" },
];

type PlacedOrder = { number: number; email: string; invoiceSent: boolean };

/* One single-line field of the form */
function TextField({
  field,
  label,
  type = "text",
  autoComplete,
  hint,
  customer,
  errors,
  onChange,
}: {
  field: keyof Customer;
  label: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  hint?: string;
  customer: Customer;
  errors: CustomerErrors;
  onChange: (field: keyof Customer, value: string) => void;
}) {
  const id = `checkout-${field}`;
  const error = errors[field];

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        name={field}
        type={type}
        autoComplete={autoComplete}
        value={customer[field]}
        onChange={(event) => onChange(field, event.target.value)}
        className={`input w-full ${error ? "input-error" : ""}`}
        {...describedBy(id, hint, error)}
      />
    </FieldShell>
  );
}

/* The /checkout page: customer details on the left, the order on the right. */
export function CheckoutView() {
  const cart = useCart();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  /* A logged-in customer does not have to type their email again */
  useEffect(() => {
    if (!user?.email) return;
    setCustomer((current) =>
      current.email ? current : { ...current, email: user.email },
    );
  }, [user]);

  function change(field: keyof Customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
    /* Once a field is being fixed, its error message goes away */
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    /* 1. Check the fields (the server checks them again) */
    const cleaned = cleanCustomer(customer);
    const found = validateCustomer(cleaned);
    setErrors(found);

    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(`checkout-${firstInvalid}`)?.focus();
      return;
    }

    /* 2. Send the order to the server */
    setPending(true);
    let result: PlaceOrderResult;
    try {
      result = await placeOrderAction({
        customer: cleaned,
        items: cart.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        expectedTotal: cart.total,
      });
    } catch (error) {
      console.error("Sending the order failed:", error);
      result = {
        ok: false,
        message:
          "The order could not be sent. Check your connection and try again.",
      };
    }
    setPending(false);

    /* 3. Show what happened */
    if (result.ok) {
      setPlaced({
        number: result.orderNumber,
        email: result.email,
        invoiceSent: result.invoiceSent,
      });
      cart.clear();
      window.scrollTo(0, 0);
      return;
    }

    setFormMessage(result.message);
    if (result.fieldErrors) setErrors(result.fieldErrors);
    if (result.updates) cart.applyUpdates(result.updates);
  }

  /* After a successful order */
  if (placed) {
    return (
      <Container className="py-12 lg:py-20">
        <div className="mx-auto max-w-xl" role="status">
          <LuCircleCheck className="size-12 text-success" aria-hidden />
          <h1 className="font-wide mt-5 text-3xl font-bold tracking-tight">
            Order № {placed.number} received
          </h1>
          {placed.invoiceSent ? (
            <p className="mt-4 text-lg leading-relaxed text-base-content/70">
              The invoice is on its way to{" "}
              <strong className="break-words text-base-content">{placed.email}</strong>.
              If it is not in your inbox in a few minutes, look in the spam
              folder.
            </p>
          ) : (
            <p className="mt-4 text-lg leading-relaxed text-base-content/70">
              Your order is saved, but the invoice could not be emailed to{" "}
              <strong className="break-words text-base-content">{placed.email}</strong>.
              Call us on {site.phone} and mention order № {placed.number}.
            </p>
          )}
          <p className="mt-4 text-base-content/70">
            You can follow this order on the Order status page with its number
            and your email.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={routes.home} className="btn btn-primary">
              Back to the store
            </Link>
            <Link
              href={`${ORDER_STATUS_URL}?number=${placed.number}`}
              className="btn btn-ghost"
            >
              Check order status
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const fieldProps = { customer, errors, onChange: change };

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="font-wide text-3xl font-bold tracking-tight">Checkout</h1>

      {!cart.ready ? (
        <p className="mt-6 text-base-content/70" role="status">
          Loading your cart…
        </p>
      ) : cart.items.length === 0 ? (
        <div className="mt-6">
          {formMessage && (
            <p role="alert" className="alert alert-error alert-soft mb-5 text-sm">
              {formMessage}
            </p>
          )}
          <p className="text-base-content/70">
            Your cart is empty, so there is nothing to order yet.
          </p>
          <Link href={routes.home} className="btn btn-primary mt-5">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5 rounded-box border border-base-300 p-5 sm:p-8"
          >
            {formMessage && (
              <p role="alert" className="alert alert-error alert-soft text-sm">
                {formMessage}
              </p>
            )}

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Who is ordering?</legend>
              <div className="grid grid-cols-2 gap-3">
                {ORDER_TYPES.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-field border p-3 text-sm font-medium ${
                      customer.type === option.value
                        ? "border-primary bg-primary/5"
                        : "border-base-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={customer.type === option.value}
                      onChange={() => change("type", option.value)}
                      className="radio radio-primary radio-sm"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {customer.type === "business" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  field="companyName"
                  label="Company name"
                  autoComplete="organization"
                  {...fieldProps}
                />
                <TextField field="companyId" label="Company ID code" {...fieldProps} />
              </div>
            )}

            <TextField
              field="fullName"
              label={customer.type === "business" ? "Contact person" : "Full name"}
              autoComplete="name"
              {...fieldProps}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                field="email"
                label="Email"
                type="email"
                autoComplete="email"
                hint="The invoice is sent here."
                {...fieldProps}
              />
              <TextField
                field="phone"
                label="Phone"
                type="tel"
                autoComplete="tel"
                {...fieldProps}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <TextField
                field="city"
                label="City or town"
                autoComplete="address-level2"
                {...fieldProps}
              />
              <TextField
                field="address"
                label="Street address"
                autoComplete="street-address"
                {...fieldProps}
              />
            </div>

            <FieldShell id="checkout-note" label="Note for the store" hint="Optional.">
              <textarea
                id="checkout-note"
                name="note"
                rows={3}
                maxLength={500}
                value={customer.note}
                onChange={(event) => change("note", event.target.value)}
                className="textarea w-full"
                {...describedBy("checkout-note", "Optional.")}
              />
            </FieldShell>

            <div>
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary btn-block btn-lg"
              >
                {pending ? "Placing order…" : "Place order"}
              </button>
              <p className="mt-3 text-center text-sm text-base-content/70">
                No payment now. We email you the invoice.
              </p>
            </div>
          </form>

          <aside
            aria-labelledby="order-summary-title"
            className="rounded-box border border-base-300 p-5 sm:p-6 lg:sticky lg:top-24"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="order-summary-title" className="text-lg font-semibold">
                Your order
              </h2>
              <Link href={routes.cart} className="link link-primary text-sm font-medium">
                Edit cart
              </Link>
            </div>

            <ul className="mt-4 divide-y divide-base-200 text-sm">
              {cart.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="font-medium">{item.name}</span>
                    <span className="block tabular-nums text-base-content/70">
                      {item.quantity} × {formatPrice(item.price)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatPrice(fromTetri(toTetri(item.price) * item.quantity))}
                  </span>
                </li>
              ))}
            </ul>

            <p className="flex items-baseline justify-between gap-4 border-t border-base-300 pt-4">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatPrice(cart.total)}
              </span>
            </p>
          </aside>
        </div>
      )}
    </Container>
  );
}
