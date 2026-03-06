import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET: return current Settings (linkedinScraper). */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.settings.findFirst();
  return NextResponse.json({
    linkedinScraper: settings?.linkedinScraper ?? "apify",
  });
}

/** POST: update linkedinScraper. Body: { linkedinScraper: "apify" | "scrapecreators" } */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { linkedinScraper?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const value = body.linkedinScraper?.trim()?.toLowerCase();
  if (value !== "apify" && value !== "scrapecreators") {
    return NextResponse.json(
      { error: "linkedinScraper must be 'apify' or 'scrapecreators'" },
      { status: 400 }
    );
  }

  try {
    await prisma.settings.upsert({
      where: { id: "global" },
      update: { linkedinScraper: value },
      create: { id: "global", linkedinScraper: value },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/settings] upsert failed:", message);
    return NextResponse.json(
      { error: "Failed to save settings", details: message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, linkedinScraper: value });
}
