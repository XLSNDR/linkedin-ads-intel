import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  canFollowAdvertiser,
  recalculateAdvertiserSchedule,
} from "@/lib/services/plan-limits";
import { buildAdLibrarySearchUrl, frequencyToWindow } from "@/lib/linkedin-ad-library-url";
import { startScrapeRun } from "@/lib/apify/client";
import { checkMonthlyBudget } from "@/lib/services/ad-storage";

const RECENT_SCRAPE_MS = 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

/** POST: Start following (enable recurring scrapes). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userAdvertiserId: string }> }
) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userAdvertiserId } = await params;
  if (!userAdvertiserId) {
    return NextResponse.json(
      { error: "userAdvertiserId is required" },
      { status: 400 }
    );
  }

  const link = await prisma.userAdvertiser.findUnique({
    where: { id: userAdvertiserId },
    include: { advertiser: true, user: { include: { plan: true } } },
  });

  if (!link || link.userId !== user.id) {
    return NextResponse.json(
      { error: "UserAdvertiser not found" },
      { status: 404 }
    );
  }

  if (link.status !== "added") {
    return NextResponse.json(
      {
        error:
          link.status === "following"
            ? "Already following this advertiser"
            : "Re-follow an archived advertiser using the refollow endpoint",
        code: link.status === "following" ? "ALREADY_FOLLOWING" : "ARCHIVED",
      },
      { status: 400 }
    );
  }

  if (!link.advertiser.linkedinCompanyId?.trim()) {
    return NextResponse.json(
      {
        error: "Follow is available after the first scrape has completed.",
        code: "COMPANY_ID_REQUIRED",
      },
      { status: 400 }
    );
  }

  const followCheck = await canFollowAdvertiser(prisma, user.id);
  if (!followCheck.allowed) {
    return NextResponse.json(
      {
        error: "Follow limit reached",
        code: "LIMIT_REACHED",
        current: followCheck.current,
        max: followCheck.max,
      },
      { status: 403 }
    );
  }

  const frequency =
    link.user.refreshFrequency ?? link.user.plan.refreshFrequency;
  if (frequency === "manual") {
    return NextResponse.json(
      {
        error: "Your plan does not include following advertisers (manual refresh only)",
        code: "MANUAL_PLAN",
      },
      { status: 403 }
    );
  }

  const nextScrape = new Date();
  if (frequency === "weekly") {
    nextScrape.setDate(nextScrape.getDate() + 7);
  } else {
    nextScrape.setDate(nextScrape.getDate() + 30);
  }

  await prisma.userAdvertiser.update({
    where: { id: userAdvertiserId },
    data: {
      status: "following",
      nextScrapeAt: nextScrape,
      followedAt: new Date(),
    },
  });

  await recalculateAdvertiserSchedule(prisma, link.advertiserId);

  const recentlyScraped =
    link.advertiser.lastScrapedAt != null &&
    link.advertiser.lastScrapedAt.getTime() > Date.now() - RECENT_SCRAPE_MS;

  if (
    !recentlyScraped &&
    link.advertiser.linkedinCompanyId?.trim() &&
    (frequency === "weekly" || frequency === "monthly")
  ) {
    const budgetCheck = await checkMonthlyBudget(prisma);
    if (budgetCheck.ok) {
      try {
        const window = frequencyToWindow(frequency as "weekly" | "monthly");
        const url = buildAdLibrarySearchUrl(
          link.advertiser.linkedinCompanyId,
          window
        );
        const { runId, datasetId } = await startScrapeRun({
          startUrls: [url],
          resultsLimit: link.advertiser.resultsLimit ?? undefined,
        });
        await prisma.scrapeRun.create({
          data: {
            advertiserId: link.advertiserId,
            status: "running",
            apifyRunId: runId,
            apifyDatasetId: datasetId,
            jobType: "scheduled",
          },
        });
        const now = new Date();
        await prisma.userAdvertiser.update({
          where: { id: userAdvertiserId },
          data: { lastScrapedAt: now },
        });
        await prisma.advertiser.update({
          where: { id: link.advertiserId },
          data: { lastScrapedAt: now },
        });
      } catch (err) {
        console.error("Follow immediate scrape start failed", link.advertiserId, err);
      }
    }
  }

  const updated = await prisma.userAdvertiser.findUnique({
    where: { id: userAdvertiserId },
    include: { advertiser: true },
  });

  return NextResponse.json({
    userAdvertiser: {
      id: updated!.id,
      status: updated!.status,
      nextScrapeAt: updated!.nextScrapeAt,
    },
    message: `Now following ${link.advertiser.name}. Next update: ${nextScrape.toLocaleDateString()}.`,
  });
}
