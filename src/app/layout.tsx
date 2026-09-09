import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { t } from "@/lib/i18n/messages";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Albion Comp Maker",
  description:
    "Monte comps de Albion Online e exporte cards prontos para o Discord.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-surface)] focus:px-4 focus:py-2 focus:text-foreground"
          >
            {t(locale, "a11y.skipToContent")}
          </a>
          <Header />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
