import Link from "next/link";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/collections", label: "Collections" },
  { href: "/advertisers", label: "Advertisers" },
] as const;

export function Navigation() {
  return (
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
    </nav>
  );
}
