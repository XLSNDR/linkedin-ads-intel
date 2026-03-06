import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET: return current scraper type (for UI to show/hide ScrapeCreators-only options). Auth required. */
export async function GET() {
  try {
    await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findFirst();
  return NextResponse.json({
    linkedinScraper: settings?.linkedinScraper ?? "apify",
  });
}
