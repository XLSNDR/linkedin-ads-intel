/**
 * ScrapeCreators LinkedIn Ads scraper adapter.
 * Company lookup + ads search; implements LinkedInScraperAdapter.
 */

import type {
  LinkedInScrapeResult,
  NormalizedAd,
  NormalizedAdvertiser,
  ScrapeOptions,
} from "../types";

const BASE_URL = "https://api.scrapecreators.com/v1/linkedin";

const FORMAT_MAP: Record<string, string> = {
  "Single Image Ad": "SINGLE_IMAGE",
  "Video Ad": "VIDEO",
  "Carousel Ad": "CAROUSEL",
  "Document Ad": "DOCUMENT",
  "Text Ad": "TEXT",
  "Spotlight Ad": "SPOTLIGHT",
  "Message Ad": "MESSAGE",
  "Event Ad": "EVENT",
  "Follow Company Ad": "FOLLOW_COMPANY",
};

function getApiKey(): string {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key?.trim()) {
    throw new Error("SCRAPECREATORS_API_KEY is not set");
  }
  return key.trim();
}

interface ScrapeCreatorsCompanyResponse {
  success?: boolean;
  id?: string;
  name?: string;
  url?: string;
  description?: string;
  location?: { city?: string; state?: string; country?: string };
  followers?: number;
  employeeCount?: number;
  website?: string;
  logo?: string;
  coverImage?: string;
  slogan?: string;
  industry?: string;
  size?: string;
  specialties?: string[];
  funding?: {
    numberOfRounds?: number | null;
    lastRound?: { type?: string; date?: string | null; amount?: string } | null;
    investors?: unknown[];
  } | null;
}

interface ScrapeCreatorsAdItem {
  id?: string | number;
  url?: string;
  adType?: string;
  description?: string;
  headline?: string | null;
  cta?: string | null;
  destinationUrl?: string | null;
  image?: string | null;
  video?: string | null;
  carouselImages?: string[];
  startDate?: string;
  endDate?: string;
  totalImpressions?: string;
  impressionsByCountry?: Array<{ country?: string; impressions?: string }>;
  targeting?: { language?: string; location?: string };
  promotedBy?: string | null;
  poster?: string | null;
  posterTitle?: string | null;
}

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateString(s: string | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  if (!YYYY_MM_DD.test(s.trim())) return false;
  const d = new Date(s.trim());
  return !Number.isNaN(d.getTime());
}

export class ScrapeCreatorsAdapter {
  async scrape(linkedinCompanyUrl: string, options?: ScrapeOptions): Promise<LinkedInScrapeResult> {
    const url = linkedinCompanyUrl.trim();
    if (!url) throw new Error("linkedinCompanyUrl is required");

    const apiKey = getApiKey();
    const companyRes = await fetch(
      `${BASE_URL}/company?url=${encodeURIComponent(url)}`,
      {
        headers: { "x-api-key": apiKey },
      }
    );

    if (!companyRes.ok) {
      const text = await companyRes.text();
      throw new Error(
        `ScrapeCreators company lookup failed (${companyRes.status}): ${text.slice(0, 300)}`
      );
    }

    const companyJson = (await companyRes.json()) as ScrapeCreatorsCompanyResponse;
    const companyId =
      companyJson.id != null ? String(companyJson.id).trim() : null;
    if (!companyId) {
      throw new Error("ScrapeCreators company response missing id");
    }

    const advertiser: NormalizedAdvertiser = {
      linkedinCompanyId: companyId,
      linkedinUrl:
        companyJson.url?.trim() ||
        url,
      name:
        companyJson.name?.trim() || "Unknown",
      logoUrl: companyJson.logo?.trim() || undefined,
      coverImageUrl: companyJson.coverImage?.trim() || undefined,
      description: companyJson.description?.trim() || undefined,
      employeeCount:
        typeof companyJson.employeeCount === "number" &&
        Number.isFinite(companyJson.employeeCount)
          ? companyJson.employeeCount
          : undefined,
      website: companyJson.website?.trim() || undefined,
      headquartersCity: companyJson.location?.city?.trim() || undefined,
      headquartersState: companyJson.location?.state?.trim() || undefined,
      headquartersCountry: companyJson.location?.country?.trim() || undefined,
      slogan: companyJson.slogan?.trim() || undefined,
      followers:
        typeof companyJson.followers === "number" && Number.isFinite(companyJson.followers)
          ? companyJson.followers
          : undefined,
      industry: companyJson.industry?.trim() || undefined,
      size: companyJson.size?.trim() || undefined,
      specialties: Array.isArray(companyJson.specialties)
        ? companyJson.specialties.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean)
        : undefined,
      funding: companyJson.funding ?? undefined,
    };

