/**
 * Import Apify LinkedIn Ads Library export (JSON).
 * Shape matches Apify export as-is: array of ad objects with adId, advertiserLogo,
 * advertiserName, advertiserUrl (e.g. "https://www.linkedin.com/company/2027242"), etc.
 */

/** Single item from Apify JSON export (all fields optional to accept export as-is). */
export interface ApifyExportItem {
  adId?: string;
  id?: string;
  adLibraryUrl?: string;
  advertiserLogo?: string;
  advertiserName?: string;
  advertiserUrl?: string;
  body?: string;
  clickUrl?: string;
  ctas?: string[];
  availability?: { start?: string; end?: string };
  format?: string;
  paidBy?: string;
  impressions?: string;
  targeting?: { language?: string; location?: string };
  headline?: string;
  imageUrl?: string;
  startUrl?: string;
  impressionsPerCountry?: Array<{ country: string; impressions: string }>;
  [key: string]: unknown;
}

/** Extract LinkedIn company id from advertiserUrl (e.g. "https://www.linkedin.com/company/2027242" -> "2027242"). */
export function extractLinkedInCompanyId(advertiserUrl: string | null | undefined): string | null {
  if (!advertiserUrl || typeof advertiserUrl !== "string") return null;
  const trimmed = advertiserUrl.trim();
  const match = trimmed.match(/linkedin\.com\/company\/([^/?]+)/i);
  return match ? match[1] : null;
}

/** Unique advertiser with logo from export: keyed by linkedinCompanyId, value = first non-empty advertiserLogo. */
export function collectAdvertiserLogos(
  items: ApifyExportItem[]
): Map<string, string> {
  const byCompanyId = new Map<string, string>();
  for (const item of items) {
    const companyId = extractLinkedInCompanyId(item.advertiserUrl);
    if (!companyId) continue;
    const logo = item.advertiserLogo;
    if (typeof logo === "string" && logo.trim() !== "" && !byCompanyId.has(companyId)) {
      byCompanyId.set(companyId, logo.trim());
    }
  }
  return byCompanyId;
}
