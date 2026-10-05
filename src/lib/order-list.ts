/*
  Reading and managing saved orders in Firestore, in the browser.
  Admins only (firestore.rules).

  HOW THE TWO LISTS WORK
  Firestore can list "the orders that have field X, newest first" without any
  extra setup. So every order carries exactly one of two time stamps:
    createdAt    while it is waiting for delivery (set when the order is placed)
    deliveredAt  once it is marked as delivered
  Setting the status to "Delivered" swaps one for the other, and any other
  status swaps them back. The date the order was placed is always kept in
  placedAt, and the status itself in `status` (see lib/order-status.ts).
*/
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { readStatus, type OrderStatus } from "@/lib/order-status";
import { cleanCustomer, type Order, type OrderLine } from "@/lib/orders";

/* The two lists on the admin Orders page */
export type OrderView = "waiting" | "delivered";

/* The time stamp each list is built from (see the note at the top) */
const LIST_FIELD: Record<OrderView, string> = {
  waiting: "createdAt",
  delivered: "deliveredAt",
};

/* An order as it is saved */
export type StoredOrder = Order & {
  /* Firestore document ID (the order number as text) */
  id: string;
  /* "sent", "failed" or "pending" */
  invoiceEmail: string;
  storeEmail: string;
  /* Set by hand in the admin panel. Customers see it on the Order status page. */
  status: OrderStatus;
  /* When it was marked as delivered (ISO date), or null while it is waiting */
  deliveredAt: string | null;
};

export type OrderCursor = QueryDocumentSnapshot<DocumentData>;

function toLine(raw: unknown): OrderLine {
  const line = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const number = (value: unknown) => (typeof value === "number" ? value : 0);

  return {
    productId: text(line.productId),
    sku: text(line.sku),
    name: text(line.name),
    price: number(line.price),
    quantity: number(line.quantity),
    sum: number(line.sum),
  };
}

function toStoredOrder(snapshot: QueryDocumentSnapshot<DocumentData>): StoredOrder {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    number: typeof data.number === "number" ? data.number : Number(snapshot.id) || 0,
    placedAt: typeof data.placedAt === "string" ? data.placedAt : "",
    customer: cleanCustomer(data.customer),
    lines: Array.isArray(data.lines) ? data.lines.map(toLine) : [],
    total: typeof data.total === "number" ? data.total : 0,
    invoiceEmail: typeof data.invoiceEmail === "string" ? data.invoiceEmail : "pending",
    storeEmail: typeof data.storeEmail === "string" ? data.storeEmail : "pending",
    status: readStatus(data),
    deliveredAt:
      data.deliveredAt instanceof Timestamp
        ? data.deliveredAt.toDate().toISOString()
        : null,
  };
}

/*
  One page of a list, newest first: the waiting orders by when they were
  placed, the delivered ones by when they were delivered.
*/
export async function fetchOrderPage(
  view: OrderView,
  pageSize: number,
  after: OrderCursor | null = null,
): Promise<{ orders: StoredOrder[]; cursor: OrderCursor | null; hasMore: boolean }> {
  const orders = collection(firestore(), "orders");
  const newestFirst = orderBy(LIST_FIELD[view], "desc");
  /* Ask for one extra to learn whether there is another page */
  const pageQuery = after
    ? query(orders, newestFirst, startAfter(after), limit(pageSize + 1))
    : query(orders, newestFirst, limit(pageSize + 1));

  const snapshot = await getDocs(pageQuery);
  const docs = snapshot.docs.slice(0, pageSize);

  return {
    orders: docs.map(toStoredOrder),
    cursor: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snapshot.docs.length > pageSize,
  };
}

/*
  Saves a new status for an order.
  "Delivered" also moves it to the delivered list; any other status moves a
  delivered order back to its old place in the waiting list.
*/
export async function setOrderStatus(order: StoredOrder, status: OrderStatus): Promise<void> {
  const reference = doc(firestore(), "orders", order.id);
  const change = { status, statusUpdatedAt: serverTimestamp() };

  if (status === "delivered") {
    await updateDoc(reference, {
      ...change,
      deliveredAt: serverTimestamp(),
      createdAt: deleteField(),
    });
  } else if (order.deliveredAt) {
    const placed = new Date(order.placedAt);
    await updateDoc(reference, {
      ...change,
      createdAt: Timestamp.fromDate(Number.isNaN(placed.getTime()) ? new Date() : placed),
      deliveredAt: deleteField(),
    });
  } else {
    await updateDoc(reference, change);
  }
}

/* Removes an order for good. Its number is not given to another order. */
export async function deleteOrder(order: StoredOrder): Promise<void> {
  await deleteDoc(doc(firestore(), "orders", order.id));
}
