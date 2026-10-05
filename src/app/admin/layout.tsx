import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminNav } from "@/components/admin/admin-nav";
import { Container } from "@/components/container";
import { AccountMenu } from "@/components/layout/account-menu";
import { Logo } from "@/components/layout/logo";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Admin",
  /* Keep the admin panel out of search engines */
  robots: { index: false, follow: false },
};

/*
  The frame of the admin panel: a plain top bar and the Dashboard / Orders tabs.
  AdminGate shows the page only to admin accounts.
*/
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-base-300">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="badge badge-neutral">Admin</span>
          </div>
          <div className="flex items-center">
            <Link href={routes.home} className="btn btn-ghost">
              View store
            </Link>
            <AccountMenu />
          </div>
        </Container>
      </header>
      <AdminNav />
      <main className="flex-1">
        <AdminGate>{children}</AdminGate>
      </main>
    </div>
  );
}
