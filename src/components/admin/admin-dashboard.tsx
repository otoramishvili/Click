"use client";

import { useEffect, useState } from "react";
import { AddProductForm } from "@/components/admin/add-product-form";
import { CategoryBreakdown } from "@/components/admin/category-breakdown";
import { ProductTable } from "@/components/admin/product-table";
import { StatTiles } from "@/components/admin/stat-tiles";
import { StockImport } from "@/components/admin/stock-import";
import { Container } from "@/components/container";
import type { Product } from "@/lib/catalog";
import { countOrders, fetchAllProducts, type StockChange } from "@/lib/products";

export function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  /* Load the products and the number of orders from Firestore */
  useEffect(() => {
    let cancelled = false;

    fetchAllProducts()
      .then((list) => {
        if (cancelled) return;
        setProducts(list);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        console.error("Loading products failed:", error);
        if (!cancelled) setStatus("failed");
      });

    countOrders()
      .then((count) => {
        if (!cancelled) setOrderCount(count);
      })
      .catch((error: unknown) => {
        console.error("Counting orders failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* A product the form just saved goes on top, without loading everything again */
  function addProduct(product: Product) {
    setProducts((current) => [product, ...current]);
  }

  /* After a stock update, show the new numbers without loading everything again */
  function applyStock(changes: StockChange[]) {
    const stockById = new Map(changes.map((change) => [change.id, change.stock]));
    setProducts((current) =>
      current.map((product) => {
        const stock = stockById.get(product.id);
        return stock === undefined ? product : { ...product, stock, inStock: stock > 0 };
      }),
    );
  }

  return (
    <Container className="py-8 lg:py-12">
      <h1 className="font-wide text-3xl font-bold tracking-tight">Dashboard</h1>

      {status === "loading" && (
        <p className="mt-4 text-base-content/70" role="status">
          Loading products…
        </p>
      )}
      {status === "failed" && (
        <p role="alert" className="alert alert-error alert-soft mt-5 text-sm">
          The products could not be loaded. Check your connection and that the
          Firestore rules are published, then reload the page.
        </p>
      )}

      <StatTiles products={products} orderCount={orderCount} />

      {/* grid-cols-1 keeps the wide product table from stretching the page on phones */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <AddProductForm products={products} onAdd={addProduct} />

        <div className="space-y-8">
          <StockImport products={products} onUpdated={applyStock} />
          <CategoryBreakdown products={products} />
          <ProductTable products={products} />
        </div>
      </div>
    </Container>
  );
}
