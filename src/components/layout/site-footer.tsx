import Link from "next/link";
import { LuMail, LuMapPin, LuPhone } from "react-icons/lu";
import { Container } from "@/components/container";
import { ORDER_STATUS_URL } from "@/lib/order-status";
import { phoneLink, routes, site } from "@/lib/site";

/* Compact footer: contact details on one line, legal links on the next. */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-neutral text-sm text-neutral-content">
      <Container className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:gap-8">
        <p className="font-wide text-lg font-extrabold tracking-tight text-white">
          {site.name}
        </p>

        <ul className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          {site.phones.map((phone) => (
            <li key={phone}>
              <a
                href={phoneLink(phone)}
                className="flex items-center gap-2 whitespace-nowrap hover:text-white"
              >
                <LuPhone className="size-4 shrink-0" aria-hidden />
                {phone}
              </a>
            </li>
          ))}
          <li>
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-2 hover:text-white"
            >
              <LuMail className="size-4 shrink-0" aria-hidden />
              {site.email}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <LuMapPin className="size-4 shrink-0" aria-hidden />
            {site.address}
          </li>
        </ul>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2.5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href={ORDER_STATUS_URL} className="hover:text-white hover:underline">
                Order status
              </Link>
            </li>
            <li>
              <Link href={routes.contact} className="hover:text-white hover:underline">
                Contact
              </Link>
            </li>
            <li>
              <Link href={routes.terms} className="hover:text-white hover:underline">
                Terms and conditions
              </Link>
            </li>
            <li>
              <Link href={routes.privacy} className="hover:text-white hover:underline">
                Privacy policy
              </Link>
            </li>
          </ul>
        </Container>
      </div>
    </footer>
  );
}
