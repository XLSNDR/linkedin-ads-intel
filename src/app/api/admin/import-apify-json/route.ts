/**
 * POST /api/admin/import-apify-json
 *
 * Import Apify LinkedIn Ads Library export (JSON) to backfill Advertiser logos
 * (and later other fields). Accepts the export as-is — no need to change the JSON.
 *
 * Input (either):
 * - Body: application/json with an array of ad objects (Apify export format).
 * - Form data: field "file" with a .json file containing the same array.
 *
 * Each item can have: adId, advertiserLogo, advertiserName, advertiserUrl, etc.
 * We match advertisers by extracting company id from advertiserUrl
 * (e.g. https://www.linkedin.com/company/2027242 -> 2027242) and update
 * Advertiser.logoUrl when present.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApifyExportItem } from "@/lib/import-apify-json";
import { collectAdvertiserLogos } from "@/lib/import-apify-json";

export const dynamic = "force-dynamic";

async function parseInput(request: Request): Promise<ApifyExportItem[]> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (!Array.isArray(body)) {
      throw new Error("JSON body must be an array of ad objects");
    }
    return body as ApifyExportItem[];
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new Error("Form data must include a 'file' field with the JSON file");
    }
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("JSON file must contain an array of ad objects");
    }
    return parsed as ApifyExportItem[];
  }

  throw new Error(
    "Send either application/json (body = array) or multipart/form-data with field 'file' (JSON file)"
  );
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let items: ApifyExportItem[];
  try {
    items = await parseInput(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const logoByCompanyId = collectAdvertiserLogos(items);
  const entries = Array.from(logoByCompanyId.entries());
  let advertisersUpdated = 0;
  let skippedNoMatch = 0;
  const errors: Array<{ linkedinCompanyId: string; error: string }> = [];

  for (const [linkedinCompanyId, logoUrl] of entries) {
    try {
      const result = await prisma.advertiser.updateMany({
        where: { linkedinCompanyId },
        data: { logoUrl },
      });
      if (result.count > 0) advertisersUpdated += result.count;
      else skippedNoMatch += 1;
    } catch (e) {
      errors.push({
        linkedinCompanyId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    adsProcessed: items.length,
    advertisersWithLogoInExport: logoByCompanyId.size,
    advertisersUpdated,
    skippedNoMatch,
    errors: errors.length > 0 ? errors : undefined,
  });
}
