"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuLayoutGrid } from "react-icons/lu";
import { Container } from "@/components/container";
import { categories } from "@/lib/catalog";
import { routes } from "@/lib/site";

/*
  Desktop "All categories" button with a full-width panel.
  The panel is positioned against the <nav> in site-header.tsx (it is `relative`).
*/
export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Close on Escape or on a click outside the menu */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef}>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        aria-expanded={open}
        aria-controls="category-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <LuLayoutGrid className="size-4" aria-hidden />
        All categories
        <LuChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <div
        id="category-panel"
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 border-b border-base-300 bg-base-100 shadow-xl"
      >
        <Container className="columns-3 gap-10 py-8 xl:columns-4">
          {categories.map((category) => (
            <div key={category.slug} className="mb-8 break-inside-avoid">
              <Link
                href={routes.category(category.slug)}
                onClick={close}
                className="flex items-center gap-2 font-semibold hover:text-primary"
              >
                <category.icon className="size-5 text-primary" aria-hidden />
                {category.name}
              </Link>
              <ul className="mt-3 space-y-2 text-sm text-base-content/70">
                {category.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={routes.subcategory(category.slug, child.slug)}
                      onClick={close}
                      className="hover:text-primary hover:underline"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Container>
      </div>
    </div>
  );
}
