import { ProductGrid } from "@/components/home/product-grid";
import { site } from "@/lib/site";

/* The landing page: the header (from the layout next to this file), then the products. */
export default function HomePage() {
  return (
    <>
      {/* Page title for search engines and screen readers; not shown on screen */}
      <h1 className="sr-only">
        {site.name}: computers, network and power equipment
      </h1>
      <ProductGrid />
    </>
  );
}
