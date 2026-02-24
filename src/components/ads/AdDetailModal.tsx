"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { ExploreAdCard } from "@/app/(dashboard)/explore/ExploreAdCard";
import { impressionsToNumber } from "@/app/(dashboard)/explore/ad-card-utils";
import { useSaveToCollection } from "@/components/collections/SaveToCollectionContext";
import { AdDetailsTab } from "./AdDetailsTab";
import { AdImpressionsTab } from "./AdImpressionsTab";
import { FollowAdvertiserButton } from "./FollowAdvertiserButton";

export type AdDetailApiResponse = {
  id: string;
  externalId: string;
  format: string;
  bodyText: string | null;
  headline: string | null;
  callToAction: string | null;
  destinationUrl: string | null;
  mediaUrl: string | null;
  mediaData: unknown;
  thoughtLeaderMemberImageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  impressions: string | null;
  assumedImpressions: number | null;
  targetLanguage: string | null;
  targetLocation: string | null;
  paidBy: string | null;
  adLibraryUrl: string | null;
  impressionsPerCountry: Array<{ country: string; impressions: string }> | null;
  countryData: Array<{
    country: string;
    percentage: number;
    estimatedImpressions: number;
  }>;
  countryImpressionsEstimate: unknown;
  advertiser: {
    id: string;
    name: string | null;
    logoUrl: string | null;
    linkedinUrl: string | null;
    linkedinCompanyId?: string | null;
  };
  collectionIds: string[];
  isFollowing: boolean;
  userAdvertiserId: string;
  /** Follow button enabled only when true (linkedinCompanyId present). */
  canFollow?: boolean;
};

function apiAdToExploreAd(api: AdDetailApiResponse): {
  ad: Parameters<typeof ExploreAdCard>[0]["ad"];
  advertiser: Parameters<typeof ExploreAdCard>[0]["advertiser"];
} {
  const startDate = api.startDate ? new Date(api.startDate) : null;
  const endDate = api.endDate ? new Date(api.endDate) : null;
  return {
    ad: {
      id: api.id,
      externalId: api.externalId,
      format: api.format,
      bodyText: api.bodyText,
      headline: api.headline,
      callToAction: api.callToAction,
      destinationUrl: api.destinationUrl,
      mediaUrl: api.mediaUrl,
      mediaData: api.mediaData,
      startDate,
      endDate,
      lastSeenAt: endDate ?? new Date(),
      thoughtLeaderMemberImageUrl: api.thoughtLeaderMemberImageUrl,
      adLibraryUrl: api.adLibraryUrl,
      targetLanguage: api.targetLanguage,
      countryImpressionsEstimate: api.countryImpressionsEstimate,
      impressionsEstimate: api.assumedImpressions,
      impressions: api.impressions,
      impressionsPerCountry: api.impressionsPerCountry,
    },
    advertiser: {
      id: api.advertiser.id,
      name: api.advertiser.name,
      logoUrl: api.advertiser.logoUrl,
    },
  };
}

