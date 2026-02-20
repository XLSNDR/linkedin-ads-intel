/**
 * Parse and normalize LinkedIn company page URLs for Add Advertiser flow.
 * Reject non-company URLs.
 */

const COMPANY_PAGE_PATTERN =
  /^https?:\/\/(www\.)?linkedin\.com\/company\/([^/?#]+)/i;
const COMPANY_PAGE_PATTERN_RELAXED =
  /linkedin\.com\/company\/([^/?#]+)/i;

/** Normalize to https://www.linkedin.com/company/{slug-or-id}/ */
export function normalizeLinkedInCompanyUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let match = trimmed.match(COMPANY_PAGE_PATTERN);
  if (!match) {
    if (trimmed.startsWith("http")) return null;
    match = trimmed.match(COMPANY_PAGE_PATTERN_RELAXED);
  }
  if (!match) return null;

  const slugOrId = match[2] ?? match[1];
  if (!slugOrId) return null;

  return `https://www.linkedin.com/company/${slugOrId}/`;
}

/** Extract company path segment (slug or numeric ID) from normalized URL for lookup. */
export function getCompanyPathSegment(normalizedUrl: string): string | null {
  const m = normalizedUrl.match(/linkedin\.com\/company\/([^/]+)/i);
  return m ? m[1] : null;
}

/**
 * Extract numeric company ID from Apify advertiserUrl (e.g. https://www.linkedin.com/company/2027242).
 * Returns null if not numeric.
 */
export function extractCompanyIdFromAdvertiserUrl(advertiserUrl: string | undefined): string | null {
  if (!advertiserUrl || typeof advertiserUrl !== "string") return null;
  const m = advertiserUrl.match(/linkedin\.com\/company\/(\d+)/i);
  if (!m) return null;
  return m[1];
}
