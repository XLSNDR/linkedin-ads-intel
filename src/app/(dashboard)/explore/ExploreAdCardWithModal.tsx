"use client";

import { useMemo } from "react";
import { useAdDetailModal } from "@/components/ads/AdDetailModalContext";
import { AdCardClickWrapper } from "@/components/ads/AdCardClickWrapper";
import { impressionsToNumber } from "./ad-card-utils";
import { AdCardSaveButton } from "./AdCardSaveButton";
import { ExploreAdCard } from "./ExploreAdCard";

type ExploreAdCardProps = React.ComponentProps<typeof ExploreAdCard>;
type AdType = ExploreAdCardProps["ad"];

/** Ad with date fields as string | null (serialized from server). Extra fields from Prisma are allowed. */
type SerializedAd = Omit<AdType, "startDate" | "endDate" | "lastSeenAt"> & {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  lastSeenAt?: string | Date | null;
};

type Props = Omit<ExploreAdCardProps, "impressionsToNumber" | "actionsSlot" | "ad"> & {
  adId: string;
  isSaved: boolean;
  ad: SerializedAd;
};

/** Normalize ad: ensure date fields are Date objects (server sends ISO strings). */
function normalizeAd(ad: Props["ad"]) {
  const toDate = (v: string | Date | null | undefined): Date | null => {
    if (v == null) return null;
    if (typeof v === "string") {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return v;
  };
  return {
    ...ad,
    startDate: toDate(ad.startDate ?? null),
    endDate: toDate(ad.endDate ?? null),
    lastSeenAt: toDate(ad.lastSeenAt ?? null),
  };
}

/**
 * Wraps ExploreAdCard so: (1) clicking the card opens the ad detail modal,
 * (2) "View details" opens the ad detail modal instead of linking to LinkedIn.
 * Uses client-side impressionsToNumber (functions are not serializable from server).
 */
export function ExploreAdCardWithModal({ adId, ad, isSaved, ...rest }: Props) {
  const { openAdDetail } = useAdDetailModal();
  const normalizedAd = useMemo(() => normalizeAd(ad), [ad]);

  return (
    <AdCardClickWrapper adId={adId}>
      <ExploreAdCard
        ad={normalizedAd}
        impressionsToNumber={impressionsToNumber}
        actionsSlot={
          <AdCardSaveButton adId={adId} isSaved={isSaved} />
        }
        {...rest}
        onViewDetailsClick={() => openAdDetail(adId)}
      />
    </AdCardClickWrapper>
  );
}
