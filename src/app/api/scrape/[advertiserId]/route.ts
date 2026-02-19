import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startScrapeRun } from "@/lib/apify/client";
import { checkMonthlyBudget } from "@/lib/services/ad-storage";

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
    select: {
      id: true,
      linkedinCompanyId: true,
      name: true,
      startUrls: true,
      resultsLimit: true,
    },
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

  try {
    const { runId, datasetId } = await startScrapeRun({
      linkedinCompanyId,
      startUrls: (advertiser.startUrls as string[] | null) ?? undefined,
      resultsLimit: advertiser.resultsLimit ?? undefined,
    });

    const scrapeRun = await prisma.scrapeRun.create({
      data: {
        advertiserId,
        status: "running",
        apifyRunId: runId,
        apifyDatasetId: datasetId,
      },
    });

    return NextResponse.json({
      success: true,
      scrapeRunId: scrapeRun.id,
      message:
        "Scrape started. Poll GET /api/scrape/status/[scrapeRunId] for progress; ads will appear in batches.",
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    console.error("Scrape start failed for advertiser", advertiserId, errorMessage);

    return NextResponse.json(
      { error: "Scrape failed to start", details: errorMessage },
      { status: 500 }
    );
  }
}
