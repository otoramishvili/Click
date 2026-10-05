/*
  Search and filtering for the product list. Works on products that are
  already loaded; nothing here touches Firebase.
*/
import { getCategory, getSubcategory, type Product } from "@/lib/catalog";

export type ProductFilter = {
  /* What the customer typed. Every word must appear somewhere in the product. */
  q?: string;
  categorySlug?: string;
  subcategorySlug?: string;
};

/* The text a search looks through: name, SKU, description, category names */
function searchableText(product: Product): string {
  const category = getCategory(product.categorySlug);
  const subcategory = getSubcategory(product.categorySlug, product.subcategorySlug);
  return [
    product.name,
    product.sku,
    product.description,
    category?.name ?? "",
    subcategory?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function filterProducts(products: Product[], filter: ProductFilter): Product[] {
  const words = (filter.q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "");

  return products.filter((product) => {
    if (filter.categorySlug && product.categorySlug !== filter.categorySlug) {
      return false;
    }
    if (filter.subcategorySlug && product.subcategorySlug !== filter.subcategorySlug) {
      return false;
    }
    if (words.length === 0) return true;

    const text = searchableText(product);
    return words.every((word) => text.includes(word));
  });
}
