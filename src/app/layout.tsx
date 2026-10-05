import type { Metadata } from "next";
import { Archivo, Noto_Sans_Georgian } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { site } from "@/lib/site";
import "./globals.css";

/* Archivo with its width axis, so headings can use the wide cut (font-wide). */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

/* Archivo has no Georgian letters. This font takes over for Georgian text. */
const georgian = Noto_Sans_Georgian({
  subsets: ["georgian"],
  variable: "--font-georgian",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name}: computers, network and power equipment`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
};

/*
  The root of every page: fonts, theme, and the login and cart state.
  The store pages get their header and footer from app/(store)/layout.tsx,
  the admin panel gets its own top bar from app/admin/layout.tsx.
*/
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="store"
      className={`${archivo.variable} ${georgian.variable}`}
    >
      <body className="bg-base-100 font-sans text-base-content antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
