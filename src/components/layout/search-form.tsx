import { LuSearch } from "react-icons/lu";
import { routes } from "@/lib/site";

/* A plain GET form: submitting goes to /search?q=... No JavaScript needed. */
export function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form action={routes.search} role="search" className={`join ${className}`}>
      <label className="input join-item w-full">
        <span className="sr-only">Search products</span>
        <LuSearch className="size-4 shrink-0 opacity-60" aria-hidden />
        <input
          type="search"
          name="q"
          placeholder="Search by product, brand or model"
          className="grow"
        />
      </label>
      <button type="submit" className="btn btn-primary join-item">
        Search
      </button>
    </form>
  );
}
