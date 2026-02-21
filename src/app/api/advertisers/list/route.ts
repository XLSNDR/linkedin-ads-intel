import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserPlanLimits } from "@/lib/services/plan-limits";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["added", "following", "archived"] as const;

/** GET: List current user's advertisers with optional status filter and limits. */
export async function GET(req: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParams = searchParams.getAll("status").map((s) => s.toLowerCase());

  const statusFilter =
    statusParams.length > 0
      ? statusParams.filter((s): s is (typeof VALID_STATUSES)[number] =>
          VALID_STATUSES.includes(s as (typeof VALID_STATUSES)[number])
        )
      : undefined;

  const links = await prisma.userAdvertiser.findMany({
    where: {
      userId: user.id,
      ...(statusFilter && statusFilter.length > 0
        ? { status: statusFilter.length === 1 ? statusFilter[0] : { in: statusFilter } }
        : {}),
    },
    include: {
      advertiser: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          totalAdsFound: true,
          lastScrapedAt: true,
          scrapeFrequency: true,
          nextScrapeAt: true,
          _count: { select: { ads: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { firstTrackedAt: "desc" }],
  });

  const limits = await getUserPlanLimits(prisma, user.id);
  const addedCount = await prisma.userAdvertiser.count({
    where: { userId: user.id, status: { in: ["added", "following"] } },
  });
  const followingCount = await prisma.userAdvertiser.count({
    where: { userId: user.id, status: "following" },
  });

  return NextResponse.json({
    advertisers: links.map((link) => ({
      id: link.id,
      status: link.status,
      firstTrackedAt: link.firstTrackedAt,
      nextScrapeAt: link.nextScrapeAt,
      advertiser: link.advertiser,
    })),
    limits: limits
      ? {
          maxAddedAdvertisers: limits.maxAddedAdvertisers,
          maxFollowedAdvertisers: limits.maxFollowedAdvertisers,
          currentAdded: addedCount,
          currentFollowing: followingCount,
        }
      : null,
  });
}
