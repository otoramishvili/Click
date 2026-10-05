/*
  The shape of an order and the rules for a valid one.
  Used by the checkout form in the browser AND by the server, so both agree.
  Nothing in this file touches Firebase or email.
*/
import { fromTetri, toTetri } from "@/lib/format";
import { isValidEmail } from "@/lib/validation";

export type CustomerType = "personal" | "business";

export type Customer = {
  type: CustomerType;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  /* Filled in only for a business order */
  companyName: string;
  companyId: string;
  /* Optional message from the customer */
  note: string;
};

export type CustomerErrors = Partial<Record<keyof Customer, string>>;

export const emptyCustomer: Customer = {
  type: "personal",
  fullName: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  companyName: "",
  companyId: "",
  note: "",
};

export const MAX_QUANTITY = 99;
export const MAX_LINES = 50;
const MAX_TEXT = 200;
const MAX_NOTE = 500;

/* A one-line field: line breaks and runs of spaces become a single space */
function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/* A field that may have several lines (the customer's note) */
function longText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/* Turns whatever arrived into a tidy Customer: strings trimmed and cut to length. */
export function cleanCustomer(raw: unknown): Customer {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const type: CustomerType = source.type === "business" ? "business" : "personal";

  return {
    type,
    fullName: text(source.fullName, MAX_TEXT),
    email: text(source.email, MAX_TEXT),
    phone: text(source.phone, 40),
    city: text(source.city, MAX_TEXT),
    address: text(source.address, MAX_TEXT),
    companyName: type === "business" ? text(source.companyName, MAX_TEXT) : "",
    companyId: type === "business" ? text(source.companyId, 40) : "",
    note: longText(source.note, MAX_NOTE),
  };
}

/* Returns a message for every field that needs fixing. Empty object = all good. */
export function validateCustomer(customer: Customer): CustomerErrors {
  const errors: CustomerErrors = {};

  if (customer.fullName.length < 2) {
    errors.fullName = "Enter your full name.";
  }
  if (!customer.email) {
    errors.email = "Enter your email address.";
  } else if (!isValidEmail(customer.email)) {
    errors.email = "Enter a full email address, like name@example.com.";
  }
  if (!customer.phone) {
    errors.phone = "Enter your phone number.";
  } else if (customer.phone.replace(/\D/g, "").length < 9) {
    errors.phone = "Enter the full phone number, like 599 12 34 56.";
  }
  if (!customer.city) {
    errors.city = "Enter the city or town.";
  }
  if (!customer.address) {
    errors.address = "Enter the street address.";
  }
  if (customer.type === "business") {
    if (!customer.companyName) {
      errors.companyName = "Enter the company name.";
    }
    if (!customer.companyId) {
      errors.companyId = "Enter the company ID code.";
    }
  }

  return errors;
}

/* What the browser sends: only IDs and quantities. Prices are looked up on the server. */
export type CartLineInput = { productId: string; quantity: number };

export type OrderInput = {
  customer: Customer;
  items: CartLineInput[];
  /* The total the customer saw. If the real total differs, they are asked to confirm. */
  expectedTotal: number;
};

/* Returns the cleaned item list, or null if it is not a usable cart. */
export function cleanItems(raw: unknown): CartLineInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const quantities = new Map<string, number>();
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const { productId, quantity } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(productId)) {
      return null;
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      return null;
    }
    quantities.set(
      productId,
      Math.min(MAX_QUANTITY, (quantities.get(productId) ?? 0) + quantity),
    );
  }

  if (quantities.size > MAX_LINES) return null;
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

/* A product as the server reads it from the database */
export type StoredProduct = {
  sku: string;
  name: string;
  price: number;
  inStock: boolean;
};

export type OrderLine = {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  sum: number;
};

/* Tells the browser how to bring its cart in line with the database */
export type CartUpdate = {
  productId: string;
  price: number;
  available: boolean;
};

/*
  Prices the cart with the real products.
  `changed` is true when something is unavailable or the total is not the one
  the customer saw; `updates` then says what to change in their cart.
*/
export function priceOrder(
  items: CartLineInput[],
  products: Map<string, StoredProduct>,
  expectedTotal: number,
): {
  lines: OrderLine[];
  total: number;
  changed: boolean;
  hasUnavailable: boolean;
  updates: CartUpdate[];
} {
  const lines: OrderLine[] = [];
  const updates: CartUpdate[] = [];
  let totalTetri = 0;
  let hasUnavailable = false;

  for (const item of items) {
    const product = products.get(item.productId);

    if (!product || !product.inStock || !(product.price > 0)) {
      hasUnavailable = true;
      updates.push({ productId: item.productId, price: 0, available: false });
      continue;
    }

    const sumTetri = toTetri(product.price) * item.quantity;
    totalTetri += sumTetri;
    lines.push({
      productId: item.productId,
      sku: product.sku,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      sum: fromTetri(sumTetri),
    });
    updates.push({ productId: item.productId, price: product.price, available: true });
  }

  const totalChanged = totalTetri !== toTetri(expectedTotal);

  return {
    lines,
    total: fromTetri(totalTetri),
    changed: hasUnavailable || totalChanged,
    hasUnavailable,
    updates,
  };
}

/* A saved order: what the emails are built from */
export type Order = {
  number: number;
  /* ISO date string, for example "2026-10-02T09:30:00.000Z" */
  placedAt: string;
  customer: Customer;
  lines: OrderLine[];
  total: number;
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: number; email: string; invoiceSent: boolean }
  | {
      ok: false;
      message: string;
      fieldErrors?: CustomerErrors;
      updates?: CartUpdate[];
    };
