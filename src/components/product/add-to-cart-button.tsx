"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import type { Product } from "@/lib/catalog";
import { MAX_QUANTITY } from "@/lib/orders";
import { routes } from "@/lib/site";

/*
  "Add to cart" for one product. Used on the product cards and on the product page.
  className sets the size; showCartLink adds a "Go to cart" link once it is in the cart.
*/
export function AddToCartButton({
  product,
  className = "",
  showCartLink = false,
}: {
  product: Product;
  className?: string;
  showCartLink?: boolean;
}) {
  const cart = useCart();
  const inCart = cart.quantityOf(product.id);

  return (
    <>
      <button
        type="button"
        disabled={!product.inStock || inCart >= MAX_QUANTITY}
        onClick={() => cart.add(product)}
        className={`btn btn-primary ${inCart > 0 ? "" : "btn-outline"} ${className}`}
      >
        {!product.inStock
          ? "Out of stock"
          : inCart > 0
            ? `In cart: ${inCart}. Add one more`
            : "Add to cart"}
      </button>

      {showCartLink && inCart > 0 && (
        <Link href={routes.cart} className="btn btn-ghost mt-2 w-full">
          Go to cart
        </Link>
      )}
    </>
  );
}
