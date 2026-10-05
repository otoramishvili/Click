"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/catalog";
import { isFirebaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/firebase/client";
import { fetchProductPage, type ProductCursor } from "@/lib/products";

/* Products loaded at first, and again each time "Show more" is pressed */
const PAGE_SIZE = 8;

const LOAD_FAILED =
  "The products could not be loaded. Check your connection and reload the page.";

/* The store's product list: newest first, loaded from Firestore. */
export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "loading-more">(
    "loading",
  );
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  /* Where the next page starts */
  const cursor = useRef<ProductCursor | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setError(NOT_CONFIGURED_MESSAGE);
      setStatus("ready");
      return;
    }

    let cancelled = false;
    fetchProductPage(PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;
        setProducts(page.products);
        setHasMore(page.hasMore);
        cursor.current = page.cursor;
      })
      .catch((reason: unknown) => {
        console.error("Loading products failed:", reason);
        if (!cancelled) setError(LOAD_FAILED);
      })
      .finally(() => {
        if (!cancelled) setStatus("ready");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function showMore() {
    setStatus("loading-more");
    setError("");
    try {
      const page = await fetchProductPage(PAGE_SIZE, cursor.current);
      setProducts((current) => [...current, ...page.products]);
      setHasMore(page.hasMore);
      cursor.current = page.cursor;
    } catch (reason) {
      console.error("Loading more products failed:", reason);
      setError(LOAD_FAILED);
    } finally {
      setStatus("ready");
    }
  }

  return (
    <section className="py-10 lg:py-14">
      <Container>
        <h2 className="font-wide border-b border-base-300 pb-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Latest products
        </h2>

        {status === "loading" ? (
          <p className="mt-8 text-base-content/70" role="status">
            Loading products…
          </p>
        ) : (
          <>
            {error && (
              <p role="alert" className="alert alert-error alert-soft mt-8 text-sm">
                {error}
              </p>
            )}

            {products.length === 0 && !error && (
              <p className="mt-8 text-base-content/70">
                There are no products yet. Add the first one in the admin panel.
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10">
                <button
                  type="button"
                  className="btn btn-neutral"
                  disabled={status === "loading-more"}
                  onClick={showMore}
                >
                  {status === "loading-more" ? "Loading…" : "Show more products"}
                </button>
              </div>
            )}
          </>
        )}
      </Container>
    </section>
  );
}
