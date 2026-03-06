/**
 * Shared types for LinkedIn scraper adapters.
 * Both Apify and ScrapeCreators adapters produce this shape for unified storage.
 */

export interface NormalizedAd {
  externalId: string;
  adLibraryUrl: string;
  format: string;
  bodyText?: string;
  headline?: string;
  callToAction?: string;
  destinationUrl?: string;
  mediaUrl?: string;
  mediaData?: object;
  startDate?: Date;
  endDate?: Date;
  impressions?: string;
  impressionsPerCountry?: { country: string; impressions: string }[];
  targetLanguage?: string;
  targetLocation?: string;
  paidBy?: string;
  thoughtLeaderMemberUrl?: string;
  thoughtLeaderMemberImageUrl?: string;
  /** Thought leader ads (ScrapeCreators): poster name + title */
  poster?: string;
  posterTitle?: string;
}

export interface NormalizedAdvertiser {
  linkedinCompanyId: string;
  linkedinUrl: string;
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  employeeCount?: number;
  website?: string;
  headquartersCity?: string;
  headquartersState?: string;
  headquartersCountry?: string;
  slogan?: string;
  followers?: number;
  industry?: string;
  size?: string;
  specialties?: string[];
  funding?: {
    numberOfRounds?: number | null;
    lastRound?: { type?: string; date?: string | null; amount?: string } | null;
    investors?: unknown[];
  } | null;
}

export interface LinkedInScrapeResult {
  advertiser: NormalizedAdvertiser;
  ads: NormalizedAd[];
}

/** Optional params for scrape (e.g. ScrapeCreators date range). */
export interface ScrapeOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface LinkedInScraperAdapter {
  scrape(linkedinCompanyUrl: string, options?: ScrapeOptions): Promise<LinkedInScrapeResult>;
}
