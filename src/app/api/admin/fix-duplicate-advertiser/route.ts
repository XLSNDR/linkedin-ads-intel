import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST: Admin-only. Fix duplicate advertiser: relink UserAdvertisers from the
 * "empty" duplicate (0 ads) to the canonical advertiser (same name, has ads),
 * then delete the empty Advertiser.
 * Body: { emptyAdvertiserId: string }
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { emptyAdvertiserId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const emptyAdvertiserId = body.emptyAdvertiserId?.trim();
  if (!emptyAdvertiserId) {
    return NextResponse.json(
      { error: "emptyAdvertiserId is required", code: "MISSING_ID" },
      { status: 400 }
    );
  }

  const emptyAdvertiser = await prisma.advertiser.findUnique({
    where: { id: emptyAdvertiserId },
    include: { _count: { select: { ads: true } } },
  });

  if (!emptyAdvertiser) {
    return NextResponse.json(
      { error: "Advertiser not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (emptyAdvertiser._count.ads > 0) {
    return NextResponse.json(
      {
        error:
          "Advertiser has ads; use this endpoint only for the empty duplicate",
        code: "NOT_EMPTY",
      },
      { status: 400 }
    );
  }

  const candidates = await prisma.advertiser.findMany({
    where: {
      id: { not: emptyAdvertiserId },
      name: { equals: emptyAdvertiser.name, mode: "insensitive" },
    },
    include: { _count: { select: { ads: true } } },
    orderBy: { totalAdsFound: "desc" },
  });

  const canonical = candidates.find((c) => c._count.ads > 0);
  if (!canonical) {
    return NextResponse.json(
      {
        error:
          "No other advertiser with the same name and ads found to merge into",
        code: "NO_CANONICAL",
      },
      { status: 400 }
    );
  }

  const userLinks = await prisma.userAdvertiser.findMany({
    where: { advertiserId: emptyAdvertiserId },
    select: { id: true, userId: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const link of userLinks) {
      const existing = await tx.userAdvertiser.findUnique({
        where: {
          userId_advertiserId: {
            userId: link.userId,
            advertiserId: canonical.id,
          },
        },
      });
      if (existing) {
        await tx.userAdvertiser.delete({ where: { id: link.id } });
      } else {
        await tx.userAdvertiser.update({
          where: { id: link.id },
          data: { advertiserId: canonical.id },
        });
      }
    }
    await tx.advertiser.delete({ where: { id: emptyAdvertiserId } });
  });

  return NextResponse.json({
    ok: true,
    canonicalId: canonical.id,
    canonicalName: canonical.name,
    deletedAdvertiserId: emptyAdvertiserId,
    userLinksRelinked: userLinks.length,
  });
}
