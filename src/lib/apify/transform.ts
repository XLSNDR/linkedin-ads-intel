/**
 * Transform Apify ad output to Prisma Ad/Advertiser shape.
 * This is the ONLY file that references Apify field names.
 */

import type { ApifyAd } from "./types";

/** Prisma Ad create/update shape (for upsert) */
export interface TransformedAd {
  externalId: string;
  advertiserId: string;
  adLibraryUrl: string | null;
  format: string;
  bodyText: string | null;
  headline: string | null;
  callToAction: string | null;
  destinationUrl: string | null;
  mediaUrl: string | null;
  mediaData: object | null;
  startDate: Date | null;
  endDate: Date | null;
  impressions: string | null;
  targetLanguage: string | null;
  targetLocation: string | null;
  paidBy: string | null;
  impressionsPerCountry: object | null;
  lastSeenAt: Date;
}

export function transformApifyAd(raw: ApifyAd, advertiserId: string): TransformedAd {
  return {
    externalId: raw.adId,
    advertiserId,
    adLibraryUrl: raw.adLibraryUrl ?? null,
    format: raw.format,
    bodyText: raw.body ?? null,
    headline: raw.headline ?? null,
    callToAction: raw.ctas?.[0] ?? null,
    destinationUrl: raw.clickUrl ?? null,
    mediaUrl: getMediaUrl(raw),
    mediaData: getMediaData(raw),
    startDate: raw.availability?.start ? new Date(raw.availability.start) : null,
    endDate: raw.availability?.end ? new Date(raw.availability.end) : null,
    impressions: normalizeImpressions(raw.impressions ?? null),
    targetLanguage: raw.targeting?.language ?? null,
    targetLocation: raw.targeting?.location ?? null,
    paidBy: raw.paidBy ?? null,
    impressionsPerCountry: raw.impressionsPerCountry ?? null,
    lastSeenAt: new Date(),
  };
}

function getMediaUrl(raw: ApifyAd): string | null {
  switch (raw.format) {
    case "SINGLE_IMAGE":
      return raw.imageUrl ?? null;
    case "VIDEO":
      return raw.videoUrl ?? null;
    case "CAROUSEL":
      return raw.slides?.[0]?.imageUrl ?? null;
    case "DOCUMENT":
      return raw.imageUrls?.[0] ?? raw.documentUrl ?? null;
    default:
      return null;
  }
}

function getMediaData(raw: ApifyAd): object | null {
  switch (raw.format) {
    case "CAROUSEL":
      return { slides: raw.slides ?? [] };
    case "DOCUMENT":
      return {
        documentUrl: raw.documentUrl ?? null,
        imageUrls: raw.imageUrls ?? [],
      };
    case "VIDEO":
      return raw.videoUrl ? { videoUrl: raw.videoUrl } : null;
    case "SINGLE_IMAGE":
      return raw.imageUrl ? { imageUrl: raw.imageUrl } : null;
    default:
      return null;
  }
}

/** Normalize Unicode thin spaces and whitespace in impression strings */
export function normalizeImpressions(raw: string | null): string | null {
  if (raw == null || raw === "") return null;
  const normalized = raw.replace(/[\u200a\u200b\u00a0]/g, "").trim();
  return normalized || null;
}
