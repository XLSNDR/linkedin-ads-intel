/**
 * Sync one scrape run: fetch current dataset from Apify, save to DB, update ScrapeRun.
 * Used by both the status poll (GET /api/scrape/status/[id]) and the cron job.
 */

import type { PrismaClient } from "@prisma/client";
import { getRunStatus, getDatasetItems } from "@/lib/apify/client";
import { storeAds } from "./ad-storage";

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
  scrapeRunId: string
): Promise<SyncResult | null> {
  const scrapeRun = await prisma.scrapeRun.findUnique({
    where: { id: scrapeRunId },
  });

  if (!scrapeRun?.apifyRunId) return null;

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
  const result = await storeAds(prisma, ads, scrapeRun.advertiserId);

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
