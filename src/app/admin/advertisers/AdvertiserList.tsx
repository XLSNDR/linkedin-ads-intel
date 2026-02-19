"use client";

import { useState, useRef } from "react";

const POLL_INTERVAL_MS = 4000;

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
        No advertisers yet. Add one above. Once you have advertisers, each row
        will show &quot;Pull ads from Apify&quot; and &quot;Scrape now&quot;.
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
  const [syncing, setSyncing] = useState(false);
  const [adsFound, setAdsFound] = useState<number | null>(null);
  const [result, setResult] = useState<{
    adsNew?: number;
    adsUpdated?: number;
    costUsd?: number;
  } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    adsFound: number;
    adsNew: number;
    adsUpdated: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apifyRunId, setApifyRunId] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleSyncLatestRun() {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const body =
        apifyRunId.trim() !== ""
          ? JSON.stringify({ apifyRunId: apifyRunId.trim() })
          : undefined;
      const res = await fetch(`/api/scrape/${advertiser.id}/sync`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.details ?? data.error ?? "Sync failed");
        return;
      }
      setSyncResult({
        adsFound: data.adsFound ?? 0,
        adsNew: data.adsNew ?? 0,
        adsUpdated: data.adsUpdated ?? 0,
      });
      onScrapeComplete();
    } catch {
      setError("Sync request failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleScrape() {
    setScraping(true);
    setResult(null);
    setAdsFound(null);
    setError(null);

    try {
      const startRes = await fetch(`/api/scrape/${advertiser.id}`, {
        method: "POST",
      });
      const startData = await startRes.json();

      if (!startRes.ok) {
        setError(startData.details ?? startData.error ?? "Scrape failed to start");
        setScraping(false);
        return;
      }

      const scrapeRunId = startData.scrapeRunId;
      if (!scrapeRunId) {
        setError("No scrape run id returned");
        setScraping(false);
        return;
      }

      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/scrape/status/${scrapeRunId}`);
          const statusData = await statusRes.json();

          if (!statusRes.ok) {
            setError(statusData.details ?? statusData.error ?? "Status check failed");
            setScraping(false);
            if (pollRef.current) clearInterval(pollRef.current);
            return;
          }

          setAdsFound(statusData.adsFound ?? 0);

          if (statusData.status === "completed") {
            setResult({
              adsNew: statusData.adsNew,
              adsUpdated: statusData.adsUpdated,
              costUsd: statusData.costUsd,
            });
            setScraping(false);
            onScrapeComplete();
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } else if (statusData.status === "failed") {
            setError(statusData.details ?? "Scrape failed");
            setScraping(false);
            onScrapeComplete();
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        } catch {
          setError("Status check failed");
          setScraping(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      };

      await poll();
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    } catch {
      setError("Request failed");
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
      <div className="flex items-center gap-2 flex-wrap">
        {scraping && adsFound != null && (
          <span className="text-xs text-muted-foreground">
            {adsFound} ads so far — saving in batches. Check Explore to see them.
          </span>
        )}
        {result && (
          <span className="text-xs text-muted-foreground">
            +{result.adsNew} new, {result.adsUpdated} updated
            {result.costUsd != null && ` · $${result.costUsd.toFixed(2)}`}
          </span>
        )}
        {syncResult && (
          <span className="text-xs text-muted-foreground">
            Pulled {syncResult.adsFound} ads (+{syncResult.adsNew} new, {syncResult.adsUpdated} updated)
          </span>
        )}
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={apifyRunId}
            onChange={(e) => setApifyRunId(e.target.value)}
            placeholder="Apify Run ID (optional)"
            className="w-48 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            title="Paste a Run ID from Apify Console (Runs tab) to import that run's ads"
          />
        <button
          type="button"
          onClick={handleSyncLatestRun}
          disabled={scraping || syncing}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          title="Fetch the latest Apify run and save ads to the database (use when a scrape finished but ads didn’t appear)"
        >
          {syncing ? "Syncing…" : "Pull ads from Apify"}
        </button>
        </div>
        <button
          type="button"
          onClick={handleScrape}
          disabled={scraping || syncing}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {scraping ? "Scraping…" : "Scrape now"}
        </button>
      </div>
    </li>
  );
}
