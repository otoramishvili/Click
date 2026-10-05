"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Container } from "@/components/container";
import { logOut } from "@/lib/auth";
import { isFirebaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/firebase/client";
import { routes } from "@/lib/site";

/*
  Shows the admin panel only to admins. This is the polite part; the real lock
  is firestore.rules, which refuses the data to everyone else no matter what
  the page shows.
*/
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (user && isAdmin) return <>{children}</>;

  return (
    <Container className="py-12 lg:py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="font-wide text-3xl font-bold tracking-tight">Admin panel</h1>

        {!isFirebaseConfigured ? (
          <p role="alert" className="alert alert-error alert-soft mt-5 text-sm">
            {NOT_CONFIGURED_MESSAGE}
          </p>
        ) : loading ? (
          <p className="mt-4 text-base-content/70" role="status">
            Checking your access…
          </p>
        ) : !user ? (
          <>
            <p className="mt-4 text-base-content/70">
              Log in with an admin account to continue.
            </p>
            <Link
              href={`${routes.login}?next=${routes.admin}`}
              className="btn btn-primary mt-5"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-base-content/70">
              <strong className="break-words text-base-content">{user.email}</strong>{" "}
              is not an admin account.
            </p>
            <div className="mt-5 rounded-box border border-base-300 p-5 text-sm leading-relaxed">
              <p>
                To make it one, open Firestore in the Firebase console, create a
                collection named <strong>admins</strong>, and add a document
                with this ID (it can be empty):
              </p>
              <p className="mt-3 break-all rounded-field bg-base-200 p-3 font-medium tabular-nums">
                {user.uid}
              </p>
              <p className="mt-3">Then reload this page.</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost mt-5"
              onClick={() => void logOut()}
            >
              Log out
            </button>
          </>
        )}
      </div>
    </Container>
  );
}
