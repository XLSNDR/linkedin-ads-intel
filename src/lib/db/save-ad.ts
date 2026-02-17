/**
 * Save Playwright-scraped ads to database.
 * DEPRECATED: Use Apify + storeAds from ad-storage.ts for new flows.
 */
import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { detectAdFormat } from "@/lib/scraper/format-detector";
import type { ScrapedAd } from "@/lib/scraper/linkedin-scraper";
import { uploadAdImage } from "@/lib/storage/upload-image";

/** Map snake_case format to SCREAMING_SNAKE (Apify schema). */
function toApifyFormat(snake: string): string {
  return snake.toUpperCase();
}

/** Parse "Ran from Aug 5, 2025 to Jan 5, 2026" into [startDate, endDate]. */
function parseRunFromTo(runFromTo: string): { first: Date; last: Date } {
  const now = new Date();
  const match = runFromTo.match(/Ran from (.+?) to (.+)$/i);
  if (!match) return { first: now, last: now };
  const first = new Date(match[1].trim());
  const last = new Date(match[2].trim());
  if (Number.isNaN(first.getTime())) return { first: now, last: now };
  if (Number.isNaN(last.getTime())) return { first, last: first };
  return { first, last };
}

/** Extract targeting value from "Targeting includes X" or return as-is. */
function targetingToArray(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const m = t.match(/Targeting includes (.+)/i);
  return m ? [m[1].trim()] : [t];
}

export async function saveAdvertiserAds(
  prisma: PrismaClient,
  companyId: string,
  companyName: string,
  ads: ScrapedAd[]
): Promise<{ saved: number; advertiserId: string }> {
  const now = new Date();
  const linkedinUrl = `https://www.linkedin.com/company/${companyId}`;

  const advertiser = await prisma.advertiser.upsert({
    where: { linkedinCompanyId: companyId },
    create: {
      name: companyName,
      linkedinCompanyId: companyId,
      linkedinUrl,
    },
    update: { name: companyName, linkedinUrl },
  });

  let saved = 0;
  for (let i = 0; i < ads.length; i++) {
    const ad = ads[i];
    const formatSnake = detectAdFormat({
      aboutTheAdFormat: ad.aboutTheAdFormat,
      hasPromotedBy: ad.hasPromotedBy,
      hasImageFile: !!ad.imageUrl,
    });
    const format = toApifyFormat(formatSnake);
    const externalId = ad.adId ?? `scraped-${randomUUID()}`;
    const adLibraryUrl =
      ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${externalId}`;

    let mediaUrl: string | null = null;
    let mediaData: object | null = null;
    if (ad.imageUrl) {
      const url = await uploadAdImage(ad.imageUrl, externalId);
      if (url) {
        mediaUrl = url;
        mediaData = { imageUrl: url };
      }
    }
    if (ad.detail?.creativeVideoUrl) {
      mediaData = { ...(mediaData ?? {}), videoUrl: ad.detail.creativeVideoUrl };
      if (!mediaUrl) mediaUrl = ad.detail.creativeVideoUrl;
    }

    const detail = ad.detail;
    const bodyText = detail?.fullAdCopy || ad.adCopy || ad.ctaText || "(no copy)";
    const { first: startDate, last: endDate } = detail?.runFromTo
      ? parseRunFromTo(detail.runFromTo)
      : { first: now, last: now };
    const impressions = detail?.totalImpressions ?? null;
    const impressionsPerCountry = detail?.countryImpressions?.length
      ? detail.countryImpressions
      : null;
    const targetLanguage = detail?.targetingLanguage
      ? targetingToArray(detail.targetingLanguage)[0] ?? null
      : null;
    const targetLocation = detail?.targetingLocation
      ? targetingToArray(detail.targetingLocation)[0] ?? null
      : null;

    try {
      await prisma.ad.upsert({
        where: { externalId },
        create: {
          externalId,
          adLibraryUrl,
          advertiserId: advertiser.id,
          format,
          bodyText,
          callToAction: ad.ctaText || null,
          mediaUrl,
          mediaData: mediaData ?? undefined,
          startDate,
          endDate,
          impressions,
          targetLanguage,
          targetLocation,
          impressionsPerCountry: impressionsPerCountry ?? undefined,
        },
        update: {
          adLibraryUrl,
          bodyText,
          callToAction: ad.ctaText || null,
          mediaUrl,
          mediaData: mediaData ?? undefined,
          startDate,
          endDate,
          impressions,
          targetLanguage,
          targetLocation,
          impressionsPerCountry: impressionsPerCountry ?? undefined,
          lastSeenAt: now,
        },
      });
      saved++;
    } catch (e) {
      console.warn("Failed to save ad", i, e);
    }
  }

  await prisma.advertiser.update({
    where: { id: advertiser.id },
    data: { lastScrapedAt: now, totalAdsFound: ads.length },
  });

  return { saved, advertiserId: advertiser.id };
}
