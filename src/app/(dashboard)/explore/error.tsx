"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log so it appears in Vercel Function Logs
    console.error("[Explore page error]", error?.message, error?.digest, error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-center max-w-md">
        The Explore page could not load. This has been logged. If it keeps
        happening, check your Vercel project → Logs (or the deployment’s
        Function logs) for &quot;[Explore page error]&quot; to see the cause.
      </p>
      {error?.digest && (
        <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted/80"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
