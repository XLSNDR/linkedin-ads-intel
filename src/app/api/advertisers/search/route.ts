import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET: Search current user's advertisers by name. */
export async function GET(req: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Query q is required (min 2 characters)", code: "QUERY_TOO_SHORT" },
      { status: 400 }
    );
  }

  const links = await prisma.userAdvertiser.findMany({
    where: {
      userId: user.id,
      advertiser: {
        name: { contains: q, mode: "insensitive" },
      },
    },
    include: {
      advertiser: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          totalAdsFound: true,
          lastScrapedAt: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { firstTrackedAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({
    advertisers: links.map((link) => ({
      id: link.id,
      status: link.status,
      advertiser: link.advertiser,
    })),
  });
}
