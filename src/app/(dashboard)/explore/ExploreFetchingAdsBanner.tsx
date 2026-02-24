"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 8000;
const NO_NEW_ADS_DONE_MS = 2 * 60 * 1000;

export function ExploreFetchingAdsBanner({
  advertiserName,
  currentAdCount,
  hasRunningScrape,
}: {
  advertiserName: string;
  currentAdCount: number;
  hasRunningScrape: boolean;
}) {
  const router = useRouter();
  const prevAdCountRef = useRef(-1);
  const lastIncreaseAtRef = useRef(Date.now());
  const [, setTick] = useState(0);

  if (currentAdCount > prevAdCountRef.current) {
    lastIncreaseAtRef.current = Date.now();
    prevAdCountRef.current = currentAdCount;
  }

  const noNewAdsFor = Date.now() - lastIncreaseAtRef.current;
  const considerDone =
    !hasRunningScrape && noNewAdsFor >= NO_NEW_ADS_DONE_MS;
  const considerDoneWithZero =
    !hasRunningScrape && currentAdCount === 0 && noNewAdsFor >= NO_NEW_ADS_DONE_MS;
  const showBanner =
    hasRunningScrape ||
    currentAdCount === 0 ||
    (currentAdCount > 0 && !considerDone);

  useEffect(() => {
    if (!showBanner) return;
    const t = setInterval(() => {
      router.refresh();
      setTick((n) => n + 1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [showBanner, router]);

  if (!showBanner || considerDoneWithZero) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <p className="text-muted-foreground">
        Scrape in progress for <strong className="text-foreground">{advertiserName}</strong>
        {currentAdCount > 0 ? ` — ${currentAdCount} ad${currentAdCount === 1 ? "" : "s"} so far.` : "…"}
        The page updates every few seconds. The message will disappear when no new ads appear for 2 minutes.
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
