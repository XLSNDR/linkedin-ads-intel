import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { syncScrapeRun } from "@/lib/services/sync-scrape-run";

export const dynamic = "force-dynamic";

/**
 * GET: Admin-only. Trigger sync for a scrape run (fetch from Apify + save to DB).
 * Query: ?scrapeRunId=... or ?apifyRunId=...
 * Use this to backfill when ads didn't appear (e.g. sync ran too early with 0 items).
 */
export async function GET(req: NextRequest) {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const scrapeRunId = searchParams.get("scrapeRunId")?.trim();
  const apifyRunId = searchParams.get("apifyRunId")?.trim();

  if (!scrapeRunId && !apifyRunId) {
    return NextResponse.json(
      { error: "Provide scrapeRunId or apifyRunId" },
      { status: 400 }
    );
  }

  let run: { id: string } | null = null;
  if (scrapeRunId) {
    run = await prisma.scrapeRun.findUnique({
      where: { id: scrapeRunId },
      select: { id: true },
    });
  } else if (apifyRunId) {
    run = await prisma.scrapeRun.findFirst({
      where: { apifyRunId },
      select: { id: true },
    });
  }

  if (!run) {
    return NextResponse.json(
      { error: "Scrape run not found" },
      { status: 404 }
    );
  }

  try {
    const result = await syncScrapeRun(prisma, run.id);
    return NextResponse.json({
      ok: true,
      scrapeRunId: run.id,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Admin sync-run failed", run.id, message);
    return NextResponse.json(
      { error: "Sync failed", details: message },
      { status: 500 }
    );
  }
}
