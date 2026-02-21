"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddAdvertiserModal } from "./AddAdvertiserModal";
import {
  FollowConfirmModal,
  UnfollowConfirmModal,
  RemoveConfirmModal,
} from "./ConfirmModals";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ListPlus,
  Archive,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const ACCORDION_SECTIONS = [
  {
    key: "following" as const,
    label: "Following",
    description: "Advertisers you follow get recurring ad updates on your plan’s schedule.",
    icon: Bell,
    defaultOpen: true,
  },
  {
    key: "added" as const,
    label: "All added",
    description: "Every advertiser you’ve added. Follow any to get automatic updates.",
    icon: ListPlus,
    defaultOpen: true,
  },
  {
    key: "archived" as const,
    label: "Archived",
    description: "Advertisers you’ve unfollowed. Their ads stay visible; you can re-follow anytime.",
    icon: Archive,
    defaultOpen: false,
  },
] as const;

export function AdvertisersPageClient() {
  const [allItems, setAllItems] = useState<ListItem[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({
    following: true,
    added: true,
    archived: false,
  });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [followModal, setFollowModal] = useState<{ open: boolean; item: ListItem | null }>({ open: false, item: null });
  const [unfollowModal, setUnfollowModal] = useState<{ open: boolean; item: ListItem | null }>({ open: false, item: null });
  const [removeModal, setRemoveModal] = useState<{ open: boolean; item: ListItem | null }>({ open: false, item: null });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/advertisers/list");
      const data = await res.json();
      if (res.ok) {
        setAllItems(data.advertisers ?? []);
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
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const followingItems = allItems.filter((i) => i.status === "following");
  const addedItems = allItems.filter((i) => i.status === "added" || i.status === "following");
  const archivedItems = allItems.filter((i) => i.status === "archived");

  const getItemsForSection = (key: "following" | "added" | "archived") => {
    if (key === "following") return followingItems;
    if (key === "added") return addedItems;
    return archivedItems;
  };

  const toggleAccordion = (key: string) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold">Advertisers</h1>
          <Button onClick={() => setAddModalOpen(true)}>Add advertiser</Button>
        </div>

        {limits != null && (
          <p className="text-sm text-muted-foreground mb-6">
            {limits.currentAdded} of {limits.maxAddedAdvertisers} added · {limits.currentFollowing} of {limits.maxFollowedAdvertisers} following
          </p>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-0 border border-border rounded-lg overflow-hidden">
            {ACCORDION_SECTIONS.map(({ key, label, description, icon: Icon }) => {
              const isOpen = accordionOpen[key] ?? (key === "archived" ? false : true);
              const items = getItemsForSection(key);
              return (
                <div key={key} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(key)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                      isOpen && "bg-muted/30"
                    )}
                    aria-expanded={isOpen}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{label}</span>
                      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">{items.length}</span>
                  </button>
                  {isOpen && (
                    <div className="bg-background border-t border-border">
                      {items.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          {key === "following" && "No advertisers you’re following yet."}
                          {key === "added" && "No advertisers added yet."}
                          {key === "archived" && "No archived advertisers."}
                        </div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {items.map((item) => (
                            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30">
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
                                <p className="font-medium text-foreground truncate">{item.advertiser.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.advertiser.totalAdsFound.toLocaleString()} ads · Last scraped {formatDate(item.advertiser.lastScrapedAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/explore?advertiser=${item.advertiser.id}`}>
                                    <ExternalLink className="h-4 w-4 mr-1.5" aria-hidden />
                                    View ads
                                  </Link>
                                </Button>
                                {item.status === "added" && (
                                  <Button
                                    size="sm"
                                    onClick={() => setFollowModal({ open: true, item })}
                                    title="Get recurring ad updates (weekly or monthly)"
                                  >
                                    <Bell className="h-4 w-4 mr-1.5" aria-hidden />
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setRemoveModal({ open: true, item })}
                                  title="Remove from your list"
                                >
                                  <Trash2 className="h-4 w-4" aria-label="Remove" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
