/**
 * Transform Apify ad output to Prisma Ad/Advertiser shape.
 * This is the ONLY file that references Apify field names.
 */

import type { ApifyAd } from "./types";
import {
  parseImpressionsRangeToMidpoint,
  computeCountryImpressionsEstimate,
} from "@/lib/impressions";

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
  impressionsEstimate: number | null;
  countryImpressionsEstimate: Record<string, number> | null;
  targetLanguage: string | null;
  targetLocation: string | null;
  paidBy: string | null;
  impressionsPerCountry: object | null;
  lastSeenAt: Date;
}

/** Resolve external id (Apify actor may use id or adId; may be string or number) */
function getExternalId(raw: ApifyAd): string | null {
  const id = raw.adId ?? raw.id;
  if (id == null) return null;
  const s = typeof id === "string" ? id.trim() : String(id).trim();
  return s === "" ? null : s;
}

export function transformApifyAd(raw: ApifyAd, advertiserId: string): TransformedAd | null {
  const externalId = getExternalId(raw);
  if (!externalId) return null;
  return {
    externalId,
    advertiserId,
    adLibraryUrl: raw.adLibraryUrl ?? null,
    format: raw.format ?? "SINGLE_IMAGE",
    bodyText: raw.body ?? null,
    headline: raw.headline ?? null,
    callToAction: raw.ctas?.[0] ?? null,
    destinationUrl: raw.clickUrl ?? null,
    mediaUrl: getMediaUrl(raw),
    mediaData: getMediaData(raw),
    startDate: raw.availability?.start ? new Date(raw.availability.start) : null,
    endDate: raw.availability?.end ? new Date(raw.availability.end) : null,
    impressions: normalizeImpressions(raw.impressions ?? null),
    impressionsEstimate: (() => {
      const normalized = normalizeImpressions(raw.impressions ?? null);
      const n = parseImpressionsRangeToMidpoint(normalized ?? "");
      return n > 0 ? n : null;
    })(),
    countryImpressionsEstimate: (() => {
      const normalized = normalizeImpressions(raw.impressions ?? null);
      const total = parseImpressionsRangeToMidpoint(normalized ?? "");
      const arr = raw.impressionsPerCountry as Array<{ country: string; impressions: string }> | undefined;
      const rec = computeCountryImpressionsEstimate(total, arr ?? null);
      return Object.keys(rec).length > 0 ? rec : null;
    })(),
    targetLanguage: raw.targeting?.language ?? null,
    targetLocation: raw.targeting?.location ?? null,
    paidBy: raw.paidBy ?? null,
    impressionsPerCountry: raw.impressionsPerCountry ?? null,
    lastSeenAt: new Date(),
  };
}

/** Build carousel slides from raw: nested raw.slides or flattened slides/0/imageUrl, slides/1/imageUrl, etc. */
function getCarouselSlides(raw: ApifyAd): Array<{ imageUrl: string; title?: string }> {
  if (Array.isArray(raw.slides) && raw.slides.length > 0) {
    return raw.slides.map((s) => ({ imageUrl: s.imageUrl, title: s.title }));
  }
  const out: Array<{ imageUrl: string; title?: string }> = [];
  const rec = raw as unknown as Record<string, unknown>;
  for (let i = 0; ; i++) {
    const imageUrl = rec[`slides/${i}/imageUrl`];
    if (typeof imageUrl !== "string" || !imageUrl.trim()) break;
    const title = rec[`slides/${i}/title`];
    out.push({
      imageUrl,
      title: typeof title === "string" && title.trim() ? title : undefined,
    });
  }
  return out;
}

function getMediaUrl(raw: ApifyAd): string | null {
  switch (raw.format) {
    case "SINGLE_IMAGE":
      return raw.imageUrl ?? null;
    case "VIDEO":
      return raw.videoUrl ?? null;
    case "CAROUSEL":
      return getCarouselSlides(raw)[0]?.imageUrl ?? null;
    case "DOCUMENT":
      return raw.imageUrls?.[0] ?? raw.documentUrl ?? null;
    case "SPOTLIGHT":
      return raw.imageUrl ?? null;
    case "MESSAGE":
      return raw.imageUrl ?? null;
    case "EVENT":
      return raw.imageUrl ?? null;
    case "FOLLOW_COMPANY":
      return raw.imageUrl ?? null;
    case "TEXT":
      return raw.imageUrl ?? null;
    case "LINKEDIN_ARTICLE":
    case "SPONSORED_UPDATE_LINKEDIN_ARTICLE":
      return raw.imageUrl ?? null;
    default:
      return null;
  }
}

function getMediaData(raw: ApifyAd): object | null {
  switch (raw.format) {
    case "CAROUSEL":
      return { slides: getCarouselSlides(raw) };
    case "DOCUMENT":
      return {
        documentUrl: raw.documentUrl ?? null,
        imageUrls: raw.imageUrls ?? [],
      };
    case "VIDEO":
      return raw.videoUrl
        ? { videoUrl: raw.videoUrl, posterUrl: raw.videoThumbnailUrl ?? null }
        : null;
    case "SINGLE_IMAGE":
      return raw.imageUrl ? { imageUrl: raw.imageUrl } : null;
    case "SPOTLIGHT":
      return raw.imageUrl ? { imageUrl: raw.imageUrl } : null;
    case "FOLLOW_COMPANY":
      return raw.imageUrl ? { imageUrl: raw.imageUrl } : null;
    case "TEXT":
      return raw.imageUrl ? { imageUrl: raw.imageUrl } : null;
    case "MESSAGE":
      return {
        imageUrl: raw.imageUrl ?? null,
        senderName: raw.senderName ?? null,
        senderImageUrl: raw.senderImageUrl ?? null,
      };
    case "EVENT":
      return {
        imageUrl: raw.imageUrl ?? null,
        eventTimeDisplay: raw.eventTimeDisplay ?? null,
        eventUrl: raw.eventUrl ?? null,
      };
    case "LINKEDIN_ARTICLE":
    case "SPONSORED_UPDATE_LINKEDIN_ARTICLE":
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
