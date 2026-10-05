import Link from "next/link";
import { Container } from "@/components/container";
import { routes } from "@/lib/site";

/* Shown when /product/<id> points at a product that does not exist (any more). */
export default function ProductNotFound() {
  return (
    <Container className="py-12 lg:py-20">
      <h1 className="font-wide text-3xl font-bold tracking-tight">
        This product is not in the store
      </h1>
      <p className="mt-3 text-base-content/70">
        It may have been removed, or the link is mistyped.
      </p>
      <Link href={routes.shop()} className="btn btn-primary mt-6">
        See all products
      </Link>
    </Container>
  );
}
