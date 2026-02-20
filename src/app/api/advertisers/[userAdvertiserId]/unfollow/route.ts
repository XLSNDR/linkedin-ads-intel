import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recalculateAdvertiserSchedule } from "@/lib/services/plan-limits";

export const dynamic = "force-dynamic";

/** POST: Stop following (archive). */
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
    include: { advertiser: true },
  });

  if (!link || link.userId !== user.id) {
    return NextResponse.json(
      { error: "UserAdvertiser not found" },
      { status: 404 }
    );
  }

  if (link.status !== "following") {
    return NextResponse.json(
      {
        error:
          link.status === "archived"
            ? "Already unfollowed (archived)"
            : "Only following advertisers can be unfollowed",
        code: link.status === "archived" ? "ALREADY_ARCHIVED" : "NOT_FOLLOWING",
      },
      { status: 400 }
    );
  }

  await prisma.userAdvertiser.update({
    where: { id: userAdvertiserId },
    data: { status: "archived", nextScrapeAt: null },
  });

  await recalculateAdvertiserSchedule(prisma, link.advertiserId);

  return NextResponse.json({
    success: true,
    message: `Stopped tracking ${link.advertiser.name}. Their ads remain visible; you can re-follow anytime.`,
  });
}
