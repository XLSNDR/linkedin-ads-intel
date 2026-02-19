import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncScrapeRun } from "@/lib/services/sync-scrape-run";

export const dynamic = "force-dynamic";

/**
 * GET: whether any scrape is currently running (for Explore banner + auto-refresh).
 * When there are running runs, we sync from Apify before returning so ads appear
 * without relying on Vercel cron (Hobby plan only allows daily cron).
 */
export async function GET() {
  const runningList = await prisma.scrapeRun.findMany({
    where: { status: "running" },
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
    where: { status: "running" },
    select: { id: true, adsFound: true, startedAt: true },
  });

  return NextResponse.json({
    active: !!running,
    adsFound: running?.adsFound ?? 0,
  });
}
