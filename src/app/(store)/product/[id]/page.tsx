import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Container } from "@/components/container";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ProductThumb } from "@/components/product/product-thumb";
import { StockStatus } from "@/components/product/stock-status";
import { getCategory, getSubcategory, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getProductById } from "@/lib/server/products";
import { routes } from "@/lib/site";

/* The [id] folder name makes the last part of the address available here */
type Props = { params: Promise<{ id: string }> };

/* cache() lets the page title and the page itself share one database read */
const loadProduct = cache(getProductById);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await loadProduct(id);
    if (!product) return { title: "Product not found" };
    return {
      title: product.name,
      description: product.description.slice(0, 160),
    };
  } catch {
    return { title: "Product" };
  }
}

/* One product: /product/<product id> */
export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  let product: Product | null;
  try {
    product = await loadProduct(id);
  } catch (error) {
    console.error(`Loading product ${id} failed:`, error);
    return (
      <Container className="py-12">
        <p role="alert" className="alert alert-error alert-soft text-sm">
          This product could not be loaded. Reload the page in a minute.
        </p>
      </Container>
    );
  }

  /* Shows not-found.tsx from this folder */
  if (!product) notFound();

  const category = getCategory(product.categorySlug);
  const subcategory = getSubcategory(product.categorySlug, product.subcategorySlug);

  return (
    <Container className="py-8 lg:py-12">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-base-content/70">
          <li>
            <Link href={routes.shop()} className="hover:text-primary hover:underline">
              All products
            </Link>
          </li>
          {category && (
            <li className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <Link
                href={routes.category(category.slug)}
                className="hover:text-primary hover:underline"
              >
                {category.name}
              </Link>
            </li>
          )}
          {category && subcategory && (
            <li className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <Link
                href={routes.subcategory(category.slug, subcategory.slug)}
                className="hover:text-primary hover:underline"
              >
                {subcategory.name}
              </Link>
            </li>
          )}
        </ol>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-[4/3] overflow-hidden rounded-box bg-base-200 sm:aspect-square">
          <ProductThumb product={product} />
        </div>

        <div>
          <h1 className="font-wide text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-sm tabular-nums text-base-content/70">
            SKU {product.sku}
          </p>

          <p className="mt-6 text-3xl font-bold tabular-nums">
            {formatPrice(product.price)}
          </p>
          <StockStatus inStock={product.inStock} className="mt-2" />

          <div className="mt-6 max-w-sm">
            <AddToCartButton product={product} className="btn-lg w-full" showCartLink />
            <p className="mt-3 text-sm text-base-content/70">
              No payment on the site. You get an invoice by email.
            </p>
          </div>

          <h2 className="mt-10 border-t border-base-300 pt-6 text-lg font-semibold">
            Description
          </h2>
          {/* whitespace-pre-line keeps the line breaks typed in the admin panel */}
          <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-base-content/80">
            {product.description}
          </p>
        </div>
      </div>
    </Container>
  );
}
