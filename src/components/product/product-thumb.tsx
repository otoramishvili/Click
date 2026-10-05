import { LuPackage } from "react-icons/lu";
import { getCategory, type Product } from "@/lib/catalog";

/*
  Fills its parent, which must be `relative` with a fixed shape (see ProductCard).
  Shows the product photo when there is one, otherwise the category icon.
*/
export function ProductThumb({ product }: { product: Product }) {
  if (product.image) {
    return (
      // Plain <img> keeps the first version simple. Switch to next/image once
      // the photos are hosted (Firebase Storage) and the host is allowed in next.config.ts.
      <img
        src={product.image}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-contain p-6"
      />
    );
  }

  const Icon = getCategory(product.categorySlug)?.icon ?? LuPackage;

  return (
    <div className="absolute inset-0 grid place-items-center text-base-content/25">
      <Icon className="size-14 sm:size-16" aria-hidden />
    </div>
  );
}
