import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncScrapeRun } from "@/lib/services/sync-scrape-run";

/**
 * Cron: sync all running scrapes (fetch from Apify + save to DB).
 * Schedule: every minute (vercel.json). Requires Vercel Pro (Hobby is daily only).
 * Set CRON_SECRET in project env; Vercel sends it as Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const running = await prisma.scrapeRun.findMany({
    where: { status: "running" },
    select: { id: true },
  });

  const results: { id: string; status?: string; adsFound?: number; error?: string }[] = [];

  for (const run of running) {
    try {
      const result = await syncScrapeRun(prisma, run.id);
      results.push({
        id: run.id,
        status: result?.status,
        adsFound: result?.adsFound,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Cron sync failed for run", run.id, message);
      results.push({ id: run.id, error: message });
    }
  }

  return NextResponse.json({
    ok: true,
    synced: running.length,
    results,
  });
}
