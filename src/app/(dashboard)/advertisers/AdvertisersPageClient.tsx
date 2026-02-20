"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddAdvertiserModal } from "./AddAdvertiserModal";
import {
  FollowConfirmModal,
  UnfollowConfirmModal,
  RemoveConfirmModal,
} from "./ConfirmModals";

type Tab = "following" | "added" | "archived";

interface AdvertiserInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  totalAdsFound: number;
  lastScrapedAt: string | null;
  scrapeFrequency: string | null;
  nextScrapeAt: string | null;
}

interface ListItem {
  id: string;
  status: string;
  firstTrackedAt: string;
  nextScrapeAt: string | null;
  advertiser: AdvertiserInfo;
}

interface Limits {
  maxAddedAdvertisers: number;
  maxFollowedAdvertisers: number;
  currentAdded: number;
  currentFollowing: number;
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdvertisersPageClient() {
  const [tab, setTab] = useState<Tab>("following");
  const [items, setItems] = useState<ListItem[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [followModal, setFollowModal] = useState<{ open: boolean; item: ListItem | null }>({ open: false, item: null });
  const [unfollowModal, setUnfollowModal] = useState<{ open: boolean; item: ListItem | null }>({ open: false, item: null });
  const [removeModal, setRemoveModal] = useState<{ open: boolean; item: ListItem | null }>({ open: false, item: null });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === "following") params.set("status", "following");
      else if (tab === "archived") params.set("status", "archived");
      else {
        params.append("status", "added");
        params.append("status", "following");
      }
      const res = await fetch(`/api/advertisers/list?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.advertisers ?? []);
        if (data.limits) {
          setLimits({
            maxAddedAdvertisers: data.limits.maxAddedAdvertisers,
            maxFollowedAdvertisers: data.limits.maxFollowedAdvertisers,
            currentAdded: data.limits.currentAdded,
            currentFollowing: data.limits.currentFollowing,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function handleFollow() {
    const item = followModal.item;
    if (!item) return;
    setActionLoading(true);
    try {
      const endpoint = item.status === "archived" ? "refollow" : "follow";
      const res = await fetch(`/api/advertisers/${item.id}/${endpoint}`, { method: "POST" });
      if (res.ok) await fetchList();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnfollow() {
    const item = unfollowModal.item;
    if (!item) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/advertisers/${item.id}/unfollow`, { method: "POST" });
      if (res.ok) await fetchList();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemove() {
    const item = removeModal.item;
    if (!item) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/advertisers/${item.id}`, { method: "DELETE" });
      if (res.ok) await fetchList();
    } finally {
      setActionLoading(false);
    }
  }

  const isEmpty = limits != null && limits.currentAdded === 0;

  if (isEmpty) {
    return (
      <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
        <main className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold mb-4">Advertisers</h1>
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t added any advertisers yet. Add a LinkedIn company to see their ads in Explore.
            </p>
            <Button onClick={() => setAddModalOpen(true)}>Add your first advertiser</Button>
          </div>
          <AddAdvertiserModal open={addModalOpen} onOpenChange={setAddModalOpen} onAdded={fetchList} />
        </main>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "following", label: "Following" },
    { key: "added", label: "All added" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold">Advertisers</h1>
          <Button onClick={() => setAddModalOpen(true)}>Add advertiser</Button>
        </div>

        {limits != null && (
          <p className="text-sm text-muted-foreground mb-4">
            {limits.currentAdded} of {limits.maxAddedAdvertisers} added · {limits.currentFollowing} of {limits.maxFollowedAdvertisers} following
          </p>
        )}

        <div className="flex gap-2 border-b border-border mb-6">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            {tab === "following" && "No advertisers you’re following."}
            {tab === "added" && "No advertisers in “All added” (only added, not following)."}
            {tab === "archived" && "No archived advertisers."}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    {item.advertiser.logoUrl ? (
                      <div className="relative h-10 w-10 rounded overflow-hidden shrink-0 bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.advertiser.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted shrink-0 flex items-center justify-center text-lg font-semibold text-muted-foreground">
                        {item.advertiser.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold truncate">{item.advertiser.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={item.status === "following" ? "default" : "secondary"} className="text-xs">
                          {item.status === "following" ? "Following" : item.status === "archived" ? "Archived" : "Added"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.advertiser.totalAdsFound} ads · Last scraped {formatDate(item.advertiser.lastScrapedAt)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 text-sm text-muted-foreground">
                    {item.status === "following" && item.advertiser.nextScrapeAt && (
                      <p>Next update: {formatDate(item.advertiser.nextScrapeAt)}</p>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 pt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/explore?advertiser=${item.advertiser.id}`}>View ads</Link>
                    </Button>
                    {item.status === "added" && (
                      <Button size="sm" onClick={() => setFollowModal({ open: true, item })}>
                        Follow
                      </Button>
                    )}
                    {item.status === "following" && (
                      <Button size="sm" variant="secondary" onClick={() => setUnfollowModal({ open: true, item })}>
                        Unfollow
                      </Button>
                    )}
                    {item.status === "archived" && (
                      <Button size="sm" onClick={() => setFollowModal({ open: true, item })}>
                        Re-follow
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRemoveModal({ open: true, item })}>
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <AddAdvertiserModal open={addModalOpen} onOpenChange={setAddModalOpen} onAdded={fetchList} />
        <FollowConfirmModal
          open={followModal.open}
          onOpenChange={(open) => setFollowModal((p) => ({ ...p, open }))}
          advertiserName={followModal.item?.advertiser.name ?? ""}
          onConfirm={handleFollow}
          loading={actionLoading}
          isRefollow={followModal.item?.status === "archived"}
        />
        <UnfollowConfirmModal
          open={unfollowModal.open}
          onOpenChange={(open) => setUnfollowModal((p) => ({ ...p, open }))}
          advertiserName={unfollowModal.item?.advertiser.name ?? ""}
          onConfirm={handleUnfollow}
          loading={actionLoading}
        />
        <RemoveConfirmModal
          open={removeModal.open}
          onOpenChange={(open) => setRemoveModal((p) => ({ ...p, open }))}
          advertiserName={removeModal.item?.advertiser.name ?? ""}
          onConfirm={handleRemove}
          loading={actionLoading}
        />
      </main>
    </div>
  );
}

