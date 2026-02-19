"use client";

import { useState } from "react";

type ImportResult = {
  adsProcessed: number;
  advertisersWithLogoInExport: number;
  advertisersUpdated: number;
  skippedNoMatch: number;
  errors?: Array<{ linkedinCompanyId: string; error: string }>;
};

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a JSON file first.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import-apify-json", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold mb-2">Import Apify JSON</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Upload an Apify LinkedIn Ads Library export (JSON) to backfill advertiser logos.
        Export from Apify as JSON and use the file as-is.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="file">
            JSON file
          </label>
          <input
            id="file"
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
            className="block w-full text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </form>
      {error && (
        <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {result && (
        <div className="mt-4 p-4 rounded-md border bg-card text-sm space-y-1">
          <p><strong>Ads processed:</strong> {result.adsProcessed}</p>
          <p><strong>Advertisers with logo in export:</strong> {result.advertisersWithLogoInExport}</p>
          <p><strong>Advertisers updated:</strong> {result.advertisersUpdated}</p>
          {result.skippedNoMatch > 0 && (
            <p><strong>Skipped (no matching advertiser in DB):</strong> {result.skippedNoMatch}</p>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 text-destructive">
              <strong>Errors:</strong>
              <ul className="list-disc pl-4">
                {result.errors.map((e) => (
                  <li key={e.linkedinCompanyId}>{e.linkedinCompanyId}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
