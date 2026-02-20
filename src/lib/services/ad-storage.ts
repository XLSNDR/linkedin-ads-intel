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

  const logoUrl =
    ads.length > 0
      ? (ads.map((a) => a.advertiserLogo).find((url): url is string => typeof url === "string" && url.trim() !== "") ?? null)
      : null;

  const advertiser = await prisma.advertiser.findUnique({
    where: { id: advertiserId },
    select: { linkedinCompanyId: true },
  });
  const companyIdFromFirstAd =
    ads.length > 0
      ? extractCompanyIdFromAdvertiserUrl(ads[0].advertiserUrl)
      : null;

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

  return {
    adsNew,
    adsUpdated,
    totalProcessed: ads.length,
  };
}
