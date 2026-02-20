/**
 * Enrich EVENT ads that have no image: visit each ad's LinkedIn Ads Library detail page
 * (ad-library/detail/{id}) and scrape the event image from the ad preview, then update Ad.mediaUrl.
 * Only uses the Ads Library; does not open event detail pages (no login required for Ads Library).
 *
 * Usage:
 *   npx tsx scripts/enrich-event-ad-images.ts
 *   npx tsx scripts/enrich-event-ad-images.ts --dry-run
 *   npx tsx scripts/enrich-event-ad-images.ts --visible
 *
 * Prereqs: .env with DATABASE_URL.
 */

import "dotenv/config";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { scrapeAdDetail } from "../src/lib/scraper/scrape-ad-detail";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in .env");
  }

  const dryRun = process.argv.includes("--dry-run");
  const visible = process.argv.includes("--visible");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const eventAds = await prisma.ad.findMany({
    where: {
      format: { equals: "EVENT", mode: "insensitive" },
      OR: [{ mediaUrl: null }, { mediaUrl: "" }],
    },
    select: { id: true, externalId: true, adLibraryUrl: true },
  });

  if (eventAds.length === 0) {
    console.log("No EVENT ads found without image. Exiting.");
    await prisma.$disconnect();
    return;
  }

  console.log(
    `Found ${eventAds.length} EVENT ad(s) without image. Using Ads Library detail page only. ${dryRun ? "[DRY RUN]" : ""}`
  );

  const browser = await chromium.launch({ headless: !visible });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const total = eventAds.length;
  const updatedIds: string[] = [];
  const noImageIds: string[] = [];
  const errorIds: string[] = [];

  for (let i = 0; i < eventAds.length; i++) {
    const ad = eventAds[i];
    const n = i + 1;
    const detailUrl = (ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`).trim();
    console.log(`\n[${n}/${total}] ${ad.externalId} — ${detailUrl}`);

    try {
      await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      const detail = await scrapeAdDetail(page);
      const imageUrl = detail?.imageUrl?.trim();

      if (imageUrl) {
        console.log(`  → Image found (${imageUrl.slice(0, 60)}...)`);
        if (!dryRun) {
          await prisma.ad.update({
            where: { id: ad.id },
            data: { mediaUrl: imageUrl },
          });
        }
        updatedIds.push(ad.externalId);
      } else {
        console.log("  → No image found in ad preview.");
        noImageIds.push(ad.externalId);
      }
    } catch (err) {
      console.warn("  → Error:", (err as Error).message);
      errorIds.push(ad.externalId);
    }
  }

  await browser.close();
  await prisma.$disconnect();

  console.log("\n--- Summary ---");
  console.log(dryRun ? `[DRY RUN] Would update ${updatedIds.length} ad(s).` : `Updated: ${updatedIds.length} ad(s).`);
  if (updatedIds.length > 0) {
    console.log("  With image:", updatedIds.join(", "));
  }
  if (noImageIds.length > 0) {
    console.log("  No image found:", noImageIds.join(", "));
  }
  if (errorIds.length > 0) {
    console.log("  Errors:", errorIds.join(", "));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
