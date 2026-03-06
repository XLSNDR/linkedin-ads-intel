/**
 * Apify LinkedIn Ads scraper adapter.
 * Wraps existing Apify client + transform; implements LinkedInScraperAdapter.
 */

import type { ApifyAd } from "@/lib/apify/types";
import {
  startScrapeRun,
  waitForRun,
  getDatasetItems,
} from "@/lib/apify/client";
import {
  getExternalId,
  getMediaUrl,
  getMediaData,
  normalizeImpressions,
  extractFirstUrlFromText,
} from "@/lib/apify/transform";
import { extractCompanyIdFromAdvertiserUrl } from "@/lib/utils/linkedin-url";
import type {
  LinkedInScrapeResult,
  NormalizedAd,
  NormalizedAdvertiser,
} from "../types";

function toNormalizedAd(raw: ApifyAd): NormalizedAd | null {
  const externalId = getExternalId(raw);
  if (!externalId) return null;

  const adLibraryUrl =
    typeof raw.adLibraryUrl === "string" && raw.adLibraryUrl.trim()
      ? raw.adLibraryUrl.trim()
      : "";

  return {
    externalId,
    adLibraryUrl: adLibraryUrl || `https://www.linkedin.com/ad-library/detail/${externalId}`,
    format: raw.format ?? "SINGLE_IMAGE",
    bodyText: raw.body?.trim() || undefined,
    headline: raw.headline?.trim() || undefined,
    callToAction: raw.ctas?.[0]?.trim() || undefined,
    destinationUrl:
      raw.clickUrl?.trim() ||
      (raw.format === "MESSAGE" || raw.format === "LINKEDIN_ARTICLE" || raw.format === "SPONSORED_UPDATE_LINKEDIN_ARTICLE"
        ? extractFirstUrlFromText(raw.body)
        : undefined) ||
      undefined,
    mediaUrl: getMediaUrl(raw) ?? undefined,
    mediaData: getMediaData(raw) ?? undefined,
    startDate: raw.availability?.start ? new Date(raw.availability.start) : undefined,
    endDate: raw.availability?.end ? new Date(raw.availability.end) : undefined,
    impressions: normalizeImpressions(raw.impressions ?? null) ?? undefined,
    impressionsPerCountry: Array.isArray(raw.impressionsPerCountry)
      ? raw.impressionsPerCountry.filter(
          (x): x is { country: string; impressions: string } =>
            x != null && typeof x.country === "string"
        )
      : undefined,
    targetLanguage: raw.targeting?.language?.trim() || undefined,
    targetLocation: raw.targeting?.location?.trim() || undefined,
    paidBy:
      raw.thoughtLeaderMemberName?.trim() || raw.thoughtLeaderMemberJobtitle?.trim()
        ? "Thought leader"
        : (raw.paidBy?.trim() || undefined),
    thoughtLeaderMemberUrl: raw.thoughtLeaderMemberUrl?.trim() || undefined,
    thoughtLeaderMemberImageUrl:
      raw.thoughtLeaderMemberImageUrl?.trim() || undefined,
    poster: raw.thoughtLeaderMemberName?.trim() || undefined,
    posterTitle: raw.thoughtLeaderMemberJobtitle?.trim() || undefined,
  };
}

function toNormalizedAdvertiser(first: ApifyAd): NormalizedAdvertiser {
  const linkedinUrl =
    typeof first.advertiserUrl === "string" && first.advertiserUrl.trim()
      ? first.advertiserUrl.trim()
      : "";
  const linkedinCompanyId =
    extractCompanyIdFromAdvertiserUrl(first.advertiserUrl) ?? "";
  const name =
    typeof first.advertiserName === "string" && first.advertiserName.trim()
      ? first.advertiserName.trim()
      : "Unknown";
  const logoUrl =
    typeof first.advertiserLogo === "string" && first.advertiserLogo.trim()
      ? first.advertiserLogo.trim()
      : undefined;

  return {
    linkedinCompanyId,
    linkedinUrl,
    name,
    logoUrl,
  };
}

export class ApifyAdapter {
  async scrape(linkedinCompanyUrl: string, _options?: unknown): Promise<LinkedInScrapeResult> {
    const url = linkedinCompanyUrl.trim();
    if (!url) throw new Error("linkedinCompanyUrl is required");

    const { runId, datasetId: startDatasetId } = await startScrapeRun({
      startUrls: [url],
    });

    const { datasetId } = await waitForRun(runId);
    const resolvedDatasetId = datasetId ?? startDatasetId;
    if (!resolvedDatasetId) {
      throw new Error("Apify run has no dataset id");
    }

    const rawAds = await getDatasetItems(resolvedDatasetId);
    if (!Array.isArray(rawAds) || rawAds.length === 0) {
      return {
        advertiser: {
          linkedinCompanyId: "",
          linkedinUrl: url,
          name: "Unknown",
        },
        ads: [],
      };
    }

    const first = rawAds[0] as ApifyAd;
    const advertiser = toNormalizedAdvertiser(first);
    const ads: NormalizedAd[] = [];
    for (const raw of rawAds as ApifyAd[]) {
      const ad = toNormalizedAd(raw);
      if (ad) ads.push(ad);
    }

    return { advertiser, ads };
  }
}
