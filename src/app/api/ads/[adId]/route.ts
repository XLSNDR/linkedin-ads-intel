import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAdCollectionIds } from "@/lib/services/collection.service";
import type { CountryImpressionsItem } from "@/lib/impressions";
import { parsePercent } from "@/lib/impressions";

export const dynamic = "force-dynamic";

type CountryDataItem = {
  country: string;
  percentage: number;
  estimatedImpressions: number;
};

function buildCountryData(
  impressionsPerCountry: unknown,
  countryImpressionsEstimate: unknown,
  totalMidpoint: number
): CountryDataItem[] {
  const arr = Array.isArray(impressionsPerCountry)
    ? (impressionsPerCountry as CountryImpressionsItem[])
    : [];
  const estimateMap =
    countryImpressionsEstimate != null &&
    typeof countryImpressionsEstimate === "object" &&
    !Array.isArray(countryImpressionsEstimate)
      ? (countryImpressionsEstimate as Record<string, number>)
      : {};

  const out: CountryDataItem[] = [];
  for (const item of arr) {
    const country = item?.country?.trim();
    if (!country) continue;
    const raw = item?.impressions;
    let fraction = parsePercent(raw);
    if (raw?.trim().toLowerCase().startsWith("<1")) fraction = 0.005;
    const percentage = Math.round(fraction * 100);
    const estimatedImpressions =
      estimateMap[country] ?? Math.round(totalMidpoint * fraction);
    out.push({ country, percentage, estimatedImpressions });
  }
  return out.sort((a, b) => b.percentage - a.percentage);
}

/** GET: Full ad by ID for detail modal. User must track the ad's advertiser. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ adId: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { adId } = await params;
  if (!adId) {
    return NextResponse.json({ error: "Ad ID required" }, { status: 400 });
  }

  const ad = await prisma.ad.findUnique({
    where: { id: adId },
    include: {
      advertiser: {
        select: { id: true, name: true, logoUrl: true, linkedinUrl: true, linkedinCompanyId: true },
      },
    },
  });

  if (!ad || !ad.advertiser) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  const userAdvertiser = await prisma.userAdvertiser.findUnique({
    where: {
      userId_advertiserId: {
        userId: user.id,
        advertiserId: ad.advertiserId,
      },
    },
    select: { id: true, status: true },
  });

  if (!userAdvertiser) {
    return NextResponse.json(
      { error: "You can only view ads from advertisers you track" },
      { status: 404 }
    );
  }

  const collectionIds = await getAdCollectionIds(ad.id, user.id);
  const totalMidpoint = ad.impressionsEstimate ?? 0;
  const countryData = buildCountryData(
    ad.impressionsPerCountry,
    ad.countryImpressionsEstimate,
    totalMidpoint
  );

  return NextResponse.json({
    id: ad.id,
    externalId: ad.externalId,
    format: ad.format,
    bodyText: ad.bodyText,
    headline: ad.headline,
    callToAction: ad.callToAction,
    destinationUrl: ad.destinationUrl,
    mediaUrl: ad.mediaUrl,
    mediaData: ad.mediaData,
    thoughtLeaderMemberImageUrl: ad.thoughtLeaderMemberImageUrl,
    startDate: ad.startDate?.toISOString() ?? null,
    endDate: ad.endDate?.toISOString() ?? null,
    impressions: ad.impressions,
    assumedImpressions: ad.impressionsEstimate,
    targetLanguage: ad.targetLanguage,
    targetLocation: ad.targetLocation,
    paidBy: ad.paidBy,
    adLibraryUrl: ad.adLibraryUrl,
    impressionsPerCountry: ad.impressionsPerCountry,
    countryData,
    countryImpressionsEstimate: ad.countryImpressionsEstimate,
    advertiser: {
      id: ad.advertiser.id,
      name: ad.advertiser.name,
      logoUrl: ad.advertiser.logoUrl,
      linkedinUrl: ad.advertiser.linkedinUrl,
      linkedinCompanyId: ad.advertiser.linkedinCompanyId,
    },
    collectionIds,
    isFollowing: userAdvertiser.status === "following",
    userAdvertiserId: userAdvertiser.id,
    canFollow: !!ad.advertiser.linkedinCompanyId?.trim(),
  });
}
