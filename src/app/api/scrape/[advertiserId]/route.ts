import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeAdvertiser } from "@/lib/apify/client";
import { storeAds, checkMonthlyBudget } from "@/lib/services/ad-storage";

/** POST: trigger scrape for an advertiser */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ advertiserId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { advertiserId } = await params;
  if (!advertiserId) {
    return NextResponse.json(
      { error: "advertiserId is required" },
      { status: 400 }
    );
  }

  const advertiser = await prisma.advertiser.findUnique({
    where: { id: advertiserId },
    select: { id: true, linkedinCompanyId: true, name: true },
  });

  if (!advertiser) {
    return NextResponse.json(
      { error: "Advertiser not found" },
      { status: 404 }
    );
  }

  const linkedinCompanyId = advertiser.linkedinCompanyId;
  if (!linkedinCompanyId) {
    return NextResponse.json(
      { error: "Advertiser has no linkedinCompanyId" },
      { status: 400 }
    );
  }

  // Budget guard rail: block if monthly spend limit exceeded
  const budgetCheck = await checkMonthlyBudget(prisma);
  if (!budgetCheck.ok) {
    return NextResponse.json(
      {
        error: "Monthly spend limit exceeded",
        details: `Current spend: $${budgetCheck.currentSpend.toFixed(2)}. Limit: $${budgetCheck.limit}.`,
      },
      { status: 429 }
    );
  }

  const scrapeRun = await prisma.scrapeRun.create({
    data: {
      advertiserId,
      status: "running",
    },
  });

  try {
    const { ads, runId, datasetId } = await scrapeAdvertiser(linkedinCompanyId);

    const result = await storeAds(prisma, ads, advertiserId);

    const costUsd = ads.length * 0.004; // ~$0.004/ad from real data

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        apifyRunId: runId,
        apifyDatasetId: datasetId,
        status: "completed",
        adsFound: ads.length,
        adsNew: result.adsNew,
        adsUpdated: result.adsUpdated,
        costUsd,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      advertiserId,
      advertiserName: advertiser.name,
      adsFound: ads.length,
      adsNew: result.adsNew,
      adsUpdated: result.adsUpdated,
      costUsd: Math.round(costUsd * 100) / 100,
      scrapeRunId: scrapeRun.id,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    await prisma.scrapeRun.update({
      where: { id: scrapeRun.id },
      data: {
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      },
    });

    console.error("Scrape failed for advertiser", advertiserId, errorMessage);

    return NextResponse.json(
      { error: "Scrape failed", details: errorMessage },
      { status: 500 }
    );
  }
}
