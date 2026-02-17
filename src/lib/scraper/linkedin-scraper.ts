import { chromium } from "playwright";
import path from "node:path";
import { scrapeAdDetail } from "./scrape-ad-detail";
import type { AdDetailData } from "./scrape-ad-detail";

// Selectors from LinkedIn Ads Library search page (Feb 2026 – from real ad card HTML)
// Card is the wrapper div.ad-preview; inner content is in .base-ad-preview-card
const SELECTORS = {
  adCard: "div.ad-preview",
  innerCard: "div.base-ad-preview-card",
  companyName: "div.flex.flex-col.self-center div.font-bold",
  adCopy: "p.commentary__content",
  headline: ".sponsored-content-headline h2",
  image: "img.ad-preview__dynamic-dimensions-image",
  viewDetailsLink: "a[data-tracking-control-name='ad_library_view_ad_detail']",
} as const;

// Map data-creative-type (from div.ad-preview) to format string for format-detector
// Values from real LinkedIn Ads Library HTML (Simplicate, ELIX, etc.)
const CREATIVE_TYPE_TO_FORMAT: Record<string, string> = {
  SPONSORED_STATUS_UPDATE: "Single Image Ad",
  SPONSORED_VIDEO: "Video Ad",
  SPONSORED_UPDATE_EVENT: "Event Ad",
  SPONSORED_UPDATE_CAROUSEL: "Carousel Ad",
  SPONSORED_UPDATE_NATIVE_DOCUMENT: "Document Ad",
  SPONSORED_MESSAGE: "Message Ad",
  TEXT_AD: "Text Ad",
  SPOTLIGHT_V2: "Spotlight Ad",
};

export type ScrapedAd = {
  companyName: string;
  adCopy: string;
  ctaText: string;
  imageUrl: string;
  aboutTheAdFormat: string;
  hasPromotedBy: boolean;
  adId?: string;
  adLibraryUrl?: string;
  // Filled when we scrape the ad detail page
  detail?: AdDetailData;
};

export async function scrapeAdvertiser(
  companyId: string,
  options: { limit?: number; screenshotPath?: string; detailLimit?: number } = {}
): Promise<{ ads: ScrapedAd[]; title: string }> {
  const { limit = 10, screenshotPath, detailLimit = 0 } = options;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Search URL shows ads for this company (e.g. companyIds=69255797 for ELIX)
    const url = `https://www.linkedin.com/ad-library/search?companyIds=${companyId}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    await page.waitForSelector("body", { timeout: 10000 });
    // Let the ad list render (LinkedIn often loads it via JS)
    await page.waitForTimeout(3000);
    const title = await page.title();
    console.log("Page title:", title);

    if (screenshotPath) {
      await page.screenshot({
        path: path.isAbsolute(screenshotPath)
          ? screenshotPath
          : path.join(process.cwd(), screenshotPath),
      });
    }

    // Try to find ad cards; if selector doesn't match, we return empty and still succeed
    const cards = await page.locator(SELECTORS.adCard).all();
    const ads: ScrapedAd[] = [];
    const toProcess = Math.min(cards.length, limit);

    for (let i = 0; i < toProcess; i++) {
      const card = cards[i];
      try {
        const companyName =
          (await card.locator(SELECTORS.companyName).first().textContent().catch(() => null))?.trim() ?? "";
        // Ad copy: Single Image/Video/Document/Carousel use commentary__content; Conversation uses sponsored-message__content; Text uses div.font-semibold; Spotlight uses p.text-xs + h2
        const adCopy =
          (await card.locator(SELECTORS.adCopy).first().textContent().catch(() => null))?.trim() ??
          (await card.locator("p.sponsored-message__content").first().textContent().catch(() => null))?.trim() ??
          (await card.locator("div.font-semibold.text-sm").first().textContent().catch(() => null))?.trim() ??
          "";
        // Headline/CTA: Single Image/Video use .sponsored-content-headline h2; Event uses div.grow h2; Carousel uses span.text-xs.font-semibold (first card); Text uses div.font-semibold; Spotlight uses h2
        const headlineMain =
          (await card.locator(SELECTORS.headline).first().textContent().catch(() => null))?.trim() ?? "";
        const headlineEvent =
          (await card.locator("div.grow h2").first().textContent().catch(() => null))?.trim() ?? "";
        const headlineCarousel =
          (await card.locator("span.text-xs.font-semibold.text-color-text").first().textContent().catch(() => null))?.trim() ?? "";
        const headlineSpotlight =
          (await card.locator("h2.text-sm.font-semibold").first().textContent().catch(() => null))?.trim() ?? "";
        const ctaText = headlineMain || headlineEvent || headlineCarousel || headlineSpotlight;
        // Image: most use ad-preview__dynamic-dimensions-image; Text ad uses img[alt="Ad image"]; Document uses img in document preview
        const img = card.locator(SELECTORS.image).first();
        let imageUrl = (await img.getAttribute("src").catch(() => null)) ?? "";
        if (!imageUrl) {
          imageUrl = (await card.locator('img[alt="Ad image"]').first().getAttribute("src").catch(() => null)) ?? "";
        }
        if (!imageUrl) {
          imageUrl = (await card.locator("a[data-tracking-control-name='ad_library_ad_preview_native_document_image'] img").first().getAttribute("src").catch(() => null)) ?? "";
        }
        // Format: prefer data-creative-type on div.ad-preview (e.g. SPONSORED_STATUS_UPDATE), else inner card aria-label
        const dataCreativeType =
          (await card.getAttribute("data-creative-type").catch(() => null)) ?? "";
        const innerCard = card.locator(SELECTORS.innerCard).first();
        let ariaLabel =
          (await innerCard.getAttribute("aria-label").catch(() => null)) ?? "";
        if (!ariaLabel) {
          ariaLabel =
            (await card.locator("[aria-label]").first().getAttribute("aria-label").catch(() => null)) ?? "";
        }
        const aboutTheAdFormat =
          CREATIVE_TYPE_TO_FORMAT[dataCreativeType] ??
          ariaLabel.split(",").map((s) => s.trim())[1] ??
          "";
        // Thought leader ads show "Promoted by <strong>Company</strong>"; company ads show only "Promoted"
        const hasPromotedBy = (await card.locator("p:has-text('Promoted by')").count().catch(() => 0)) > 0;
        const detailHref = await card.locator(SELECTORS.viewDetailsLink).first().getAttribute("href").catch(() => null);
        const adLibraryUrl = detailHref ? `https://www.linkedin.com${detailHref}` : undefined;
        const adIdMatch = detailHref?.match(/\/ad-library\/detail\/(\d+)/);
        const adId = adIdMatch?.[1];

        ads.push({
          companyName,
          adCopy,
          ctaText,
          imageUrl,
          aboutTheAdFormat,
          hasPromotedBy,
          adId,
          adLibraryUrl,
        });
      } catch (e) {
        console.warn("Skipping card", i, e);
      }
    }

    // Optionally visit each ad's detail page and enrich with full copy, runtime, impressions, targeting, video URL
    if (detailLimit > 0 && ads.length > 0) {
      const toFetch = Math.min(ads.length, detailLimit);
      for (let i = 0; i < toFetch; i++) {
        const ad = ads[i];
        if (!ad.adLibraryUrl) continue;
        try {
          await page.goto(ad.adLibraryUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForTimeout(2000);
          const detail = await scrapeAdDetail(page);
          if (detail) ads[i] = { ...ad, detail };
        } catch (e) {
          console.warn("Detail scrape failed for ad", i, ad.adId, e);
        }
      }
    }

    return { ads, title };
  } finally {
    await browser.close();
  }
}
