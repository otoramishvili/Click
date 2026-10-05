"use client";

import Link from "next/link";
import { LuMail, LuPhone, LuX } from "react-icons/lu";
import { useAuth } from "@/components/auth/auth-provider";
import { Logo } from "@/components/layout/logo";
import { logOut } from "@/lib/auth";
import { categories } from "@/lib/catalog";
import { ORDER_STATUS_URL } from "@/lib/order-status";
import { DRAWER_ID, phoneLink, routes, site } from "@/lib/site";

/*
  Contents of the slide-in menu on phones and tablets.
  Opening and closing is done by the daisyUI drawer checkbox in app/layout.tsx.
  The only JavaScript here closes the drawer after a link is tapped.
*/
export function MobileMenu() {
  const { user, isAdmin } = useAuth();

  function close() {
    const toggle = document.getElementById(DRAWER_ID) as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  }

  return (
    <aside className="flex min-h-full w-80 max-w-[85vw] flex-col bg-base-100">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-base-300 px-4">
        <Logo onClick={close} />
        <label
          htmlFor={DRAWER_ID}
          aria-label="Close menu"
          className="btn btn-ghost btn-square"
        >
          <LuX className="size-5" aria-hidden />
        </label>
      </div>

      <nav aria-label="Categories" className="flex-1">
        <ul className="menu w-full p-3 text-base">
          {categories.map((category) => (
            <li key={category.slug}>
              <details>
                <summary>
                  <category.icon className="size-5 text-primary" aria-hidden />
                  {category.name}
                </summary>
                <ul>
                  <li>
                    <Link href={routes.category(category.slug)} onClick={close}>
                      Everything in {category.name.toLowerCase()}
                    </Link>
                  </li>
                  {category.children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={routes.subcategory(category.slug, child.slug)}
                        onClick={close}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>

        <ul className="menu w-full border-t border-base-300 p-3 text-base">
          <li>
            <Link href={routes.shop()} onClick={close}>
              All products
            </Link>
          </li>
          <li>
            <Link href={ORDER_STATUS_URL} onClick={close}>
              Order status
            </Link>
          </li>
          <li>
            <Link href={routes.contact} onClick={close}>
              Contact
            </Link>
          </li>
        </ul>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-base-300 p-4">
        {user ? (
          <>
            <p className="truncate text-sm text-base-content/70">{user.email}</p>
            {isAdmin && (
              <Link
                href={routes.admin}
                onClick={close}
                className="btn btn-primary btn-block"
              >
                Admin panel
              </Link>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                close();
                void logOut();
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link
              href={routes.login}
              onClick={close}
              className="btn btn-primary btn-block"
            >
              Log in
            </Link>
            <Link
              href={routes.signup}
              onClick={close}
              className="btn btn-ghost btn-block"
            >
              Create an account
            </Link>
          </>
        )}
        <a
          href={phoneLink(site.phone)}
          className="flex items-center gap-2 text-sm"
        >
          <LuPhone className="size-4" aria-hidden />
          {site.phone}
        </a>
        <a
          href={`mailto:${site.email}`}
          className="flex items-center gap-2 text-sm"
        >
          <LuMail className="size-4" aria-hidden />
          {site.email}
        </a>
      </div>
    </aside>
  );
}
