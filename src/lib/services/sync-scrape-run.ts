/**
 * Sync one scrape run: fetch current dataset from Apify, save to DB, update ScrapeRun.
 * Used by both the status poll (GET /api/scrape/status/[id]) and the cron job.
 */

import type { PrismaClient } from "@prisma/client";
import { getRunStatus, getDatasetItems } from "@/lib/apify/client";
import { storeAds, type StoreAdsJobType } from "./ad-storage";

/** Only consider runs started in the last 6 hours as "active" (same as /api/scrape/active). */
const ACTIVE_RUN_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface SyncResult {
  status: "running" | "completed" | "failed";
  adsFound: number;
  adsNew?: number;
  adsUpdated?: number;
  costUsd?: number;
  runStatus: string;
}

export async function syncScrapeRun(
  prisma: PrismaClient,
  scrapeRunId: string,
  jobTypeParam: StoreAdsJobType = "initial"
): Promise<SyncResult | null> {
  const scrapeRun = await prisma.scrapeRun.findUnique({
    where: { id: scrapeRunId },
    include: { advertiser: { select: { scrapeFrequency: true } } },
  });

  if (!scrapeRun?.apifyRunId) return null;

  const jobType: StoreAdsJobType =
    (scrapeRun.jobType as StoreAdsJobType) ?? jobTypeParam;

  const runId = scrapeRun.apifyRunId;
  let datasetId = scrapeRun.apifyDatasetId;

  const { status: apifyStatus, datasetId: resolvedDatasetId } =
    await getRunStatus(runId);
  datasetId = datasetId ?? resolvedDatasetId;

  if (!datasetId) {
    return {
      status: "running",
      adsFound: scrapeRun.adsFound,
      runStatus: apifyStatus,
    };
  }

  const ads = await getDatasetItems(datasetId);
  const result = await storeAds(prisma, ads, scrapeRun.advertiserId, jobType);

  const isComplete = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(
    apifyStatus
  );
  const costUsd = isComplete ? ads.length * 0.004 : null;

  await prisma.scrapeRun.update({
    where: { id: scrapeRunId },
    data: {
      apifyDatasetId: datasetId,
      adsFound: ads.length,
      ...(isComplete && {
        status: apifyStatus === "SUCCEEDED" ? "completed" : "failed",
        adsNew: result.adsNew,
        adsUpdated: result.adsUpdated,
        costUsd,
        completedAt: new Date(),
        ...(apifyStatus !== "SUCCEEDED" && {
          errorMessage: `Apify run ended with status: ${apifyStatus}`,
        }),
      }),
    },
  });

  if (
    isComplete &&
    apifyStatus === "SUCCEEDED" &&
    jobType === "scheduled" &&
    scrapeRun.advertiser
  ) {
    const next = new Date();
    const freq = scrapeRun.advertiser.scrapeFrequency?.toLowerCase();
    if (freq === "weekly") {
      next.setDate(next.getDate() + 7);
    } else if (freq === "monthly") {
      next.setDate(next.getDate() + 30);
    }
    await prisma.advertiser.update({
      where: { id: scrapeRun.advertiserId },
      data: {
        lastScrapedAt: new Date(),
        ...(freq === "weekly" || freq === "monthly" ? { nextScrapeAt: next } : {}),
      },
    });
  }

  return {
    status: isComplete
      ? apifyStatus === "SUCCEEDED"
        ? "completed"
        : "failed"
      : "running",
    adsFound: ads.length,
    adsNew: isComplete ? result.adsNew : undefined,
    adsUpdated: isComplete ? result.adsUpdated : undefined,
    costUsd: costUsd != null ? Math.round(costUsd * 100) / 100 : undefined,
    runStatus: apifyStatus,
  };
}

/**
 * Sync all running scrape runs (started in the last 6 hours).
 * Call this on explore page load so ads appear without relying on cron or client polling.
 */
export async function syncAllRunningRuns(
  prisma: PrismaClient
): Promise<{ synced: number; errors: string[] }> {
  const since = new Date(Date.now() - ACTIVE_RUN_MAX_AGE_MS);
  const runningList = await prisma.scrapeRun.findMany({
    where: { status: "running", startedAt: { gte: since } },
    select: { id: true },
    orderBy: { startedAt: "desc" },
  });
  const errors: string[] = [];
  for (const run of runningList) {
    try {
      await syncScrapeRun(prisma, run.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${run.id}: ${message}`);
      console.error("syncAllRunningRuns failed for run", run.id, message);
    }
  }
  return { synced: runningList.length, errors };
}
