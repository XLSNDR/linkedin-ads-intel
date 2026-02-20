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

  let updated = 0;
  for (const ad of eventAds) {
    const detailUrl = (ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`).trim();
    console.log("Ads Library URL:", detailUrl, "(ad", ad.externalId, ")");

    try {
      await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      const detail = await scrapeAdDetail(page);
      const imageUrl = detail?.imageUrl?.trim();

      if (imageUrl) {
        console.log("  → Image:", imageUrl.slice(0, 80) + "...");
        if (!dryRun) {
          await prisma.ad.update({
            where: { id: ad.id },
            data: { mediaUrl: imageUrl },
          });
        }
        updated++;
      } else {
        console.log("  → No image found in ad preview.");
      }
    } catch (err) {
      console.warn("  → Error:", (err as Error).message);
    }
  }

  await browser.close();
  await prisma.$disconnect();

  console.log(dryRun ? `[DRY RUN] Would update ${updated} ad(s).` : `Updated ${updated} ad(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
