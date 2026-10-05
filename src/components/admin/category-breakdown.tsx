import { categories, type Product } from "@/lib/catalog";

/* How many products each category holds, fullest first. Empty categories show 0. */
export function CategoryBreakdown({ products }: { products: Product[] }) {
  const rows = categories
    .map((category) => ({
      category,
      count: products.filter((product) => product.categorySlug === category.slug)
        .length,
    }))
    .sort((a, b) => b.count - a.count);

  const largest = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section
      aria-labelledby="by-category-title"
      className="rounded-box border border-base-300 p-5 sm:p-6"
    >
      <h2 id="by-category-title" className="text-lg font-semibold">
        Products by category
      </h2>

      <ul className="mt-4 space-y-3 text-sm">
        {rows.map(({ category, count }) => (
          <li
            key={category.slug}
            className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_2rem] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_2rem]"
          >
            <span className="truncate">{category.name}</span>
            <span
              className="block h-2 overflow-hidden rounded-full bg-base-200"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${(count / largest) * 100}%` }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
