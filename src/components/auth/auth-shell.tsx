import type { ReactNode } from "react";
import { Container } from "@/components/container";

/* Shared frame for the login and signup pages: title, one line under it, the form. */
export function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container className="py-10 lg:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-wide text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-base-content/70">{lead}</p>
        <div className="mt-6 rounded-box border border-base-300 p-5 sm:p-8">
          {children}
        </div>
      </div>
    </Container>
  );
}
