"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LuUser } from "react-icons/lu";
import { useAuth } from "@/components/auth/auth-provider";
import { logOut } from "@/lib/auth";
import { routes } from "@/lib/site";

/* Header button: "Log in" for visitors, a small menu for logged-in users. */
export function AccountMenu() {
  const { user, isAdmin, loading } = useAuth();
  const menuRef = useRef<HTMLDetailsElement>(null);

  /* Close the menu when the user clicks anywhere else */
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const close = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  /* Keeps the header from jumping while Firebase works out who is logged in */
  if (loading) {
    return <span className="btn btn-ghost invisible" aria-hidden>Log in</span>;
  }

  if (!user) {
    return (
      <Link href={routes.login} className="btn btn-ghost" aria-label="Log in">
        <LuUser className="size-5" aria-hidden />
        <span className="hidden sm:inline">Log in</span>
      </Link>
    );
  }

  return (
    <details ref={menuRef} className="dropdown dropdown-end">
      <summary className="btn btn-ghost" aria-label={`Account: ${user.name}`}>
        <LuUser className="size-5" aria-hidden />
        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
      </summary>
      <ul className="menu dropdown-content z-50 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
        <li className="menu-title truncate font-normal">{user.email}</li>
        {isAdmin && (
          <li>
            <Link href={routes.admin} onClick={close}>
              Admin panel
            </Link>
          </li>
        )}
        <li>
          <button
            type="button"
            onClick={() => {
              close();
              void logOut();
            }}
          >
            Log out
          </button>
        </li>
      </ul>
    </details>
  );
}
