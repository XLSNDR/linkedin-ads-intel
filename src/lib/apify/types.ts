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
  slides?: Array<{ imageUrl: string }>;
  impressionsPerCountry?: Array<{ country: string; impressions: string }>;
  startUrl?: string;
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
