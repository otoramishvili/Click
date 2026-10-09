/*
  What happens when a customer presses "Place order". Runs on the server.

    1. Check the form and the cart
    2. Look up the real products and prices in the database
    3. Give the order the next invoice number and save it
    4. Make the PDF invoice
    5. Email the invoice to the customer and the order to the store,
       both with the PDF attached
*/
import { FieldValue } from "firebase-admin/firestore";
import { getCategory, getSubcategory } from "@/lib/catalog";
import {
  cleanCustomer,
  cleanItems,
  priceOrder,
  validateCustomer,
  type Order,
  type PlaceOrderResult,
  type StoredProduct,
} from "@/lib/orders";
import { sendEmail, type EmailAttachment, type EmailResult } from "@/lib/server/email";
import { invoiceEmail, storeOrderEmail } from "@/lib/server/email-templates";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { buildInvoicePdf, invoiceFileName } from "@/lib/server/invoice-pdf";

/* The first order gets this number + 1 */
const FIRST_ORDER_NUMBER = 1000;

const TRY_AGAIN =
  "The order could not be placed. Nothing was sent. Try again in a minute, or contact us.";

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  /* 1. Check the form and the cart. Never trust what the browser sends. */
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  const customer = cleanCustomer(input.customer);
  const fieldErrors = validateCustomer(customer);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Some details need fixing.", fieldErrors };
  }

  const items = cleanItems(input.items);
  if (!items) {
    return { ok: false, message: "Your cart is empty. Add a product first." };
  }
  const expectedTotal =
    typeof input.expectedTotal === "number" ? input.expectedTotal : -1;

  try {
    const db = getAdminDb();

    /* 2. Look up the real products. The browser only sent IDs and quantities. */
    const snapshots = await db.getAll(
      ...items.map((item) => db.collection("products").doc(item.productId)),
    );
    const products = new Map<string, StoredProduct>();
    for (const snapshot of snapshots) {
      const data = snapshot.data();
      if (!data) continue;
      const categorySlug = String(data.categorySlug ?? "");
      const subcategorySlug = String(data.subcategorySlug ?? "");
      products.set(snapshot.id, {
        sku: String(data.sku ?? ""),
        name: String(data.name ?? ""),
        /* "Cartridges" rather than "Printers and scanners", when the product has both */
        category:
          getSubcategory(categorySlug, subcategorySlug)?.name ??
          getCategory(categorySlug)?.name ??
          "",
        price: Number(data.price ?? 0),
        inStock: data.inStock !== false,
      });
    }

    const priced = priceOrder(items, products, expectedTotal);
    if (priced.changed) {
      return {
        ok: false,
        message: priced.hasUnavailable
          ? "Some products are no longer available, so we took them out of your cart. Check the order and place it again."
          : "Prices changed after you filled your cart, so we updated it. Check the total and place the order again.",
        updates: priced.updates,
      };
    }

    /* 3. Take the next invoice number and save the order, in one step, so two
          orders placed at the same moment can never get the same number. */
    const counterRef = db.collection("counters").doc("orders");
    const placedAt = new Date().toISOString();

    const number = await db.runTransaction(async (transaction) => {
      const counter = await transaction.get(counterRef);
      const last = Number(counter.data()?.last ?? FIRST_ORDER_NUMBER);
      const next = last + 1;

      transaction.set(counterRef, { last: next });
      transaction.set(db.collection("orders").doc(String(next)), {
        number: next,
        placedAt,
        /* Also what puts the order in the admin's "Invoices" list (see lib/order-list.ts) */
        createdAt: FieldValue.serverTimestamp(),
        customer,
        lines: priced.lines,
        total: priced.total,
        invoiceEmail: "pending",
        storeEmail: "pending",
        /* Changed by hand in the admin panel (see lib/order-status.ts) */
        status: "received",
      });

      return next;
    });

    const order: Order = {
      number,
      placedAt,
      customer,
      lines: priced.lines,
      total: priced.total,
    };

    /* The order is already saved, so from here on the customer must be told
       it was received, whatever goes wrong: a failed PDF or email does not
       lose the order. */

    /* 4. Make the PDF invoice. If that fails, the emails still go out without it. */
    let attachments: EmailAttachment[] | undefined;
    try {
      attachments = [{ filename: invoiceFileName(order), content: buildInvoicePdf(order) }];
    } catch (error) {
      console.error(`Order ${number}: the PDF invoice could not be made:`, error);
    }
    const hasPdf = attachments !== undefined;

    /* 5. Send the emails. The invoice goes first, so the store's email can
          say whether the customer got it. */
    let invoiceSent = false;
    try {
      const storeInbox = process.env.ORDER_NOTIFICATION_EMAIL;

      const invoiceResult = await sendEmail({
        to: customer.email,
        replyTo: storeInbox || undefined,
        attachments,
        ...invoiceEmail(order, hasPdf),
      });
      invoiceSent = invoiceResult.ok;

      let storeResult: EmailResult;
      if (storeInbox) {
        storeResult = await sendEmail({
          to: storeInbox,
          replyTo: customer.email,
          attachments,
          ...storeOrderEmail(order, invoiceResult.ok, hasPdf),
        });
      } else {
        console.error(
          "ORDER_NOTIFICATION_EMAIL is missing in .env.local: the store was not told about this order",
        );
        storeResult = { ok: false, reason: "No store inbox" };
      }

      /* Note on the order whether each email went out, for looking up later */
      await db
        .collection("orders")
        .doc(String(number))
        .update({
          invoiceEmail: invoiceResult.ok ? "sent" : "failed",
          storeEmail: storeResult.ok ? "sent" : "failed",
        });
    } catch (error) {
      console.error(`Order ${number} is saved, but its emails or their status failed:`, error);
    }

    return {
      ok: true,
      orderNumber: number,
      email: customer.email,
      invoiceSent,
    };
  } catch (error) {
    console.error("Placing the order failed:", error);
    return { ok: false, message: TRY_AGAIN };
  }
}
