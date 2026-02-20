import type { Page } from "playwright";

/** Data scraped from an ad's detail page (right rail + full copy + creative). */
export type AdDetailData = {
  fullAdCopy: string;
  paidForBy: string;
  runFromTo: string;
  totalImpressions: string;
  countryImpressions: Array<{ country: string; percentage: string }>;
  targetingLanguage: string;
  targetingLocation: string;
  /** Video: MP4 URL. Image ads: keep using overview imageUrl. */
  creativeVideoUrl?: string;
  /** Filled when scraping detail-only (from "About the ad" section). */
  aboutTheAdFormat?: string;
  /** Company name, stripped from paidForBy. */
  companyName?: string;
  /** CTA/headline from creative area. */
  ctaText?: string;
  /** Main creative image URL. */
  imageUrl?: string;
};

const DETAIL_SELECTORS = {
  seeMoreButton: 'button[data-tracking-control-name="ad_library_ad_preview_see_more"]',
  fullCopy: ".commentary__container p.commentary__content",
  rightRail: ".ad-detail-right-rail",
  payingEntity: "p.about-ad__paying-entity",
  availabilityDuration: "p.about-ad__availability-duration",
  totalImpressionsRow: "div.flex.justify-between",
  countryImpressions: "span.ad-analytics__country-impressions",
  showMoreCountries: "button.show-more-less__more-button",
  videoSrc: "div.share-native-video video.vjs-tech[src], div.share-native-video [data-sources]",
} as const;

/**
 * Scrapes the current ad detail page. Call after navigating to e.g. /ad-library/detail/752187783.
 * Optionally expands "…see more" to get full ad copy.
 */
