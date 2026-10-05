import Link from "next/link";
import { LuMail, LuMenu, LuPhone } from "react-icons/lu";
import { CartButton } from "@/components/cart/cart-button";
import { Container } from "@/components/container";
import { AccountMenu } from "@/components/layout/account-menu";
import { CategoryMenu } from "@/components/layout/category-menu";
import { Logo } from "@/components/layout/logo";
import { SearchForm } from "@/components/layout/search-form";
import { categories } from "@/lib/catalog";
import { ORDER_STATUS_URL } from "@/lib/order-status";
import { DRAWER_ID, phoneLink, routes, site } from "@/lib/site";

export function SiteHeader() {
  return (
    <>
      {/* Top strip */}
      <div className="bg-neutral text-sm text-neutral-content">
        <Container className="flex min-h-10 items-center justify-between gap-6 py-2">
          <p>
            Order online and get your invoice by email.
            <span className="hidden sm:inline"> No card needed.</span>
          </p>
          <div className="hidden shrink-0 items-center gap-6 md:flex">
            <a
              href={phoneLink(site.phone)}
              className="flex items-center gap-2 hover:text-white"
            >
              <LuPhone className="size-4" aria-hidden />
              {site.phone}
            </a>
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-2 hover:text-white"
            >
              <LuMail className="size-4" aria-hidden />
              {site.email}
            </a>
          </div>
        </Container>
      </div>

      {/* Main bar: stays at the top while scrolling */}
      <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100">
        <Container className="flex h-16 items-center gap-2 md:gap-5 lg:h-20 lg:gap-8">
          <label
            htmlFor={DRAWER_ID}
            aria-label="Open menu"
            className="btn btn-ghost btn-square drawer-button -ml-2 lg:hidden"
          >
            <LuMenu className="size-6" aria-hidden />
          </label>

          <Logo />

          <SearchForm className="hidden max-w-2xl flex-1 md:flex" />

          <div className="ml-auto flex items-center">
            <AccountMenu />
            <CartButton />
          </div>
        </Container>
      </header>

      {/* Search gets its own row on phones */}
      <div className="border-b border-base-300 md:hidden">
        <Container className="py-3">
          <SearchForm className="flex w-full" />
        </Container>
      </div>

      {/* Category row, desktop only. Phones use the slide-in menu. */}
      <nav
        aria-label="Main"
        className="relative hidden border-b border-base-300 lg:block"
      >
        <Container className="flex h-12 items-center gap-6 text-sm font-medium">
          <CategoryMenu />

          <ul className="hidden items-center gap-6 xl:flex">
            {categories.slice(0, 4).map((category) => (
              <li key={category.slug}>
                <Link
                  href={routes.category(category.slug)}
                  className="hover:text-primary"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="ml-auto flex items-center gap-6">
            <li>
              <Link href={routes.shop()} className="hover:text-primary">
                All products
              </Link>
            </li>
            <li>
              <Link href={ORDER_STATUS_URL} className="hover:text-primary">
                Order status
              </Link>
            </li>
            <li>
              <Link href={routes.contact} className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </Container>
      </nav>
    </>
  );
}
