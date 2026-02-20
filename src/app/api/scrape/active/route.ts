import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncScrapeRun } from "@/lib/services/sync-scrape-run";

export const dynamic = "force-dynamic";

/** Only consider runs started in the last 6 hours as "active" (avoids stuck runs keeping banner visible). */
const ACTIVE_RUN_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * GET: whether any scrape is currently running (for Explore banner + auto-refresh).
 * When there are running runs, we sync from Apify before returning so ads appear
 * without relying on Vercel cron (Hobby plan only allows daily cron).
 */
export async function GET() {
  const since = new Date(Date.now() - ACTIVE_RUN_MAX_AGE_MS);
  const runningList = await prisma.scrapeRun.findMany({
    where: { status: "running", startedAt: { gte: since } },
    select: { id: true, adsFound: true, startedAt: true },
    orderBy: { startedAt: "desc" },
  });

  // Sync each running run so ads are saved even if cron didn't run (e.g. Hobby = daily only)
  for (const run of runningList) {
    try {
      await syncScrapeRun(prisma, run.id);
    } catch (err) {
      console.error("Active endpoint sync failed for run", run.id, err);
      // Continue; we'll return current adsFound and try again on next poll
    }
  }

  // Re-fetch after sync so adsFound is up to date
  const running = await prisma.scrapeRun.findFirst({
    where: { status: "running", startedAt: { gte: since } },
    select: { id: true, adsFound: true, startedAt: true },
  });

  return NextResponse.json({
    active: !!running,
    adsFound: running?.adsFound ?? 0,
  });
}
