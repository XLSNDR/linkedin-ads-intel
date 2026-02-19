import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/explore");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
      <div className="border-b border-black/[.08] dark:border-white/[.145] px-6 py-3 flex items-center gap-6">
        <Link
          href="/admin"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Admin
        </Link>
        <Link
          href="/admin/users"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Users
        </Link>
        <Link
          href="/admin/stats"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Stats
        </Link>
        <Link
          href="/admin/advertisers"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Advertisers
        </Link>
        <Link
          href="/admin/import"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Import
        </Link>
      </div>
      {children}
    </div>
  );
}
