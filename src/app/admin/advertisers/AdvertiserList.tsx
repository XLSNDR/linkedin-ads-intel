"use client";

import { useState } from "react";

type Advertiser = {
  id: string;
  name: string;
  linkedinCompanyId: string;
  linkedinUrl: string | null;
  logoUrl: string | null;
  status: string;
  lastScrapedAt: string | null;
  totalAdsFound: number;
};

export function AdvertiserList({
  advertisers,
  onScrapeComplete,
}: {
  advertisers: Advertiser[];
  onScrapeComplete: () => void;
}) {
  if (advertisers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No advertisers yet. Add one above.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {advertisers.map((a) => (
        <AdvertiserRow
          key={a.id}
          advertiser={a}
          onScrapeComplete={onScrapeComplete}
        />
      ))}
    </ul>
  );
}

function AdvertiserRow({
  advertiser,
  onScrapeComplete,
}: {
  advertiser: Advertiser;
  onScrapeComplete: () => void;
}) {
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<{
    adsNew?: number;
    adsUpdated?: number;
    costUsd?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScrape() {
    setScraping(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/scrape/${advertiser.id}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.details ?? data.error ?? "Scrape failed");
        return;
      }

      setResult({
        adsNew: data.adsNew,
        adsUpdated: data.adsUpdated,
        costUsd: data.costUsd,
      });
      onScrapeComplete();
    } catch {
      setError("Request failed");
    } finally {
      setScraping(false);
    }
  }

  const lastScraped = advertiser.lastScrapedAt
    ? new Date(advertiser.lastScrapedAt).toLocaleDateString()
    : "—";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3 min-w-0">
        {advertiser.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={advertiser.logoUrl}
            alt=""
            className="h-10 w-10 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
            {advertiser.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{advertiser.name}</p>
          <p className="text-xs text-muted-foreground">
            ID {advertiser.linkedinCompanyId} · {advertiser.totalAdsFound} ads · last scraped {lastScraped}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {result && (
          <span className="text-xs text-muted-foreground">
            +{result.adsNew} new, {result.adsUpdated} updated
            {result.costUsd != null && ` · $${result.costUsd.toFixed(2)}`}
          </span>
        )}
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
        <button
          type="button"
          onClick={handleScrape}
          disabled={scraping}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {scraping ? "Scraping…" : "Scrape now"}
        </button>
      </div>
    </li>
  );
}
