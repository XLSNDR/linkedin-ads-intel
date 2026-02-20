import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startScrapeRun } from "@/lib/apify/client";
import { checkMonthlyBudget } from "@/lib/services/ad-storage";

export const dynamic = "force-dynamic";

/**
 * Cron: start scrapes for advertisers that are due (nextScrapeAt <= now).
 * Schedule: 2 AM UTC daily (vercel.json). Requires CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.advertiser.findMany({
    where: {
      scrapeFrequency: { not: null },
      nextScrapeAt: { lte: now },
    },
    select: {
      id: true,
      name: true,
      linkedinCompanyId: true,
      linkedinUrl: true,
      resultsLimit: true,
    },
  });

  const budgetCheck = await checkMonthlyBudget(prisma);
  if (!budgetCheck.ok) {
    return NextResponse.json({
      ok: true,
      started: 0,
      skipped: due.length,
      reason: "monthly_budget_exceeded",
    });
  }

  const results: { advertiserId: string; started?: boolean; error?: string }[] = [];

  for (const advertiser of due) {
    const hasId = !!advertiser.linkedinCompanyId?.trim();
    const hasUrl = !!advertiser.linkedinUrl?.trim();
    if (!hasId && !hasUrl) {
      results.push({
        advertiserId: advertiser.id,
        error: "no linkedinCompanyId or linkedinUrl",
      });
      continue;
    }

    try {
      const { runId, datasetId } = await startScrapeRun({
        ...(hasId && { linkedinCompanyId: advertiser.linkedinCompanyId! }),
        ...(hasUrl && { startUrls: [advertiser.linkedinUrl!] }),
        resultsLimit: advertiser.resultsLimit ?? undefined,
      });

      await prisma.scrapeRun.create({
        data: {
          advertiserId: advertiser.id,
          status: "running",
          apifyRunId: runId,
          apifyDatasetId: datasetId,
          jobType: "scheduled",
        },
      });

      results.push({ advertiserId: advertiser.id, started: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Scrape-due start failed", advertiser.id, message);
      results.push({ advertiserId: advertiser.id, error: message });
    }
  }

  return NextResponse.json({
    ok: true,
    due: due.length,
    started: results.filter((r) => r.started).length,
    results,
  });
}
