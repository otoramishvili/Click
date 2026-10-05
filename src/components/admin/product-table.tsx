"use client";

import { useState } from "react";
import { LuPackage } from "react-icons/lu";
import { getCategory, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { formatQuantity } from "@/lib/stock-import";

/* Rows shown before "Show all" is pressed */
const PREVIEW_ROWS = 8;

export function ProductTable({ products }: { products: Product[] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? products : products.slice(0, PREVIEW_ROWS);

  return (
    <section
      aria-labelledby="product-list-title"
      className="rounded-box border border-base-300"
    >
      <div className="flex items-baseline justify-between gap-4 p-5 sm:p-6">
        <h2 id="product-list-title" className="text-lg font-semibold">
          Products
        </h2>
        <p className="text-sm text-base-content/70">Newest first</p>
      </div>

      {/* On narrow screens the table scrolls sideways inside this box */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-y border-base-300 bg-base-200 text-left text-base-content/70">
              <th scope="col" className="px-5 py-2.5 font-medium sm:px-6">
                Product
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                SKU
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Category
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Price
              </th>
              <th scope="col" className="px-5 py-2.5 font-medium sm:px-6">
                Stock
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => {
              const category = getCategory(product.categorySlug);
              const Icon = category?.icon ?? LuPackage;

              return (
                <tr
                  key={product.id}
                  className="border-b border-base-200 last:border-b-0"
                >
                  <td className="px-5 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-field bg-base-200 text-base-content/40">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <Icon className="size-5" aria-hidden />
                        )}
                      </span>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {product.sku}
                  </td>
                  <td className="px-3 py-3">{category?.name ?? "No category"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatPrice(product.price)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                    <span
                      className={`flex items-center gap-2 ${
                        product.inStock ? "text-success" : "text-base-content/60"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          product.inStock ? "bg-success" : "bg-base-content/30"
                        }`}
                        aria-hidden
                      />
                      {!product.inStock
                        ? "Out of stock"
                        : product.stock === undefined
                          ? "In stock"
                          : `${formatQuantity(product.stock)} in stock`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length > PREVIEW_ROWS && (
        <div className="border-t border-base-300 px-3 py-3 sm:px-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? "Show fewer" : `Show all ${products.length} products`}
          </button>
        </div>
      )}
    </section>
  );
}
