/*
  The statuses an order can have, what the admin and the customer see for
  each, and the shape of the customer's "Order status" lookup.
  Used in the browser and on the server. Nothing here touches Firebase.

  To rename a status or change what customers read, edit ORDER_STATUSES.
*/
import { isValidEmail } from "@/lib/validation";

/* The address of the customer's "Order status" page */
export const ORDER_STATUS_URL = "/order-status";

export type OrderStatus = "received" | "paid" | "shipped" | "delivered" | "cancelled";

export const ORDER_STATUSES: {
  id: OrderStatus;
  /* Short name: the admin's buttons and badges, and the customer's progress steps */
  label: string;
  /* The headline and the sentence the customer reads on the Order status page */
  headline: string;
  text: string;
}[] = [
  {
    id: "received",
    label: "Received",
    headline: "Order received",
    text: "We have your order and emailed you the invoice.",
  },
  {
    id: "paid",
    label: "Paid",
    headline: "Payment received",
    text: "We have your payment and are preparing the order.",
  },
  {
    id: "shipped",
    label: "On the way",
    headline: "On the way",
    text: "Your order has left our warehouse.",
  },
  {
    id: "delivered",
    label: "Delivered",
    headline: "Delivered",
    text: "Your order has been delivered.",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    headline: "Cancelled",
    text: "This order was cancelled. If you did not expect that, contact us.",
  },
];

/* The normal path of an order, in order. "cancelled" is not a step on it. */
export const STATUS_STEPS: OrderStatus[] = ["received", "paid", "shipped", "delivered"];

export function statusInfo(status: OrderStatus) {
  return ORDER_STATUSES.find((item) => item.id === status) ?? ORDER_STATUSES[0];
}

/*
  Works out the status of a saved order.
  An order that has a delivery time is delivered, whatever else it says.
  Orders saved before statuses existed have no status field: they count as "received".
*/
export function readStatus(data: { status?: unknown; deliveredAt?: unknown }): OrderStatus {
  if (data.deliveredAt !== undefined && data.deliveredAt !== null) return "delivered";
  const known = ORDER_STATUSES.some(
    (item) => item.id === data.status && item.id !== "delivered",
  );
  return known ? (data.status as OrderStatus) : "received";
}

/* ---- the customer's lookup ---------------------------------------------- */

export type StatusLookup = { number: string; email: string };
export type StatusLookupErrors = Partial<Record<keyof StatusLookup, string>>;

export function cleanLookup(raw: unknown): StatusLookup {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return {
    /* People copy "№ 1001" or "#1001" from the invoice: keep only the digits */
    number: text(source.number).replace(/\D/g, "").slice(0, 12),
    email: text(source.email).slice(0, 200),
  };
}

export function validateLookup(lookup: StatusLookup): StatusLookupErrors {
  const errors: StatusLookupErrors = {};
  if (!lookup.number) {
    errors.number = "Enter the order number from your invoice.";
  }
  if (!lookup.email) {
    errors.email = "Enter the email address you ordered with.";
  } else if (!isValidEmail(lookup.email)) {
    errors.email = "Enter a full email address, like name@example.com.";
  }
  return errors;
}

/* What the customer is shown. No address or phone: only what the invoice already told them. */
export type OrderStatusView = {
  number: number;
  /* ISO dates */
  placedAt: string;
  status: OrderStatus;
  /* When the status was last changed by the store, or null if it never was */
  statusUpdatedAt: string | null;
  deliveredAt: string | null;
  lines: { name: string; quantity: number }[];
  total: number;
};

export type StatusLookupResult =
  | { ok: true; order: OrderStatusView }
  | { ok: false; message: string; fieldErrors?: StatusLookupErrors };
