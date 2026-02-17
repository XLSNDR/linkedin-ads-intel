"use client";

import { useState, useEffect } from "react";
import { AdvertiserList } from "./AdvertiserList";
import { AddAdvertiserForm } from "./AddAdvertiserForm";

export default function AdminAdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<
    {
      id: string;
      name: string;
      linkedinCompanyId: string;
      linkedinUrl: string | null;
      logoUrl: string | null;
      status: string;
      lastScrapedAt: string | null;
      totalAdsFound: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<{
    currentSpend: number;
    limit: number;
    remaining: number;
  } | null>(null);

  async function fetchBudget() {
    try {
      const res = await fetch("/api/admin/budget");
      if (res.ok) {
        const data = await res.json();
        setBudget(data);
      }
    } catch {
      setBudget(null);
    }
  }

  async function fetchAdvertisers() {
    try {
      const res = await fetch("/api/admin/advertisers");
      if (res.ok) {
        const data = await res.json();
        setAdvertisers(data.advertisers ?? []);
      }
    } catch {
      setAdvertisers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdvertisers();
    fetchBudget();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-2">Advertisers</h1>
      <p className="text-muted-foreground text-sm mb-2">
        Add advertisers and trigger scrapes via Apify.
      </p>
      {budget && (
        <p className="text-muted-foreground text-sm mb-6">
          Monthly Apify spend: ${budget.currentSpend.toFixed(2)} / ${budget.limit.toFixed(2)}
          {budget.remaining <= 0 && (
            <span className="ml-2 text-destructive font-medium">
              (limit reached — scrapes blocked)
            </span>
          )}
        </p>
      )}
      {!budget && <div className="mb-6" />}

      <AddAdvertiserForm onAdded={fetchAdvertisers} />

      <div className="mt-8">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <AdvertiserList
            advertisers={advertisers}
            onScrapeComplete={() => {
              fetchAdvertisers();
              fetchBudget();
            }}
          />
        )}
      </div>
    </div>
  );
}