export async function scrapeAdDetail(page: Page): Promise<AdDetailData | null> {
  try {
    await page.waitForSelector("body", { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Expand "…see more" if present so we get full copy
    const seeMore = page.locator(DETAIL_SELECTORS.seeMoreButton).first();
    const seeMoreVisible = await seeMore.isVisible().catch(() => false);
    if (seeMoreVisible) {
      const isHidden = await seeMore.evaluate((el) => el.classList.contains("hidden")).catch(() => true);
      if (!isHidden) {
        await seeMore.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    // Ad copy: Single Image/Video/Document/Carousel use commentary__content; Message uses sponsored-message__content; Text/Spotlight use different structure
    let fullAdCopy =
      (await page.locator(DETAIL_SELECTORS.fullCopy).first().textContent().catch(() => null))?.trim() ?? "";
    if (!fullAdCopy) {
      fullAdCopy =
        (await page.locator("p.sponsored-message__content").first().textContent().catch(() => null))?.trim() ?? "";
    }
    if (!fullAdCopy) {
      fullAdCopy =
        (await page.locator(".sponsored-message__content").first().textContent().catch(() => null))?.trim() ?? "";
    }
    if (!fullAdCopy) {
      fullAdCopy =
        (await page.locator(".commentary__content").first().textContent().catch(() => null))?.trim() ?? "";
    }
    if (!fullAdCopy) {
      fullAdCopy =
        (await page.locator("div.text-ad-preview div.font-semibold, div.text-ad-preview .break-words").first().textContent().catch(() => null))?.trim() ?? "";
    }
    if (!fullAdCopy) {
      fullAdCopy =
        (await page.locator("p.text-color-text-low-emphasis, p.break-words").first().textContent().catch(() => null))?.trim() ?? "";
    }

    const rail = page.locator(DETAIL_SELECTORS.rightRail).first();
    const paidForByRaw =
      (await rail.locator(DETAIL_SELECTORS.payingEntity).first().textContent().catch(() => null))?.trim() ?? "";
    const paidForBy = paidForByRaw;
    const companyName = paidForByRaw.replace(/^Paid for by\s+/i, "").trim() || paidForByRaw;
    // "About the ad" format: first line after h2 "About the ad" (e.g. "Single Image Ad", "Video Ad", "Message Ad")
    const formatPattern =
      /(Single Image Ad|Video Ad|Carousel Ad|Document Ad|Event Ad|Message Ad|Text Ad|Spotlight Ad)/i;
    const railText = (await rail.textContent().catch(() => null)) ?? "";
    const formatMatch = railText.match(formatPattern);
    const aboutTheAdFormat = formatMatch?.[1] ?? "";
    const runFromTo =
      (await rail.locator(DETAIL_SELECTORS.availabilityDuration).first().textContent().catch(() => null))?.trim() ?? "";

    // Total Impressions: row that contains "Total Impressions", second p is the value
    let totalImpressions = "";
    const rows = await rail.locator(DETAIL_SELECTORS.totalImpressionsRow).all();
    for (const row of rows) {
      const text = await row.textContent().catch(() => "") ?? "";
      if (text.includes("Total Impressions")) {
        const ps = await row.locator("p").all();
        if (ps.length >= 2) totalImpressions = (await ps[1].textContent().catch(() => null))?.trim() ?? "";
        break;
      }
    }

    // Optionally expand countries "Show more"
    const showMoreBtn = rail.locator(DETAIL_SELECTORS.showMoreCountries).first();
    const showMoreVisible = await showMoreBtn.isVisible().catch(() => false);
    if (showMoreVisible) {
      await showMoreBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const countryImpressions: Array<{ country: string; percentage: string }> = [];
    const countrySpans = await rail.locator(DETAIL_SELECTORS.countryImpressions).all();
    for (const span of countrySpans) {
      const label = await span.getAttribute("aria-label").catch(() => null);
      if (label) {
        const match = label.match(/^(.+),\s*impressions\s+(.+)$/);
        if (match) countryImpressions.push({ country: match[1].trim(), percentage: match[2].trim() });
      }
    }

    // Targeting: Language and Location — .ad-targeting__segments lives in same block as h3
    const targetingLanguage =
      (await rail.locator('div:has(h3:has-text("Language")) .ad-targeting__segments').first().textContent().catch(() => null))?.trim() ?? "";
    const targetingLocation =
      (await rail.locator('div:has(h3:has-text("Location")) .ad-targeting__segments').first().textContent().catch(() => null))?.trim() ?? "";

    // CTA/headline: format-specific (Single Image/Video use .sponsored-content-headline h2; Event uses div.grow h2; Text/Spotlight use h2 or div)
    let ctaText =
      (await page.locator(".sponsored-content-headline h2").first().textContent().catch(() => null))?.trim() ?? "";
    if (!ctaText) {
      ctaText =
        (await page.locator("a[data-tracking-control-name*='headline'] h2").first().textContent().catch(() => null))?.trim() ?? "";
    }
    if (!ctaText) {
      ctaText =
        (await page.locator("div.grow h2").first().textContent().catch(() => null))?.trim() ?? "";
    }
    if (!ctaText) {
      ctaText =
        (await page.locator("h2.text-sm.font-semibold, h2.text-color-text").first().textContent().catch(() => null))?.trim() ?? "";
    }
    if (!ctaText) {
      ctaText =
        (await page.locator("div.font-semibold.text-sm.break-words").first().textContent().catch(() => null))?.trim() ?? "";
    }
    // Main image/thumbnail: format-specific selectors (detail page structure varies)
    let imageUrl =
      (await page.locator("img.ad-preview__dynamic-dimensions-image").first().getAttribute("src").catch(() => null)) ?? "";
    if (!imageUrl) {
      imageUrl =
        (await page.locator("img[src*='event-background']").first().getAttribute("src").catch(() => null)) ?? "";
    }
    if (!imageUrl) {
      imageUrl =
        (await page.locator("img[src*='ssu-carousel']").first().getAttribute("src").catch(() => null)) ?? "";
    }
    if (!imageUrl) {
      imageUrl =
        (await page.locator("a[data-tracking-control-name*='native_document_image'] img").first().getAttribute("src").catch(() => null)) ?? "";
    }
    if (!imageUrl) {
      imageUrl =
        (await page.locator('img[alt="Ad image"]').first().getAttribute("src").catch(() => null)) ?? "";
    }
    // Video: poster image or thumbnail
    if (!imageUrl) {
      imageUrl =
        (await page.locator("div.share-native-video video[poster]").first().getAttribute("poster").catch(() => null)) ?? "";
    }
    if (!imageUrl) {
      imageUrl =
        (await page.locator("div.share-native-video img").first().getAttribute("src").catch(() => null)) ?? "";
    }
    // Document: generic document cover (different structure)
    if (!imageUrl) {
      imageUrl =
        (await page.locator("img[src*='ads-document-cover']").first().getAttribute("src").catch(() => null)) ?? "";
    }
    // Spotlight/Conversation: profile or company image as fallback
    if (!imageUrl) {
      imageUrl =
        (await page.locator("img[class*='rounded']").first().getAttribute("src").catch(() => null)) ?? "";
    }
    // Last resort: first substantial LinkedIn CDN image (exclude logos/icons)
    if (!imageUrl) {
      const imgs = await page.locator("img[src*='media.licdn.com']").all();
      for (const img of imgs) {
        const src = await img.getAttribute("src").catch(() => null);
        if (
          src &&
          !src.includes("company-logo_100_100") &&
          !src.includes("profile-displayphoto-shrink_100") &&
          !src.includes("ghost")
        ) {
          imageUrl = src;
          break;
        }
      }
    }

    // Video: prefer video src; fallback parse data-sources JSON
    let creativeVideoUrl: string | undefined;
    const videoEl = page.locator("div.share-native-video video.vjs-tech").first();
    const src = await videoEl.getAttribute("src").catch(() => null);
    if (src) {
      creativeVideoUrl = src;
    } else {
      const dataSources = await page.locator("div.share-native-video [data-sources]").first().getAttribute("data-sources").catch(() => null);
      if (dataSources) {
        try {
          const parsed = JSON.parse(dataSources.replace(/&quot;/g, '"')) as Array<{ type?: string; src?: string }>;
          const mp4 = parsed.find((s) => s.type === "video/mp4" && s.src);
          if (mp4?.src) creativeVideoUrl = mp4.src;
        } catch {
          // ignore
        }
      }
    }

    return {
      fullAdCopy,
      paidForBy,
      runFromTo,
      totalImpressions,
      countryImpressions,
      targetingLanguage,
      targetingLocation,
      creativeVideoUrl,
      aboutTheAdFormat: aboutTheAdFormat || undefined,
      companyName: companyName || undefined,
      ctaText: ctaText || undefined,
      imageUrl: imageUrl || undefined,
    };
  } catch (e) {
    console.warn("scrapeAdDetail error", e);
    return null;
  }
}
