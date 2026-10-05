import type { Product } from "@/lib/catalog";

/* The four headline numbers. orderCount is null while it loads or if it could not be read. */
export function StatTiles({
  products,
  orderCount,
}: {
  products: Product[];
  orderCount: number | null;
}) {
  const inStock = products.filter((product) => product.inStock).length;

  const stats = [
    { label: "Total products", value: String(products.length) },
    { label: "In stock", value: String(inStock) },
    { label: "Out of stock", value: String(products.length - inStock) },
    { label: "Orders", value: orderCount === null ? "–" : String(orderCount) },
  ];

  return (
    <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-box border border-base-300 bg-base-300 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1 bg-base-100 p-4 sm:p-5">
          <dt className="text-sm text-base-content/70">{stat.label}</dt>
          <dd className="font-wide text-3xl font-bold tabular-nums">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
