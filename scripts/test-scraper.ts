/**
 * Full test: scrape LinkedIn Ads Library → upload images → save to DB.
 *
 * 1. In Supabase Dashboard → Storage, create a bucket named "ad-creatives" (public).
 * 2. Add to .env:
 *    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 3. Get a company ID from https://www.linkedin.com/ad-library/ (authorCompanyId in URL).
 * 4. Run:
 *    npx tsx scripts/test-scraper.ts           # Scrape ELIX (3 ads)
 *    npx tsx scripts/test-scraper.ts --diverse # Scrape diverse advertiser (80 ads, 20 with detail)
 *    Set DIVERSE_COMPANY_ID and DIVERSE_COMPANY_NAME for the --diverse run.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { scrapeAdvertiser } from "../src/lib/scraper/linkedin-scraper";
import { saveAdvertiserAds } from "../src/lib/db/save-ad";
import { detectAdFormat } from "../src/lib/scraper/format-detector";

const TEST_COMPANY_ID = "69255797"; // ELIX – from LinkedIn Ads Library
const TEST_COMPANY_NAME = "ELIX";

// Use this for an advertiser with diverse formats (8 formats + thought leader). Replace with company ID from LinkedIn Ads Library.
const DIVERSE_COMPANY_ID = "69255797"; // TODO: set to your diverse advertiser's company ID
const DIVERSE_COMPANY_NAME = "ELIX"; // TODO: set company name

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const useDiverse = process.argv.includes("--diverse");
  const companyId = useDiverse ? DIVERSE_COMPANY_ID : TEST_COMPANY_ID;
  const companyName = useDiverse ? DIVERSE_COMPANY_NAME : TEST_COMPANY_NAME;

  console.log("Scraping company:", companyId, companyName, useDiverse ? "(diverse formats)" : "");
  const { ads, title } = await scrapeAdvertiser(companyId, {
    limit: useDiverse ? 80 : 3,
    detailLimit: useDiverse ? 20 : 3,
    screenshotPath: useDiverse ? undefined : "scraper-debug-screenshot.png",
  });

  console.log("Page title:", title);
  console.log("Ads scraped:", ads.length);

  const formats = ads.map((ad) =>
    detectAdFormat({
      aboutTheAdFormat: ad.aboutTheAdFormat,
      hasPromotedBy: ad.hasPromotedBy,
      hasImageFile: !!ad.imageUrl,
    })
  );
  console.log("Formats detected:", formats);

  if (ads.length === 0) {
    console.log("No ads to save. Check SELECTORS in linkedin-scraper.ts for your LinkedIn page.");
    await prisma.$disconnect();
    return;
  }

  const { saved, advertiserId } = await saveAdvertiserAds(
    prisma,
    companyId,
    companyName,
    ads
  );

  console.log("Saved", saved, "ads for advertiser", advertiserId);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
