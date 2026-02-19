"use client";

import { useState } from "react";

export function AddAdvertiserForm({
  onAdded,
}: {
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [linkedinCompanyId, setLinkedinCompanyId] = useState("");
  const [startUrlsRaw, setStartUrlsRaw] = useState("");
  const [resultsLimit, setResultsLimit] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function parseStartUrls(): string[] | null {
    const lines = startUrlsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return lines.length ? lines : null;
  }

  function parseResultsLimit(): number | null {
    if (!resultsLimit.trim()) return null;
    const n = Number(resultsLimit);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const startUrls = parseStartUrls();
    const limit = parseResultsLimit();

    try {
      const res = await fetch("/api/admin/advertisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          linkedinCompanyId,
          startUrls: startUrls ?? undefined,
          resultsLimit: limit,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add advertiser");
        return;
      }

      setSuccess(true);
      setName("");
      setLinkedinCompanyId("");
      setStartUrlsRaw("");
      setResultsLimit("");
      onAdded();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold mb-3">Add Advertiser</h2>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="text"
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
        <input
          type="text"
          placeholder="LinkedIn company ID (e.g. 2027242)"
          value={linkedinCompanyId}
          onChange={(e) => setLinkedinCompanyId(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            LinkedIn Ads Library URLs (optional)
          </label>
          <textarea
            value={startUrlsRaw}
            onChange={(e) => setStartUrlsRaw(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={`One URL per line.\nExample: https://www.linkedin.com/ad-library/search?companyIds=2027242&country=US&dateRange=LAST_30_DAYS`}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            If provided, these URLs are sent to Apify as <span className="font-mono">startUrls</span> so you can control filters like date range and country.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Results limit (optional)
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={resultsLimit}
            onChange={(e) => setResultsLimit(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="e.g. 100"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Max number of ads Apify should return for this advertiser. Leave empty for no explicit limit.
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          Advertiser added.
        </p>
      )}
    </form>
  );
}
