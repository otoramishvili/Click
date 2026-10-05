import type { ReactNode } from "react";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DRAWER_ID } from "@/lib/site";

/*
  The frame of every store page: header, footer and the slide-in mobile menu.
  "(store)" is a route group: the brackets keep it out of the URL, so
  app/(store)/login/page.tsx is still just /login.
*/
export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="drawer">
      <input
        id={DRAWER_ID}
        type="checkbox"
        className="drawer-toggle"
        aria-label="Menu"
      />

      <div className="drawer-content flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>

      <div className="drawer-side z-50">
        <label
          htmlFor={DRAWER_ID}
          aria-label="Close menu"
          className="drawer-overlay"
        />
        <MobileMenu />
      </div>
    </div>
  );
}
