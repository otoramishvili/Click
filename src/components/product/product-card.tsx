import Link from "next/link";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ProductThumb } from "@/components/product/product-thumb";
import { StockStatus } from "@/components/product/stock-status";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/site";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="relative flex h-full flex-col">
      {/* Wider picture on phones, where one card fills the row, so the whole card fits on screen */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-box bg-base-200 sm:aspect-square">
        <ProductThumb product={product} />
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="font-semibold leading-snug">
          {/* after:inset-0 stretches the link over the whole card */}
          <Link
            href={routes.product(product.id)}
            className="after:absolute after:inset-0 hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-1 line-clamp-2 text-sm text-base-content/70">
          {product.description}
        </p>

        <StockStatus inStock={product.inStock} className="mt-3" />

        <div className="mt-auto pt-4">
          <p className="text-xl font-bold tabular-nums">
            {formatPrice(product.price)}
          </p>

          {/* relative z-10 keeps the button clickable above the stretched link */}
          <AddToCartButton
            product={product}
            className="btn-sm relative z-10 mt-3 w-full"
          />
        </div>
      </div>
    </article>
  );
}
