"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 10_000;

export function ExploreScrapingBanner() {
  const [active, setActive] = useState(false);
  const [adsFound, setAdsFound] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/scrape/active");
        if (!res.ok) return;
        const data = await res.json();
        setActive(!!data.active);
        setAdsFound(data.adsFound ?? 0);
        if (data.active) {
          router.refresh();
        }
      } catch {
        // ignore
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  if (!active) return null;

  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
      <span className="font-medium">Scraping in progress</span>
      <span className="text-muted-foreground">
        — New ads are being added. This page refreshes automatically every 10s.
        {adsFound > 0 && ` (${adsFound} saved so far)`}
      </span>
    </div>
  );
}
