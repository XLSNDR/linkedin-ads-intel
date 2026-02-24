/**
 * Build LinkedIn Ad Library search URLs with optional date range.
 * Used for follow scrapes (last 7 or 30 days). UTC only.
 */

const BASE_URL = "https://www.linkedin.com/ad-library/search";

export type ScrapeWindow = "last-30-days" | "last-7-days";

/**
 * Build a LinkedIn Ad Library search URL for a company and time window.
 * @param linkedinCompanyId - Numeric company ID (e.g. "2027242")
 * @param window - "last-30-days" or "last-7-days"
 * @param referenceDate - Optional date for "today" (UTC). Used for testing. Defaults to now.
 */
export function buildAdLibrarySearchUrl(
  linkedinCompanyId: string,
  window: ScrapeWindow,
  referenceDate?: Date
): string {
  const now = referenceDate ?? new Date();

  if (window === "last-30-days") {
    return `${BASE_URL}?companyIds=${linkedinCompanyId}&dateOption=last-30-days`;
  }

  // last-7-days: enddate = yesterday (UTC), startdate = 6 days before yesterday (7 days inclusive)
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterday = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);
  const startDateMs = yesterday.getTime() - 6 * 24 * 60 * 60 * 1000;
  const startDate = formatUTCDate(new Date(startDateMs));
  const endDate = formatUTCDate(yesterday);

  return `${BASE_URL}?companyIds=${linkedinCompanyId}&dateOption=custom-date-range&startdate=${startDate}&enddate=${endDate}`;
}

function formatUTCDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Map plan refresh frequency to scrape window.
 */
export function frequencyToWindow(
  frequency: "weekly" | "monthly"
): ScrapeWindow {
  return frequency === "weekly" ? "last-7-days" : "last-30-days";
}
