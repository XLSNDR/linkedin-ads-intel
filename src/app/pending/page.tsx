import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)] flex items-center justify-center">
      <main className="max-w-md mx-auto px-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">
          Your account is pending approval
        </h1>
        <p className="text-muted-foreground mb-6">
          Thanks for signing up. We&apos;ll email you when your account has been
          approved. You can then log in and start tracking advertisers.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
