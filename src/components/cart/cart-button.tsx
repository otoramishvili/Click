"use client";

import Link from "next/link";
import { LuShoppingCart } from "react-icons/lu";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/site";

/* The cart link in the header: icon, number of items, total. */
export function CartButton() {
  const { count, total } = useCart();

  return (
    <Link
      href={routes.cart}
      className="btn btn-ghost"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <span className="indicator">
        <LuShoppingCart className="size-5" aria-hidden />
        {count > 0 && (
          <span className="indicator-item badge badge-primary badge-sm px-1.5 tabular-nums">
            {count}
          </span>
        )}
      </span>
      <span className="hidden tabular-nums lg:inline">{formatPrice(total)}</span>
    </Link>
  );
}
