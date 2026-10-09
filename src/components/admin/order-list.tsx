"use client";

import { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import { Container } from "@/components/container";
import { errorCode } from "@/lib/firebase/client";
import { formatPrice } from "@/lib/format";
import {
  deleteOrder,
  fetchOrderPage,
  setOrderStatus,
  type OrderCursor,
  type OrderView,
  type StoredOrder,
} from "@/lib/order-list";
import { ORDER_STATUSES, statusInfo, type OrderStatus } from "@/lib/order-status";

/* Orders loaded at first, and again each time "Show older orders" is pressed */
const PAGE_SIZE = 20;

const VIEWS: { id: OrderView; label: string; about: string; empty: string }[] = [
  {
    id: "waiting",
    label: "Invoices",
    about: "Invoiced orders that are not delivered yet, newest first.",
    empty: "No orders are waiting for delivery.",
  },
  {
    id: "delivered",
    label: "Delivered",
    about: "Orders you marked as delivered, latest delivery first.",
    empty:
      "No delivered orders yet. Open an order under Invoices and set its status to “Delivered”.",
  },
];

const LOAD_FAILED =
  "The orders could not be loaded. Check your connection and that the Firestore rules are published, then reload.";

/* Firestore refuses the change when the rules in the console are the old ones */
function explain(reason: unknown, fallback: string): string {
  return errorCode(reason) === "permission-denied"
    ? "This account is not allowed to change orders. Publish the newest firestore.rules in the Firebase console (Firestore Database, Rules tab) and try again."
    : fallback;
}

/* "02.10.2026, 14:05" in Georgian time */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
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

/* Who the order is for: the company, or the person */
function buyerName(order: StoredOrder): string {
  return order.customer.type === "business"
    ? order.customer.companyName
    : order.customer.fullName;
}

function OrderRow({
  order,
  busy,
  onSetStatus,
  onAskDelete,
}: {
  order: StoredOrder;
  /* True while a new status for this order is being saved */
  busy: boolean;
  onSetStatus: (order: StoredOrder, status: OrderStatus) => void;
  onAskDelete: (order: StoredOrder) => void;
}) {
  const { customer } = order;
  const units = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  /* "Received" and "Delivered" need no badge: they are what each list is about */
  const showStatusBadge = order.status !== "received" && order.status !== "delivered";

  return (
    <li>
      {/* <details> opens and closes by itself: click the row to see the whole order */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-4 p-4 hover:bg-base-200 sm:px-6 [&::-webkit-details-marker]:hidden">
          {/* Phones: two short lines on the left. Wider screens: everything in one row. */}
          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-5">
            <p className="flex items-baseline gap-3 whitespace-nowrap">
              <span className="font-semibold tabular-nums sm:w-20">№ {order.number}</span>
              <span className="text-sm tabular-nums text-base-content/70 sm:w-36">
                {formatDateTime(order.placedAt)}
              </span>
            </p>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:mt-0 sm:flex-1 sm:flex-nowrap">
              <span className="min-w-0 truncate font-medium">{buyerName(order)}</span>
              {showStatusBadge && (
                <span
                  className={`badge badge-soft badge-sm shrink-0 ${
                    order.status === "cancelled" ? "badge-error" : "badge-primary"
                  }`}
                >
                  {statusInfo(order.status).label}
                </span>
              )}
              {order.invoiceEmail !== "sent" && (
                <span className="badge badge-error badge-soft badge-sm shrink-0">
                  Invoice {order.invoiceEmail === "failed" ? "not sent" : "pending"}
                </span>
              )}
              <span className="whitespace-nowrap text-sm text-base-content/70 sm:ml-auto">
                {units} {units === 1 ? "item" : "items"}
              </span>
            </p>
          </div>
          <span className="whitespace-nowrap text-right font-bold tabular-nums sm:w-28">
            {formatPrice(order.total)}
          </span>
          <LuChevronDown
            className="size-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>

        <div className="grid grid-cols-1 gap-6 border-t border-base-200 bg-base-200/40 p-4 sm:px-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="text-sm leading-relaxed">
            <p className="text-base-content/70">
              {customer.type === "business" ? "Company order" : "Personal order"}
            </p>
            {customer.type === "business" && (
              <>
                <p className="mt-1 font-semibold">{customer.companyName}</p>
                <p>ID code: {customer.companyId}</p>
                <p>Contact: {customer.fullName}</p>
              </>
            )}
            {customer.type === "personal" && (
              <>
                <p className="mt-1 font-semibold">{customer.fullName}</p>
                {customer.personalId && <p>Personal ID: {customer.personalId}</p>}
              </>
            )}
            <p>
              {customer.address}, {customer.city}
            </p>
            <p>
              <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="link link-primary">
                {customer.phone}
              </a>
            </p>
            <p>
              <a href={`mailto:${customer.email}`} className="link link-primary break-words">
                {customer.email}
              </a>
            </p>
            {customer.note && (
              <p className="mt-3 rounded-field bg-base-100 p-3">
                <span className="text-base-content/70">Note: </span>
                {customer.note}
              </p>
            )}
            <p className="mt-3 text-base-content/70">
              Invoice email: {order.invoiceEmail}. Store email: {order.storeEmail}.
            </p>
            {order.deliveredAt && (
              <p className="mt-1 font-medium text-success">
                Delivered: {formatDateTime(order.deliveredAt)}
              </p>
            )}
          </div>

          <div className="text-sm">
            {/* On phones SKU, quantity and price move under the product name */}
            <table className="w-full">
              <thead>
                <tr className="text-left text-base-content/70">
                  <th scope="col" className="pb-2 pr-3 font-medium">Product</th>
                  <th scope="col" className="hidden pb-2 pr-3 font-medium sm:table-cell">SKU</th>
                  <th scope="col" className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">Qty</th>
                  <th scope="col" className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">Price</th>
                  <th scope="col" className="pb-2 text-right font-medium">Sum</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.productId} className="border-t border-base-300 align-top">
                    <td className="py-2 pr-3 font-medium">
                      {line.name}
                      <span className="block font-normal tabular-nums text-base-content/70 sm:hidden">
                        {line.sku}, {line.quantity} × {formatPrice(line.price)}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap py-2 pr-3 tabular-nums sm:table-cell">
                      {line.sku}
                    </td>
                    <td className="hidden py-2 pr-3 text-right tabular-nums sm:table-cell">
                      {line.quantity}
                    </td>
                    <td className="hidden whitespace-nowrap py-2 pr-3 text-right tabular-nums sm:table-cell">
                      {formatPrice(line.price)}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right tabular-nums">
                      {formatPrice(line.sum)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="flex justify-between gap-4 border-t border-base-300 pt-2 font-medium">
              <span>Total</span>
              <span className="whitespace-nowrap font-bold tabular-nums">
                {formatPrice(order.total)}
              </span>
            </p>
          </div>

          {/* The order's status, set by hand, and the delete button */}
          <div className="border-t border-base-300 pt-4 lg:col-span-2">
            <p id={`status-label-${order.id}`} className="text-sm font-medium">
              Status{" "}
              <span className="font-normal text-base-content/70">
                (the customer sees it on the Order status page)
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-labelledby={`status-label-${order.id}`}
                className="flex flex-wrap gap-2"
              >
                {ORDER_STATUSES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={item.id === order.status}
                    onClick={() => onSetStatus(order, item.id)}
                    className={`btn btn-sm ${item.id === order.status ? "btn-neutral" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {busy && (
                <span role="status" className="text-sm text-base-content/70">
                  Saving…
                </span>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onAskDelete(order)}
                className="btn btn-error btn-outline btn-sm ml-auto"
              >
                Delete order
              </button>
            </div>
          </div>
        </div>
      </details>
    </li>
  );
}

/*
  The "are you sure?" window for deleting an order. It is shown whenever
  `order` is set, and closes when the admin keeps the order or presses Escape.
*/
function DeleteOrderDialog({
  order,
  onClose,
  onDeleted,
}: {
  order: StoredOrder | null;
  onClose: () => void;
  onDeleted: (order: StoredOrder) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  /* Open the window when an order is handed in, close it when it is taken away */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (order && !dialog.open) dialog.showModal();
    if (!order && dialog.open) dialog.close();
  }, [order]);

  function close() {
    if (deleting) return;
    setError("");
    onClose();
  }

  async function confirmDelete() {
    if (!order) return;
    setDeleting(true);
    setError("");
    try {
      await deleteOrder(order);
    } catch (reason) {
      console.error("Deleting the order failed:", reason);
      setError(
        explain(reason, "The order could not be deleted. Check your connection and try again."),
      );
      return;
    } finally {
      setDeleting(false);
    }
    onDeleted(order);
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="delete-order-title"
      /* Escape closes a <dialog> by itself; this keeps our state in step with it */
      onClose={close}
      onCancel={(event) => {
        if (deleting) event.preventDefault();
      }}
    >
      {order && (
        <div className="modal-box">
          <h2 id="delete-order-title" className="text-lg font-semibold">
            Delete order № {order.number}?
          </h2>
          <p className="mt-3">
            <span className="font-medium">{buyerName(order)}</span>,{" "}
            <span className="tabular-nums">{formatPrice(order.total)}</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-base-content/70">
            The order is removed from the site for good and cannot be brought
            back. The invoice email the customer received stays in their inbox.
          </p>
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <p className="mt-3 text-sm font-medium">
              This order is not marked as delivered.
            </p>
          )}

          {error && (
            <p role="alert" className="alert alert-error alert-soft mt-4 text-sm">
              {error}
            </p>
          )}

          <div className="modal-action">
            {/* First in the row, so it is the button that has focus when the window opens */}
            <button type="button" className="btn" disabled={deleting} onClick={close}>
              Keep order
            </button>
            <button
              type="button"
              className="btn btn-error"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Delete order"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/*
  The /admin/orders page. Two lists: "Invoices" (not delivered yet) and
  "Delivered". Click an order to open it, change its status, or delete it.
*/
export function OrderList() {
  const [view, setView] = useState<OrderView>("waiting");
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "loading-more">("loading");
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  /* A short confirmation after an order was moved or deleted */
  const [notice, setNotice] = useState("");
  /* The order whose new status is being saved right now */
  const [busyId, setBusyId] = useState<string | null>(null);
  /* The order the "are you sure?" window is asking about */
  const [orderToDelete, setOrderToDelete] = useState<StoredOrder | null>(null);
  const cursor = useRef<OrderCursor | null>(null);

  const current = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  /* Load the first page of the chosen list */
  useEffect(() => {
    let cancelled = false;
    fetchOrderPage(view, PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;
        setOrders(page.orders);
        setHasMore(page.hasMore);
        cursor.current = page.cursor;
      })
      .catch((reason: unknown) => {
        console.error("Loading orders failed:", reason);
        if (!cancelled) setError(LOAD_FAILED);
      })
      .finally(() => {
        if (!cancelled) setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  function switchView(next: OrderView) {
    if (next === view) return;
    setView(next);
    setStatus("loading");
    setOrders([]);
    setHasMore(false);
    setError("");
    setNotice("");
    cursor.current = null;
  }

  async function showMore() {
    setStatus("loading-more");
    setError("");
    try {
      const page = await fetchOrderPage(view, PAGE_SIZE, cursor.current);
      setOrders((list) => [...list, ...page.orders]);
      setHasMore(page.hasMore);
      cursor.current = page.cursor;
    } catch (reason) {
      console.error("Loading more orders failed:", reason);
      setError(LOAD_FAILED);
    } finally {
      setStatus("ready");
    }
  }

  /* One of the status buttons of an order was pressed */
  async function changeStatus(order: StoredOrder, status: OrderStatus) {
    if (status === order.status) return;

    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      await setOrderStatus(order, status);
    } catch (reason) {
      console.error("Changing the order's status failed:", reason);
      setError(
        explain(reason, "The status could not be changed. Check your connection and try again."),
      );
      return;
    } finally {
      setBusyId(null);
    }

    const label = statusInfo(status).label;
    const wasDelivered = order.status === "delivered";
    const isDelivered = status === "delivered";

    if (wasDelivered !== isDelivered) {
      /* The order now belongs to the other list, so it leaves this one */
      setOrders((list) => list.filter((item) => item.id !== order.id));
      setNotice(
        isDelivered
          ? `Order № ${order.number} is marked as delivered. It is now under Delivered.`
          : `Order № ${order.number} is now “${label}”. It is back under Invoices.`,
      );
    } else {
      setOrders((list) =>
        list.map((item) => (item.id === order.id ? { ...item, status } : item)),
      );
      setNotice(`Order № ${order.number} is now “${label}”.`);
    }
  }

  function askDelete(order: StoredOrder) {
    setNotice("");
    setOrderToDelete(order);
  }

  function handleDeleted(order: StoredOrder) {
    setOrders((list) => list.filter((item) => item.id !== order.id));
    setOrderToDelete(null);
    setNotice(`Order № ${order.number} is deleted.`);
  }

  return (
    <Container className="py-8 lg:py-12">
      <h1 className="font-wide text-3xl font-bold tracking-tight">Orders</h1>

      <div role="tablist" aria-label="Order lists" className="join mt-5">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === view}
            onClick={() => switchView(item.id)}
            className={`btn btn-sm join-item ${item.id === view ? "btn-neutral" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-base-content/70">{current.about}</p>

      {notice && (
        <p role="status" className="alert alert-success alert-soft mt-5 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="alert alert-error alert-soft mt-5 text-sm">
          {error}
        </p>
      )}

      {status === "loading" ? (
        <p className="mt-5 text-base-content/70" role="status">
          Loading orders…
        </p>
      ) : (
        <>
          {orders.length === 0 && !error && !hasMore && (
            <p className="mt-5 text-base-content/70">{current.empty}</p>
          )}

          {orders.length > 0 && (
            <ul className="mt-5 divide-y divide-base-300 overflow-hidden rounded-box border border-base-300">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  busy={busyId === order.id}
                  onSetStatus={changeStatus}
                  onAskDelete={askDelete}
                />
              ))}
            </ul>
          )}

          {hasMore && (
            <button
              type="button"
              className="btn btn-neutral mt-6"
              disabled={status === "loading-more"}
              onClick={showMore}
            >
              {status === "loading-more" ? "Loading…" : "Show older orders"}
            </button>
          )}
        </>
      )}

      <DeleteOrderDialog
        order={orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onDeleted={handleDeleted}
      />
    </Container>
  );
}
