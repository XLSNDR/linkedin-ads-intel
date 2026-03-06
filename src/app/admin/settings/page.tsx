"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type ScraperValue = "apify" | "scrapecreators";

export default function AdminSettingsPage() {
  const [linkedinScraper, setLinkedinScraper] = useState<ScraperValue>("apify");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.linkedinScraper) {
          setLinkedinScraper(
            data.linkedinScraper === "scrapecreators" ? "scrapecreators" : "apify"
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: "error", text: "Failed to load settings" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinScraper }),
      });
      const data = await res.json();
      if (!res.ok) {
        const text = [data.error, data.details].filter(Boolean).join(" — ") || "Save failed";
        setMessage({ type: "error", text });
        return;
      }
      setMessage({ type: "ok", text: "Saved. New scrapes will use " + linkedinScraper + "." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <section className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-6 space-y-4">
        <h2 className="text-lg font-medium">Scraper</h2>
        <p className="text-sm text-muted-foreground">
          Choose which provider to use for LinkedIn Ads scrapes (manual and scheduled).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium">Active scraper:</span>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={linkedinScraper}
              onChange={(e) =>
                setLinkedinScraper(e.target.value as ScraperValue)
              }
            >
              <option value="apify">Apify</option>
              <option value="scrapecreators">ScrapeCreators</option>
            </select>
          </label>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        {linkedinScraper === "scrapecreators" && (
          <p className="text-xs text-muted-foreground">
            Set SCRAPECREATORS_API_KEY in your environment for ScrapeCreators.
          </p>
        )}
        {message && (
          <p
            className={
              message.type === "ok"
                ? "text-sm text-green-600 dark:text-green-400"
                : "text-sm text-destructive"
            }
          >
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}
