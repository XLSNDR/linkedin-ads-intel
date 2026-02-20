import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  canFollowAdvertiser,
  recalculateAdvertiserSchedule,
} from "@/lib/services/plan-limits";

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
    data: { status: "following", nextScrapeAt: nextScrape },
  });

  await recalculateAdvertiserSchedule(prisma, link.advertiserId);

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
