import type { Metadata } from "next";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product/product-card";
import { categories, getCategory, getSubcategory, type Product } from "@/lib/catalog";
import { filterProducts } from "@/lib/product-search";
import { getAllProducts } from "@/lib/server/products";
import { routes } from "@/lib/site";

/* Products per page */
const PAGE_SIZE = 24;

/* What can be in the address: /shop?q=router&category=network&sub=routers&page=2 */
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readFilters(params: Record<string, string | string[] | undefined>) {
  const one = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? "";

  const q = one(params.q).trim().slice(0, 100);
  const category = getCategory(one(params.category));
  const subcategory = category
    ? getSubcategory(category.slug, one(params.sub))
    : undefined;
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);

  return { q, category, subcategory, page };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q, category, subcategory } = readFilters(await searchParams);
  const where = subcategory?.name ?? category?.name ?? "All products";
  return { title: q ? `“${q}” in ${where}` : where };
}

/* A filter button: dark when it is the active one */
function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`btn btn-sm shrink-0 ${active ? "btn-neutral" : ""}`}
    >
      {label}
    </Link>
  );
}

/*
  The product list with search and category filters.
  Everything is driven by the address, so a filtered list can be bookmarked,
  shared, and works with the browser's back button.
*/
export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, category, subcategory, page } = readFilters(await searchParams);

  let all: Product[] = [];
  let failed = false;
  try {
    all = await getAllProducts();
  } catch (error) {
    console.error("Loading products for /shop failed:", error);
    failed = true;
  }

  const results = filterProducts(all, {
    q,
    categorySlug: category?.slug,
    subcategorySlug: subcategory?.slug,
  });

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* The current filters, for building links that change just one of them */
  const current = { q, category: category?.slug, sub: subcategory?.slug };
  const isFiltered = Boolean(q || category);

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="font-wide text-3xl font-bold tracking-tight">
        {subcategory?.name ?? category?.name ?? "All products"}
      </h1>

      {/* Search. The hidden fields keep the chosen category while searching. */}
      <form action={routes.search} role="search" className="join mt-5 w-full max-w-xl">
        {category && <input type="hidden" name="category" value={category.slug} />}
        {subcategory && <input type="hidden" name="sub" value={subcategory.slug} />}
        <label className="input join-item w-full">
          <span className="sr-only">
            Search {category ? `in ${category.name.toLowerCase()}` : "all products"}
          </span>
          <LuSearch className="size-4 shrink-0 opacity-60" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, SKU or category"
            className="grow"
          />
        </label>
        <button type="submit" className="btn btn-primary join-item">
          Search
        </button>
      </form>

      {/* On phones the filter buttons sit in one row that scrolls sideways */}
      <nav
        aria-label="Categories"
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
      >
        <Chip href={routes.shop({ q })} active={!category} label="All" />
        {categories.map((item) => (
          <Chip
            key={item.slug}
            href={routes.shop({ q, category: item.slug })}
            active={category?.slug === item.slug}
            label={item.name}
          />
        ))}
      </nav>

      {category && (
        <nav
          aria-label={`${category.name} subcategories`}
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          <Chip
            href={routes.shop({ q, category: category.slug })}
            active={!subcategory}
            label={`All ${category.name.toLowerCase()}`}
          />
          {category.children.map((child) => (
            <Chip
              key={child.slug}
              href={routes.shop({ q, category: category.slug, sub: child.slug })}
              active={subcategory?.slug === child.slug}
              label={child.name}
            />
          ))}
        </nav>
      )}

      {failed ? (
        <p role="alert" className="alert alert-error alert-soft mt-8 text-sm">
          The products could not be loaded. Reload the page in a minute.
        </p>
      ) : (
        <>
          <p className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-base-300 pb-3 text-sm text-base-content/70">
            <span>
              <strong className="text-base-content">{results.length}</strong>{" "}
              {results.length === 1 ? "product" : "products"}
              {q && <> for “{q}”</>}
            </span>
            {isFiltered && (
              <Link href={routes.shop()} className="link link-primary font-medium">
                Clear search and filters
              </Link>
            )}
          </p>

          {results.length === 0 ? (
            <p className="mt-8 text-base-content/70">
              {isFiltered
                ? "Nothing matches. Try fewer words or another category."
                : "There are no products yet."}
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav aria-label="Pages" className="mt-10 flex items-center gap-4">
              {currentPage > 1 ? (
                <Link
                  href={routes.shop({ ...current, page: currentPage - 1 })}
                  className="btn btn-neutral"
                >
                  Previous page
                </Link>
              ) : (
                <span className="btn btn-disabled" aria-hidden>
                  Previous page
                </span>
              )}
              <span className="text-sm tabular-nums text-base-content/70">
                Page {currentPage} of {pageCount}
              </span>
              {currentPage < pageCount ? (
                <Link
                  href={routes.shop({ ...current, page: currentPage + 1 })}
                  className="btn btn-neutral"
                >
                  Next page
                </Link>
              ) : (
                <span className="btn btn-disabled" aria-hidden>
                  Next page
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </Container>
  );
}
