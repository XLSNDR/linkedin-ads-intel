import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRunStatus, getDatasetItems } from "@/lib/apify/client";
import { storeAds } from "@/lib/services/ad-storage";

/**
 * POST: Fetch ads from Apify and save to DB.
 * - If body.apifyRunId is provided: use that Apify run (e.g. one started in Apify Console).
 * - Otherwise: use the latest ScrapeRun for this advertiser (from "Scrape now" in this app).
 */
export async function POST(
  req: Request,
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

  let body: { apifyRunId?: string } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as { apifyRunId?: string };
  } catch {
    // ignore invalid JSON; use empty body
  }
  const apifyRunIdFromBody = body.apifyRunId?.trim();

  let runId: string;
  let existingScrapeRunId: string | null = null;
  let datasetId: string | null = null;

  if (apifyRunIdFromBody) {
    runId = apifyRunIdFromBody;
    // We'll get datasetId from getRunStatus below
  } else {
    const latestRun = await prisma.scrapeRun.findFirst({
      where: { advertiserId },
      orderBy: { startedAt: "desc" },
    });
    if (!latestRun?.apifyRunId) {
      return NextResponse.json(
        {
          error:
            "No Apify run found for this advertiser. Start a scrape first (Scrape now), or paste an Apify Run ID from a run you started in Apify Console.",
        },
        { status: 400 }
      );
    }
    runId = latestRun.apifyRunId;
    existingScrapeRunId = latestRun.id;
    datasetId = latestRun.apifyDatasetId;
  }

  let apifyStatus: string;
  try {
    const statusRes = await getRunStatus(runId);
    apifyStatus = statusRes.status;
    datasetId = datasetId ?? statusRes.datasetId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to get Apify run status", details: message },
      { status: 500 }
    );
  }

  if (!datasetId) {
    return NextResponse.json(
      {
        error: "Apify run has no dataset yet. If the run just started, wait a minute and try again.",
      },
      { status: 400 }
    );
  }

  try {
    const ads = await getDatasetItems(datasetId);
    const result = await storeAds(prisma, ads, advertiserId);

    const isComplete = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(
      apifyStatus
    );
    const costUsd = isComplete ? ads.length * 0.004 : null;

    if (existingScrapeRunId) {
      await prisma.scrapeRun.update({
        where: { id: existingScrapeRunId },
        data: {
          apifyDatasetId: datasetId,
          adsFound: ads.length,
          ...(isComplete && {
            status: "completed",
            adsNew: result.adsNew,
            adsUpdated: result.adsUpdated,
            costUsd,
            completedAt: new Date(),
          }),
        },
      });
    } else {
      await prisma.scrapeRun.create({
        data: {
          advertiserId,
          apifyRunId: runId,
          apifyDatasetId: datasetId,
          status: isComplete ? "completed" : "running",
          adsFound: ads.length,
          adsNew: result.adsNew,
          adsUpdated: result.adsUpdated,
          costUsd,
          completedAt: isComplete ? new Date() : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      adsFound: ads.length,
      adsNew: result.adsNew,
      adsUpdated: result.adsUpdated,
      costUsd: costUsd != null ? Math.round(costUsd * 100) / 100 : undefined,
      message: `Saved ${ads.length} ads to the database. Check Explore to see them.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sync failed for advertiser", advertiserId, message);
    return NextResponse.json(
      { error: "Failed to fetch or save ads", details: message },
      { status: 500 }
    );
  }
}
