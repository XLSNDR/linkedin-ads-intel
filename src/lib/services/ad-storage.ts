/**
 * Ad storage service: persist Apify ads to database
 */

import { Prisma, type PrismaClient } from "@prisma/client";

const MONTHLY_SPEND_LIMIT_USD = Number(process.env.APIFY_MONTHLY_SPEND_LIMIT ?? 50);

/** Sum ScrapeRun costs for the current month */
export async function getMonthlySpend(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const runs = await prisma.scrapeRun.findMany({
    where: {
      status: "completed",
      completedAt: { gte: startOfMonth },
    },
    select: { costUsd: true },
  });

  return runs.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
}

/** Check if monthly spend has reached the limit (blocks new runs) */
export async function checkMonthlyBudget(
  prisma: PrismaClient
): Promise<{ ok: boolean; currentSpend: number; limit: number }> {
  const currentSpend = await getMonthlySpend(prisma);
  const atLimit = currentSpend >= MONTHLY_SPEND_LIMIT_USD;

  return {
    ok: !atLimit,
    currentSpend,
    limit: MONTHLY_SPEND_LIMIT_USD,
  };
}
import type { ApifyAd } from "@/lib/apify/types";
import { transformApifyAd } from "@/lib/apify/transform";
import { extractCompanyIdFromAdvertiserUrl } from "@/lib/utils/linkedin-url";
import type { LinkedInScrapeResult, NormalizedAd } from "@/lib/scrapers/types";
import {
  parseImpressionsRangeToMidpoint,
  computeCountryImpressionsEstimate,
} from "@/lib/impressions";

export interface StoreAdsResult {
  adsNew: number;
  adsUpdated: number;
  totalProcessed: number;
}

export type StoreAdsJobType = "initial" | "scheduled";

export async function storeAds(
  prisma: PrismaClient,
  ads: ApifyAd[],
  advertiserId: string,
  jobType: StoreAdsJobType = "initial"
): Promise<StoreAdsResult> {
  let adsNew = 0;
  let adsUpdated = 0;
  const isScheduled = jobType === "scheduled";

  for (const raw of ads) {
    const transformed = transformApifyAd(raw, advertiserId);
    if (!transformed) continue;
    const countryEst = transformed.countryImpressionsEstimate;
    const data = {
      ...transformed,
      mediaData: transformed.mediaData ?? undefined,
      impressionsPerCountry: transformed.impressionsPerCountry ?? undefined,
      countryImpressionsEstimate:
        countryEst && Object.keys(countryEst).length > 0
          ? (countryEst as object)
          : Prisma.JsonNull,
    };

    const existing = await prisma.ad.findUnique({
      where: { externalId: data.externalId },
      select: { id: true },
    });

    if (isScheduled && existing) {
      await prisma.ad.update({
        where: { externalId: data.externalId },
        data: {
          ...(data.startDate != null && { startDate: data.startDate }),
          endDate: data.endDate,
          impressions: data.impressions,
          impressionsPerCountry: data.impressionsPerCountry ?? undefined,
          countryImpressionsEstimate:
            countryEst && Object.keys(countryEst).length > 0
              ? (countryEst as object)
              : Prisma.JsonNull,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
      });
      adsUpdated++;
    } else {
      await prisma.ad.upsert({
        where: { externalId: data.externalId },
        create: {
          ...data,
          firstSeenAt: new Date(),
        },
        update: isScheduled
          ? {
              ...(data.startDate != null && { startDate: data.startDate }),
              endDate: data.endDate,
              impressions: data.impressions,
              impressionsPerCountry: data.impressionsPerCountry ?? undefined,
              countryImpressionsEstimate:
                countryEst && Object.keys(countryEst).length > 0
                  ? (countryEst as object)
                  : Prisma.JsonNull,
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            }
          : {
              ...data,
              firstSeenAt: undefined,
            },
      });
      if (existing) adsUpdated++;
      else adsNew++;
    }
  }

  // Only update Advertiser when we actually have ads (avoid overwriting with 0 when sync ran too early)
  if (ads.length > 0) {
    const logoUrl =
      ads.map((a) => a.advertiserLogo).find((url): url is string => typeof url === "string" && url.trim() !== "") ?? null;

    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
      select: { linkedinCompanyId: true },
    });
    const companyIdFromFirstAd = extractCompanyIdFromAdvertiserUrl(ads[0].advertiserUrl);

    await prisma.advertiser.update({
      where: { id: advertiserId },
      data: {
        lastScrapedAt: new Date(),
        totalAdsFound: ads.length,
        ...(logoUrl != null && { logoUrl }),
        ...(companyIdFromFirstAd != null &&
          advertiser?.linkedinCompanyId == null && { linkedinCompanyId: companyIdFromFirstAd }),
      },
    });
  }

  return {
    adsNew,
    adsUpdated,
    totalProcessed: ads.length,
  };
}