type Props = {
  adId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdDetailModal({ adId, open, onOpenChange }: Props) {
  const router = useRouter();
  const { openSaveModal, subscribeToSaveModalClose } = useSaveToCollection();
  const [data, setData] = React.useState<AdDetailApiResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"details" | "impressions">(
    "details"
  );
  const [savedIds, setSavedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const unsub = subscribeToSaveModalClose((closedAdId) => {
      if (closedAdId && closedAdId === adId) {
        fetch(`/api/ads/${adId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((json: AdDetailApiResponse | null) => {
            if (json?.collectionIds) setSavedIds(json.collectionIds);
          })
          .catch(() => {});
      }
    });
    return unsub;
  }, [subscribeToSaveModalClose, adId]);

  React.useEffect(() => {
    if (!open || !adId) {
      setData(null);
      setError(null);
      setActiveTab("details");
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/ads/${adId}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404)
            throw new Error("Ad not found or you don’t have access.");
          throw new Error("Failed to load ad.");
        }
        return res.json();
      })
      .then((json: AdDetailApiResponse) => {
        setData(json);
        setSavedIds(json.collectionIds ?? []);
      })
      .catch((e) => setError(e.message ?? "Something went wrong."))
      .finally(() => setLoading(false));
  }, [open, adId]);

  const handleAdvertiserClick = () => {
    if (data?.advertiser?.id) {
      onOpenChange(false);
      router.push(`/explore?advertisers=${data.advertiser.id}`);
    }
  };

  const handleSaveClick = () => {
    if (data?.id) openSaveModal(data.id);
  };

  const hasImpressions =
    data?.impressions != null && data.impressions.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[95vw] sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0 space-y-0">
          <DialogTitle className="sr-only">Ad details</DialogTitle>
          {data?.advertiser && (
            <>
              <button
                type="button"
                onClick={handleAdvertiserClick}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity flex-1"
              >
                <div className="relative h-9 w-9 shrink-0 rounded overflow-hidden bg-muted">
                  {data.advertiser.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={data.advertiser.logoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                      {data.advertiser.name?.charAt(0) ?? "?"}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm truncate">
                  {data.advertiser.name ?? "—"}
                </span>
              </button>
              <div className="flex items-center gap-3 shrink-0 pr-8">
                {data.adLibraryUrl && (
                  <a
                    href={data.adLibraryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on LinkedIn
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleSaveClick}
                  className="p-2 rounded-md hover:bg-muted flex items-center gap-1 text-xs transition-colors"
                  title={savedIds.length > 0 ? "Saved to collection (click to edit)" : "Save to collection"}
                  aria-label={savedIds.length > 0 ? "Saved to collection" : "Save to collection"}
                  style={{ color: savedIds.length > 0 ? "var(--destructive, #dc2626)" : "currentColor" }}
                >
                  {savedIds.length > 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">{savedIds.length > 0 ? "Saved" : "Save"}</span>
                </button>
                <FollowAdvertiserButton
                  userAdvertiserId={data.userAdvertiserId}
                  isFollowing={data.isFollowing}
                  advertiserName={data.advertiser.name ?? ""}
                  onStateChange={() => {}}
                  canFollow={data.canFollow !== false}
                  disabledTooltip="Follow is available after the first scrape has completed."
                />
              </div>
            </>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex-1 min-h-[200px] flex items-center justify-center p-8">
            <div className="animate-pulse rounded-lg bg-muted h-64 w-full max-w-md" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && data && (() => {
          const { ad, advertiser } = apiAdToExploreAd(data);
          return (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 min-h-0 overflow-hidden">
              <div className="border-b lg:border-b-0 lg:border-r border-border overflow-y-auto p-4 flex flex-col items-center">
                <div className="w-full max-w-md">
                  <ExploreAdCard
                    ad={ad}
                    advertiser={advertiser}
                    countries={[]}
                    impressionsToNumber={impressionsToNumber}
                    actionsSlot={null}
                    hideViewDetailsLink
                  />
                </div>
              </div>
              <div className="flex flex-col min-h-0 overflow-hidden">
                <div className="flex border-b border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className={`px-4 py-3 text-sm font-medium ${
                      activeTab === "details"
                        ? "border-b-2 border-primary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Ad Details
                  </button>
                  {hasImpressions && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("impressions")}
                      className={`px-4 py-3 text-sm font-medium ${
                        activeTab === "impressions"
                          ? "border-b-2 border-primary text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Impressions
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === "details" && (
                    <AdDetailsTab
                      ad={{
                        assumedImpressions: data.assumedImpressions,
                        impressions: data.impressions,
                        startDate: data.startDate,
                        endDate: data.endDate,
                        format: data.format,
                        advertiser: data.advertiser,
                        targetLanguage: data.targetLanguage,
                        targetLocation: data.targetLocation,
                        destinationUrl: data.destinationUrl,
                        paidBy: data.paidBy,
                        advertiserName: data.advertiser.name,
                      }}
                    />
                  )}
                  {activeTab === "impressions" && hasImpressions && (
                    <AdImpressionsTab
                      ad={{
                        assumedImpressions: data.assumedImpressions,
                        impressions: data.impressions,
                        countryData: data.countryData ?? [],
                        impressionsPerCountry: data.impressionsPerCountry,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
