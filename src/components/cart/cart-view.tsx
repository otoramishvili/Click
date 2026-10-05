"use client";

import Link from "next/link";
import { LuMinus, LuPackage, LuPlus, LuTrash2 } from "react-icons/lu";
import { useCart } from "@/components/cart/cart-provider";
import { Container } from "@/components/container";
import { formatPrice, fromTetri, toTetri } from "@/lib/format";
import { MAX_QUANTITY } from "@/lib/orders";
import { routes } from "@/lib/site";

/* The /cart page: every product in the cart, with quantity controls and the total. */
export function CartView() {
  const cart = useCart();

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="font-wide text-3xl font-bold tracking-tight">Cart</h1>

      {!cart.ready ? (
        <p className="mt-6 text-base-content/70" role="status">
          Loading your cart…
        </p>
      ) : cart.items.length === 0 ? (
        <div className="mt-6">
          <p className="text-base-content/70">Your cart is empty.</p>
          <Link href={routes.home} className="btn btn-primary mt-5">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <ul className="divide-y divide-base-300 rounded-box border border-base-300">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-4 p-4 sm:p-5">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-field bg-base-200 text-base-content/30 sm:size-20">
                  {item.image ? (
                    <img src={item.image} alt="" className="size-full object-cover" />
                  ) : (
                    <LuPackage className="size-7" aria-hidden />
                  )}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{item.name}</p>
                    <p className="mt-1 text-sm tabular-nums text-base-content/70">
                      SKU {item.sku}, {formatPrice(item.price)} each
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
                    <div className="join">
                      <button
                        type="button"
                        className="btn btn-square btn-sm join-item"
                        aria-label={`One less ${item.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => cart.setQuantity(item.id, item.quantity - 1)}
                      >
                        <LuMinus className="size-4" aria-hidden />
                      </button>
                      <span
                        className="join-item grid h-8 min-w-10 place-items-center border-y border-base-300 px-2 text-sm font-medium tabular-nums"
                        aria-label={`Quantity: ${item.quantity}`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="btn btn-square btn-sm join-item"
                        aria-label={`One more ${item.name}`}
                        disabled={item.quantity >= MAX_QUANTITY}
                        onClick={() => cart.setQuantity(item.id, item.quantity + 1)}
                      >
                        <LuPlus className="size-4" aria-hidden />
                      </button>
                    </div>

                    <p className="whitespace-nowrap text-right font-bold tabular-nums sm:w-28">
                      {formatPrice(fromTetri(toTetri(item.price) * item.quantity))}
                    </p>

                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-sm"
                      aria-label={`Remove ${item.name} from the cart`}
                      onClick={() => cart.remove(item.id)}
                    >
                      <LuTrash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-box border border-base-300 p-5 sm:p-6">
            <p className="flex items-baseline justify-between gap-4">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatPrice(cart.total)}
              </span>
            </p>
            <p className="mt-2 text-sm text-base-content/70">
              No payment on the site. You get an invoice by email.
            </p>
            <Link href={routes.checkout} className="btn btn-primary btn-block mt-5">
              Go to checkout
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}
