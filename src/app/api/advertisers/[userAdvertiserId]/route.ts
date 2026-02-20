import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recalculateAdvertiserSchedule } from "@/lib/services/plan-limits";

export const dynamic = "force-dynamic";

/** DELETE: Remove advertiser from my list (unlink UserAdvertiser). */
export async function DELETE(
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

  const wasFollowing = link.status === "following";
  const advertiserId = link.advertiserId;

  await prisma.userAdvertiser.delete({
    where: { id: userAdvertiserId },
  });

  if (wasFollowing) {
    await recalculateAdvertiserSchedule(prisma, advertiserId);
  }

  return NextResponse.json({
    success: true,
    message: "Advertiser removed from your list.",
  });
}
