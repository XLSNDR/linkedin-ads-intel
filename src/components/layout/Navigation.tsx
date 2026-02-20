"use client";

import { useState } from "react";
import Link from "next/link";
import { AddAdvertiserModal } from "@/app/(dashboard)/advertisers/AddAdvertiserModal";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/collections", label: "Collections" },
  { href: "/advertisers", label: "Advertisers" },
] as const;

export function Navigation({ role }: { role?: string }) {
  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <>
      <nav className="flex items-center gap-6 border-b border-black/[.08] dark:border-white/[.145] px-6 py-3 font-[family-name:var(--font-geist-sans)]">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="ml-auto text-sm font-medium text-primary hover:underline transition-colors"
          aria-label="Add advertiser"
        >
          + Add advertiser
        </button>
        {role === "admin" && (
          <Link
            href="/admin/advertisers"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin
          </Link>
        )}
      </nav>
      <AddAdvertiserModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </>
  );
}
