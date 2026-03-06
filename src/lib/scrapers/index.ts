/**
 * LinkedIn scraper factory: returns the active adapter based on Settings.
 */

import { prisma } from "@/lib/prisma";
import { ApifyAdapter } from "./adapters/apify";
import { ScrapeCreatorsAdapter } from "./adapters/scrapecreators";
import type { LinkedInScraperAdapter } from "./types";

export async function getLinkedInScraper(): Promise<LinkedInScraperAdapter> {
  const settings = await prisma.settings.findFirst();
  if (settings?.linkedinScraper === "scrapecreators") {
    return new ScrapeCreatorsAdapter();
  }
  return new ApifyAdapter();
}

export type { LinkedInScraperAdapter, LinkedInScrapeResult, NormalizedAd, NormalizedAdvertiser } from "./types";
