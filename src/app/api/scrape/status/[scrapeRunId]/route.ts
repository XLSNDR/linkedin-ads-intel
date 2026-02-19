import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncScrapeRun } from "@/lib/services/sync-scrape-run";

export const dynamic = "force-dynamic";

/** GET: poll scrape progress; fetches current dataset, saves to DB, returns status and counts */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scrapeRunId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scrapeRunId } = await params;
  if (!scrapeRunId) {
    return NextResponse.json(
      { error: "scrapeRunId is required" },
      { status: 400 }
    );
  }

  const scrapeRun = await prisma.scrapeRun.findUnique({
    where: { id: scrapeRunId },
  });
  if (!scrapeRun) {
    return NextResponse.json(
      { error: "Scrape run not found" },
      { status: 404 }
    );
  }
  if (!scrapeRun.apifyRunId) {
    return NextResponse.json(
      { error: "Scrape run has no Apify run id" },
      { status: 400 }
    );
  }

  try {
    const result = await syncScrapeRun(prisma, scrapeRunId);
    if (!result) {
      return NextResponse.json(
        { error: "Could not sync run" },
        { status: 400 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Scrape status poll failed", scrapeRunId, message);
    return NextResponse.json(
      { error: "Failed to poll status", details: message },
      { status: 500 }
    );
  }
}
