/**
 * Scrape ads directly from ad detail URLs (1 per format for validation).
 *
 * Usage:
 *   npx tsx scripts/scrape-by-url.ts --company-id=XXXX --company-name="Simplicate"
 *
 * Default URLs (Simplicate: 1 ad per format):
 *   Single Image, Video, Carousel, Document, Event, Conversation, Text, Spotlight
 *
 * Prereqs: .env with DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { scrapeAdDetail } from "../src/lib/scraper/scrape-ad-detail";
import { saveAdvertiserAds } from "../src/lib/db/save-ad";
import type { ScrapedAd } from "../src/lib/scraper/linkedin-scraper";

// 1 ad per format from Simplicate (user-provided URLs)
const DEFAULT_URLS = [
  "https://www.linkedin.com/ad-library/detail/943183954", // Single Image
  "https://www.linkedin.com/ad-library/detail/771199244", // Video
  "https://www.linkedin.com/ad-library/detail/673048034", // Carousel
  "https://www.linkedin.com/ad-library/detail/685869434", // Document
  "https://www.linkedin.com/ad-library/detail/680305984", // Event
  "https://www.linkedin.com/ad-library/detail/943272674", // Conversation
  "https://www.linkedin.com/ad-library/detail/669365034", // Text
  "https://www.linkedin.com/ad-library/detail/667428694", // Spotlight
];

function parseArgs(): { companyId: string; companyName: string; testDb: boolean; limit: number } {
  const args = process.argv.slice(2);
  let companyId = "";
  let companyName = "";
  let testDb = false;
  let limit = 8;
  for (const arg of args) {
    if (arg.startsWith("--company-id=")) companyId = arg.slice(13).trim();
    if (arg.startsWith("--company-name=")) companyName = arg.slice(15).replace(/^["']|["']$/g, "").trim();
    if (arg === "--test-db") testDb = true;
    if (arg.startsWith("--limit=")) limit = parseInt(arg.slice(8), 10) || 8;
  }
  if (!testDb && (!companyId || !companyName)) {
    console.error("Usage: npx tsx scripts/scrape-by-url.ts --company-id=XXXX --company-name=\"Simplicate\"");
    console.error("  --test-db  : Test DB connection only (no scrape)");
    console.error("  --visible  : Show browser window");
    process.exit(1);
  }
  return { companyId, companyName, testDb, limit };
}

async function main() {
  const { companyId, companyName, testDb, limit } = parseArgs();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in .env");
  }

  if (testDb) {
    console.log("Testing DB connection...");
    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.advertiser.count();
    console.log("✓ Connected. Existing advertisers:", count);
    await prisma.$disconnect();
    return;
  }

  const urls = DEFAULT_URLS.slice(0, limit);

  console.log("Starting scrape for", companyName, "(company", companyId, ") -", urls.length, "ads...\n");
  const headless = !process.argv.includes("--visible");
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const ads: ScrapedAd[] = [];

  try {
    for (const url of urls) {
      const adIdMatch = url.match(/\/ad-library\/detail\/(\d+)/);
      const adId = adIdMatch?.[1];
      console.log("Scraping:", url, adId ? `(ad ${adId})` : "");

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const detail = await scrapeAdDetail(page);

      if (!detail) {
        console.warn("  → No detail scraped, skipping");
        continue;
      }

      const scraped: ScrapedAd = {
        companyName: detail.companyName ?? companyName,
        adCopy: detail.fullAdCopy,
        ctaText: detail.ctaText ?? "",
        imageUrl: detail.imageUrl ?? "",
        aboutTheAdFormat: detail.aboutTheAdFormat ?? "",
        hasPromotedBy: false,
        adId: adId ?? undefined,
        adLibraryUrl: url,
        detail,
      };
      ads.push(scraped);
      console.log("  → Format:", detail.aboutTheAdFormat || "(unknown)");
    }
  } finally {
    await browser.close();
  }

  if (ads.length === 0) {
    console.log("No ads scraped. LinkedIn may require login, or selectors in scrape-ad-detail.ts need updating.");
    process.exit(1);
  }

  console.log("\nScraped", ads.length, "ads. Saving to database...");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const { saved, advertiserId } = await saveAdvertiserAds(prisma, companyId, companyName, ads);
    console.log("✓ Saved", saved, "ads for advertiser", advertiserId);
  } catch (err) {
    console.error("Save failed:", err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
