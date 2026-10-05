import Link from "next/link";
import { routes, site } from "@/lib/site";

/* Text wordmark. Swap the inside of the link for an <img> when there is a logo file. */
export function Logo({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={routes.home}
      onClick={onClick}
      aria-label={`${site.name} home`}
      className={`font-wide text-2xl font-extrabold tracking-tight ${className}`}
    >
      {site.name}
    </Link>
  );
}
