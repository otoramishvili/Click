"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/site";

const links = [
  { href: routes.admin, label: "Dashboard" },
  { href: routes.adminOrders, label: "Orders" },
];

/* The two sections of the admin panel. The one you are on is underlined. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="border-b border-base-300">
      <ul className="mx-auto flex w-full max-w-7xl gap-1 px-4 sm:px-6 lg:px-8">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px block border-b-2 px-3 py-3 text-sm font-medium ${
                  active
                    ? "border-base-content"
                    : "border-transparent text-base-content/70 hover:text-base-content"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
