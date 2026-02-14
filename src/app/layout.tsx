import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthNav } from "@/components/layout/AuthNav";
import "./globals.css";

function AuthNavFallback() {
  return (
    <nav className="flex items-center gap-4">
      <a
        href="/sign-in"
        className="text-sm font-medium hover:underline"
      >
        Sign in
      </a>
      <a
        href="/sign-up"
        className="rounded-full bg-foreground text-background text-sm font-medium h-9 px-4 flex items-center justify-center hover:opacity-90"
      >
        Sign up
      </a>
    </nav>
  );
}

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "LinkedIn Ads Intelligence",
  description: "LinkedIn Ads Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <header className="border-b border-black/[.08] dark:border-white/[.145] px-6 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="font-semibold text-lg font-[family-name:var(--font-geist-sans)]"
            >
              LinkedIn Ads Intelligence
            </Link>
            <Suspense fallback={<AuthNavFallback />}>
              <AuthNav />
            </Suspense>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