/** Persist normalized scrape result (adapter output) to DB. Both Apify and ScrapeCreators use this. */
export async function storeNormalizedResult(
  prisma: PrismaClient,
  advertiserId: string,
  result: LinkedInScrapeResult,
  jobType: StoreAdsJobType = "initial"
): Promise<StoreAdsResult> {
  const { advertiser: normAdv, ads: normalizedAds } = result;
  let adsNew = 0;
  let adsUpdated = 0;
  const isScheduled = jobType === "scheduled";

  for (const ad of normalizedAds) {
    const impressionsNorm = ad.impressions ?? null;
    const midpoint = parseImpressionsRangeToMidpoint(impressionsNorm ?? "");
    const countryEst =
      midpoint > 0 && ad.impressionsPerCountry?.length
        ? computeCountryImpressionsEstimate(midpoint, ad.impressionsPerCountry)
        : null;
    const countryEstJson =
      countryEst && Object.keys(countryEst).length > 0
        ? (countryEst as object)
        : Prisma.JsonNull;

    const existing = await prisma.ad.findUnique({
      where: { externalId: ad.externalId },
      select: { id: true },
    });

    const baseData = {
      advertiserId,
      adLibraryUrl: ad.adLibraryUrl || null,
      format: ad.format,
      bodyText: ad.bodyText ?? null,
      headline: ad.headline ?? null,
      callToAction: ad.callToAction ?? null,
      destinationUrl: ad.destinationUrl ?? null,
      mediaUrl: ad.mediaUrl ?? null,
      mediaData: ad.mediaData ?? undefined,
      startDate: ad.startDate ?? null,
      endDate: ad.endDate ?? null,
      impressions: ad.impressions ?? null,
      impressionsEstimate: midpoint > 0 ? midpoint : null,
      countryImpressionsEstimate: countryEstJson,
      targetLanguage: ad.targetLanguage ?? null,
      targetLocation: ad.targetLocation ?? null,
      paidBy: ad.paidBy ?? null,
      impressionsPerCountry: ad.impressionsPerCountry ?? undefined,
      thoughtLeaderMemberUrl: ad.thoughtLeaderMemberUrl ?? null,
      thoughtLeaderMemberImageUrl: ad.thoughtLeaderMemberImageUrl ?? null,
      poster: ad.poster ?? null,
      posterTitle: ad.posterTitle ?? null,
      lastSeenAt: new Date(),
    };

    if (isScheduled && existing) {
      await prisma.ad.update({
        where: { externalId: ad.externalId },
        data: {
          startDate: baseData.startDate,
          endDate: baseData.endDate,
          impressions: baseData.impressions,
          impressionsPerCountry: baseData.impressionsPerCountry,
          countryImpressionsEstimate: baseData.countryImpressionsEstimate,
          lastSeenAt: baseData.lastSeenAt,
          updatedAt: new Date(),
        },
      });
      adsUpdated++;
    } else {
      await prisma.ad.upsert({
        where: { externalId: ad.externalId },
        create: {
          ...baseData,
          externalId: ad.externalId,
          firstSeenAt: new Date(),
        },
        update: isScheduled
          ? {
              startDate: baseData.startDate,
              endDate: baseData.endDate,
              impressions: baseData.impressions,
              impressionsPerCountry: baseData.impressionsPerCountry,
              countryImpressionsEstimate: baseData.countryImpressionsEstimate,
              lastSeenAt: baseData.lastSeenAt,
              updatedAt: new Date(),
            }
          : {
              ...baseData,
              externalId: ad.externalId,
            },
      });
      if (existing) adsUpdated++;
      else adsNew++;
    }
  }

  const advUpdate: Parameters<PrismaClient["advertiser"]["update"]>[0]["data"] = {
    lastScrapedAt: new Date(),
    totalAdsFound: normalizedAds.length,
    ...(normAdv.linkedinCompanyId && { linkedinCompanyId: normAdv.linkedinCompanyId }),
    ...(normAdv.linkedinUrl && { linkedinUrl: normAdv.linkedinUrl }),
    ...(normAdv.name && { name: normAdv.name }),
    ...(normAdv.logoUrl != null && { logoUrl: normAdv.logoUrl }),
    ...(normAdv.description != null && { description: normAdv.description }),
    ...(normAdv.employeeCount != null && { employeeCount: normAdv.employeeCount }),
    ...(normAdv.website != null && { website: normAdv.website }),
    ...(normAdv.headquartersCity != null && { headquartersCity: normAdv.headquartersCity }),
    ...(normAdv.headquartersState != null && { headquartersState: normAdv.headquartersState }),
    ...(normAdv.headquartersCountry != null && { headquartersCountry: normAdv.headquartersCountry }),
    ...(normAdv.slogan != null && { slogan: normAdv.slogan }),
    ...(normAdv.coverImageUrl != null && { coverImageUrl: normAdv.coverImageUrl }),
    ...(normAdv.followers != null && { followers: normAdv.followers }),
    ...(normAdv.industry != null && { industry: normAdv.industry }),
    ...(normAdv.size != null && { size: normAdv.size }),
    ...(normAdv.specialties != null && { specialties: normAdv.specialties as object }),
    ...(normAdv.funding !== undefined && normAdv.funding !== null && { funding: normAdv.funding as object }),
  };

  await prisma.advertiser.update({
    where: { id: advertiserId },
    data: advUpdate,
  });

  return {
    adsNew,
    adsUpdated,
    totalProcessed: normalizedAds.length,
  };
}