    const adsSearchUrl = new URL(`${BASE_URL}/ads/search`);
    adsSearchUrl.searchParams.set("companyId", companyId);
    if (options?.startDate && isValidDateString(options.startDate)) {
      adsSearchUrl.searchParams.set("startDate", options.startDate.trim());
    }
    if (options?.endDate && isValidDateString(options.endDate)) {
      adsSearchUrl.searchParams.set("endDate", options.endDate.trim());
    }

    const adsRes = await fetch(adsSearchUrl.toString(), {
      headers: { "x-api-key": apiKey },
    });

    if (!adsRes.ok) {
      const text = await adsRes.text();
      throw new Error(
        `ScrapeCreators ads search failed (${adsRes.status}): ${text.slice(0, 300)}`
      );
    }

    const adsJson = (await adsRes.json()) as unknown;
    const rawList = Array.isArray(adsJson)
      ? adsJson
      : typeof adsJson === "object" && adsJson != null && "ads" in adsJson && Array.isArray((adsJson as { ads: unknown }).ads)
        ? (adsJson as { ads: unknown[] }).ads
        : [];
    const ads: NormalizedAd[] = [];

    for (const item of rawList as ScrapeCreatorsAdItem[]) {
      const externalId =
        item.id != null ? String(item.id).trim() : null;
      if (!externalId) continue;

      const format =
        item.adType && FORMAT_MAP[item.adType]
          ? FORMAT_MAP[item.adType]
          : (item.adType?.trim() || "SINGLE_IMAGE");

      const mediaUrl =
        (item.image?.trim() || item.video?.trim() || undefined) ?? undefined;
      const mediaData =
        Array.isArray(item.carouselImages) && item.carouselImages.length > 0
          ? { carouselImages: item.carouselImages }
          : undefined;

      const impressionsPerCountry = Array.isArray(item.impressionsByCountry)
        ? item.impressionsByCountry
            .filter(
              (x): x is { country: string; impressions: string } =>
                x != null && typeof x.country === "string"
            )
            .map((x) => ({
              country: x.country,
              impressions: x.impressions ?? "",
            }))
        : undefined;

      const poster = item.poster?.trim() || undefined;
      const posterTitle = item.posterTitle?.trim() || undefined;
      // posterTitle is unique to thought leader ads; poster can also appear on e.g. message ads
      const isThoughtLeader = Boolean(posterTitle);

      ads.push({
        externalId,
        adLibraryUrl:
          item.url?.trim() ||
          `https://www.linkedin.com/ad-library/detail/${externalId}`,
        format,
        bodyText: item.description?.trim() || undefined,
        headline: item.headline?.trim() || undefined,
        callToAction: item.cta?.trim() || undefined,
        destinationUrl: item.destinationUrl?.trim() || undefined,
        mediaUrl,
        mediaData,
        startDate: item.startDate ? new Date(item.startDate) : undefined,
        endDate: item.endDate ? new Date(item.endDate) : undefined,
        impressions: item.totalImpressions?.trim() || undefined,
        impressionsPerCountry,
        targetLanguage: item.targeting?.language?.trim() || undefined,
        targetLocation: item.targeting?.location?.trim() || undefined,
        paidBy: isThoughtLeader ? "Thought leader" : (item.promotedBy?.trim() || undefined),
        poster,
        posterTitle,
      });
    }

    return { advertiser, ads };
  }
}
