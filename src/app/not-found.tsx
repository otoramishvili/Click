import Link from "next/link";
import { Container } from "@/components/container";
import { routes, site } from "@/lib/site";

/* Shown for any address the site does not have. */
export default function NotFound() {
  return (
    <main>
      <Container className="py-16 lg:py-24">
        <p className="font-wide text-2xl font-extrabold tracking-tight">{site.name}</p>
        <h1 className="font-wide mt-8 text-3xl font-bold tracking-tight">
          This page does not exist
        </h1>
        <p className="mt-3 text-base-content/70">
          The link may be old or mistyped.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={routes.home} className="btn btn-primary">
            Go to the store
          </Link>
          <Link href={routes.shop()} className="btn btn-ghost">
            See all products
          </Link>
        </div>
      </Container>
    </main>
  );
}
