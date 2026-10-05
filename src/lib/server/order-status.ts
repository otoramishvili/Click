/*
  Finds an order for the customer's "Order status" page. Runs on the server,
  because customers are not allowed to read the orders collection themselves.
  The order is shown only when BOTH the order number and the email match.
*/
import {
  cleanLookup,
  readStatus,
  validateLookup,
  type StatusLookupResult,
} from "@/lib/order-status";
import { getAdminDb } from "@/lib/server/firebase-admin";

/* The same answer for "no such order" and "wrong email", so nobody can test which orders exist */
const NOT_FOUND =
  "We could not find an order with that number and email. Check both against your invoice email.";

/* Firestore time stamp -> ISO date string, or null */
function toIso(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export async function lookupOrderStatus(raw: unknown): Promise<StatusLookupResult> {
  const lookup = cleanLookup(raw);
  const fieldErrors = validateLookup(lookup);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Some details need fixing.", fieldErrors };
  }

  try {
    /* An order's document ID is its number */
    const snapshot = await getAdminDb().collection("orders").doc(lookup.number).get();
    const data = snapshot.data();

    const customer = (data?.customer ?? {}) as { email?: unknown };
    const orderEmail = typeof customer.email === "string" ? customer.email : "";
    if (!data || orderEmail.trim().toLowerCase() !== lookup.email.toLowerCase()) {
      return { ok: false, message: NOT_FOUND };
    }

    const lines = Array.isArray(data.lines) ? data.lines : [];

    return {
      ok: true,
      order: {
        number: typeof data.number === "number" ? data.number : Number(snapshot.id),
        placedAt: typeof data.placedAt === "string" ? data.placedAt : "",
        status: readStatus(data),
        statusUpdatedAt: toIso(data.statusUpdatedAt),
        deliveredAt: toIso(data.deliveredAt),
        lines: lines.map((line: { name?: unknown; quantity?: unknown }) => ({
          name: typeof line?.name === "string" ? line.name : "",
          quantity: typeof line?.quantity === "number" ? line.quantity : 0,
        })),
        total: typeof data.total === "number" ? data.total : 0,
      },
    };
  } catch (error) {
    console.error("Looking up an order's status failed:", error);
    return {
      ok: false,
      message: "The order could not be looked up. Try again in a minute, or contact us.",
    };
  }
}
