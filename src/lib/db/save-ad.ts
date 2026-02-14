import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { detectAdFormat } from "@/lib/scraper/format-detector";
import type { ScrapedAd } from "@/lib/scraper/linkedin-scraper";
import { uploadAdImage } from "@/lib/storage/upload-image";

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

  const advertiser = await prisma.advertiser.upsert({
    where: { companyId },
    create: {
      companyId,
      companyName,
    },
    update: { companyName },
  });

  let saved = 0;
  for (let i = 0; i < ads.length; i++) {
    const ad = ads[i];
    const format = detectAdFormat({
      aboutTheAdFormat: ad.aboutTheAdFormat,
      hasPromotedBy: ad.hasPromotedBy,
      hasImageFile: !!ad.imageUrl,
    });
    const adId = ad.adId ?? `scraped-${randomUUID()}`;
    const adLibraryUrl =
      ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/?authorCompanyId=${companyId}#${adId}`;

    let creativeMediaUrls: string[] = [];
    let creativeThumbnailUrl: string | null = null;
    if (ad.imageUrl) {
      const url = await uploadAdImage(ad.imageUrl, adId);
      if (url) {
        creativeMediaUrls = [url];
        creativeThumbnailUrl = url;
      }
    }
    if (ad.detail?.creativeVideoUrl) creativeMediaUrls.push(ad.detail.creativeVideoUrl);

    const detail = ad.detail;
    const introText = detail?.fullAdCopy || ad.adCopy || "(no copy)";
    const { first: firstSeenDate, last: lastSeenDate } = detail?.runFromTo
      ? parseRunFromTo(detail.runFromTo)
      : { first: now, last: now };
    const runtimeDays = Math.max(
      0,
      Math.round((lastSeenDate.getTime() - firstSeenDate.getTime()) / (24 * 60 * 60 * 1000))
    );
    const hasImpressions = !!detail?.totalImpressions;
    const impressionBucket = detail?.totalImpressions ?? null;
    const countryData = detail?.countryImpressions?.length
      ? detail.countryImpressions
      : null;
    const languages = detail?.targetingLanguage
      ? targetingToArray(detail.targetingLanguage)
      : [];
    const locations = detail?.targetingLocation
      ? targetingToArray(detail.targetingLocation)
      : [];

    try {
      await prisma.ad.upsert({
        where: { adId },
        create: {
          adId,
          adLibraryUrl,
          advertiserId: advertiser.id,
          format,
          status: "active",
          introText,
          ctaText: ad.ctaText || null,
          creativeMediaUrls,
          creativeThumbnailUrl,
          languages,
          locations,
          hasImpressions,
          impressionBucket,
          countryData: countryData ?? undefined,
          firstSeenDate,
          lastSeenDate,
          runtimeDays,
        },
        update: {
          adLibraryUrl,
          introText,
          ctaText: ad.ctaText || null,
          creativeMediaUrls,
          creativeThumbnailUrl,
          languages,
          locations,
          hasImpressions,
          impressionBucket,
          countryData: countryData ?? undefined,
          firstSeenDate,
          lastSeenDate,
          runtimeDays,
        },
      });
      saved++;
    } catch (e) {
      console.warn("Failed to save ad", i, e);
    }
  }

  return { saved, advertiserId: advertiser.id };
}
