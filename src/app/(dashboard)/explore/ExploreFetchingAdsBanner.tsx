"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const REFRESH_INTERVAL_MS = 6000;
const MAX_ATTEMPTS = 20; // ~2 minutes

export function ExploreFetchingAdsBanner({
  advertiserName,
}: {
  advertiserName: string;
}) {
  const router = useRouter();
  const attemptsRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(t);
        return;
      }
      router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <p className="text-muted-foreground">
        Fetching ads for <strong className="text-foreground">{advertiserName}</strong>…
        This usually takes 30–90 seconds. The page will update automatically.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => router.refresh()}
      >
        Refresh now
      </Button>
    </div>
  );
}
