/**
 * Apify LinkedIn Ads Scraper type definitions
 * See: https://apify.com/silva95gustavo/linkedin-ad-library-scraper
 */

/** Raw ad item from Apify dataset (actor may use id or adId) */
export interface ApifyAd {
  adId?: string;
  id?: string;
  adLibraryUrl?: string;
  advertiserName: string;
  advertiserUrl: string;
  advertiserLogo?: string;
  format: string;
  body?: string;
  headline?: string;
  clickUrl?: string;
  ctas?: string[];
  availability?: { start?: string; end?: string };
  impressions?: string;
  paidBy?: string;
  targeting?: { language?: string; location?: string };
  imageUrl?: string;
  videoUrl?: string;
  /** Video thumbnail/poster image URL (e.g. from Apify or detail scraper) */
  videoThumbnailUrl?: string;
  documentUrl?: string;
  imageUrls?: string[];
  slides?: Array<{ imageUrl: string; title?: string }>;
  impressionsPerCountry?: Array<{ country: string; impressions: string }>;
  startUrl?: string;
  /** Message ad: sender display name (thought leader) */
  senderName?: string;
  /** Message ad: sender profile image URL */
  senderImageUrl?: string;
  /** Event ad: formatted date/time range (e.g. "March 6, 2025, 12:30 PM - March 6, 2025, 1:30 PM UTC") */
  eventTimeDisplay?: string;
  /** Event ad: event page URL (may differ from clickUrl) */
  eventUrl?: string;
}

/** Apify run status values */
export type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "ABORTED"
  | "TIMED-OUT";

/** Known ad format values from Apify output */
export type AdFormat =
  | "SINGLE_IMAGE"
  | "CAROUSEL"
  | "VIDEO"
  | "MESSAGE"
  | "TEXT"
  | "DOCUMENT"
  | "EVENT"
  | "SPOTLIGHT"
  | "FOLLOW_COMPANY";
