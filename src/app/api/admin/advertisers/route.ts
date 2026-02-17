import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET: list advertisers */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const advertisers = await prisma.advertiser.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      linkedinCompanyId: true,
      linkedinUrl: true,
      logoUrl: true,
      status: true,
      lastScrapedAt: true,
      totalAdsFound: true,
    },
  });

  return NextResponse.json({
    advertisers: advertisers.map((a) => ({
      ...a,
      lastScrapedAt: a.lastScrapedAt?.toISOString() ?? null,
    })),
  });
}

/** POST: create advertiser */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: string; linkedinCompanyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = body.name?.trim();
  const linkedinCompanyId = body.linkedinCompanyId?.trim();

  if (!name || !linkedinCompanyId) {
    return NextResponse.json(
      { error: "name and linkedinCompanyId are required" },
      { status: 400 }
    );
  }

  const linkedinUrl = `https://www.linkedin.com/company/${linkedinCompanyId}`;

  try {
    const advertiser = await prisma.advertiser.upsert({
      where: { linkedinCompanyId },
      create: {
        name,
        linkedinCompanyId,
        linkedinUrl,
      },
      update: { name, linkedinUrl },
    });

    return NextResponse.json({
      success: true,
      advertiser: {
        id: advertiser.id,
        name: advertiser.name,
        linkedinCompanyId: advertiser.linkedinCompanyId,
        linkedinUrl: advertiser.linkedinUrl,
      },
    });
  } catch (err) {
    console.error("Failed to create advertiser", err);
    return NextResponse.json(
      { error: "Failed to create advertiser" },
      { status: 500 }
    );
  }
}
