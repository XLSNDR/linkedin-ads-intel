/**
 * Plan limit checks and shared advertiser schedule for Add/Follow flows.
 */

import type { PrismaClient } from "@prisma/client";

export interface PlanLimits {
  maxAddedAdvertisers: number;
  maxFollowedAdvertisers: number;
  refreshFrequency: string;
}

export interface LimitCheck {
  allowed: boolean;
  current: number;
  max: number;
}

/** Get current user's plan limits (user overrides win over plan). */
export async function getUserPlanLimits(
  prisma: PrismaClient,
  userId: string
): Promise<PlanLimits | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });
  if (!user) return null;
  return {
    maxAddedAdvertisers:
      user.maxAddedAdvertisers ?? user.plan.maxAddedAdvertisers,
    maxFollowedAdvertisers:
      user.maxFollowedAdvertisers ?? user.plan.maxFollowedAdvertisers,
    refreshFrequency: user.refreshFrequency ?? user.plan.refreshFrequency,
  };
}

/** Can user add one more advertiser? Count = added + following. */
export async function canAddAdvertiser(
  prisma: PrismaClient,
  userId: string
): Promise<LimitCheck> {
  const limits = await getUserPlanLimits(prisma, userId);
  if (!limits) return { allowed: false, current: 0, max: 0 };
  const current = await prisma.userAdvertiser.count({
    where: {
      userId,
      status: { in: ["added", "following"] },
    },
  });
  const max = limits.maxAddedAdvertisers;
  return { allowed: current < max, current, max };
}

/** Can user follow one more advertiser? Count = following only. */
export async function canFollowAdvertiser(
  prisma: PrismaClient,
  userId: string
): Promise<LimitCheck> {
  const limits = await getUserPlanLimits(prisma, userId);
  if (!limits) return { allowed: false, current: 0, max: 0 };
  const current = await prisma.userAdvertiser.count({
    where: { userId, status: "following" },
  });
  const max = limits.maxFollowedAdvertisers;
  return { allowed: current < max, current, max };
}

const FREQUENCY_ORDER = { weekly: 3, monthly: 2, manual: 1 } as const;

/** Recalculate shared Advertiser scrape schedule from all followers' effective frequency. */
export async function recalculateAdvertiserSchedule(
  prisma: PrismaClient,
  advertiserId: string
): Promise<void> {
  const followers = await prisma.userAdvertiser.findMany({
    where: { advertiserId, status: "following" },
    include: { user: { include: { plan: true } } },
  });

  if (followers.length === 0) {
    await prisma.advertiser.update({
      where: { id: advertiserId },
      data: { scrapeFrequency: null, nextScrapeAt: null },
    });
    return;
  }

  const effectiveFrequencies = followers.map((f) => {
    const freq = f.user.refreshFrequency ?? f.user.plan.refreshFrequency;
    return (freq?.toLowerCase() ?? "manual") as keyof typeof FREQUENCY_ORDER;
  });
  const best = effectiveFrequencies.some((f) => f === "weekly")
    ? "weekly"
    : effectiveFrequencies.some((f) => f === "monthly")
      ? "monthly"
      : null; // manual = no scheduled scraping

  if (!best) {
    await prisma.advertiser.update({
      where: { id: advertiserId },
      data: { scrapeFrequency: null, nextScrapeAt: null },
    });
    return;
  }

  const nextScrape = new Date();
  if (best === "weekly") {
    nextScrape.setDate(nextScrape.getDate() + 7);
  } else {
    nextScrape.setDate(nextScrape.getDate() + 30);
  }

  await prisma.advertiser.update({
    where: { id: advertiserId },
    data: { scrapeFrequency: best, nextScrapeAt: nextScrape },
  });
}
