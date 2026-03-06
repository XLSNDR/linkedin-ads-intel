import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startScrapeRun } from "@/lib/apify/client";
import { checkMonthlyBudget, storeNormalizedResult } from "@/lib/services/ad-storage";
import { buildAdLibrarySearchUrl, frequencyToWindow } from "@/lib/linkedin-ad-library-url";
import { getLinkedInScraper } from "@/lib/scrapers";

export const dynamic = "force-dynamic";

/**
 * Cron: start scrapes for advertisers that are due (nextScrapeAt <= now).
 * Schedule: 2 AM UTC daily (vercel.json). Requires CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.advertiser.findMany({
    where: {
      scrapeFrequency: { not: null },
      nextScrapeAt: { lte: now },
    },
    select: {
      id: true,
      name: true,
      linkedinCompanyId: true,
      linkedinUrl: true,
      resultsLimit: true,
      scrapeFrequency: true,
      userAdvertisers: {
        where: { status: "following" },
        select: { id: true },
      },
    },
  });

  const budgetCheck = await checkMonthlyBudget(prisma);
  if (!budgetCheck.ok) {
    return NextResponse.json({
      ok: true,
      started: 0,
      skipped: due.length,
      reason: "monthly_budget_exceeded",
    });
  }

  const settings = await prisma.settings.findFirst();
  const useScrapeCreators = settings?.linkedinScraper === "scrapecreators";

  const results: { advertiserId: string; started?: boolean; error?: string }[] = [];

  for (const advertiser of due) {
    const hasId = !!advertiser.linkedinCompanyId?.trim();
    const hasUrl = !!advertiser.linkedinUrl?.trim();
    if (!hasId && !hasUrl) {
      results.push({
        advertiserId: advertiser.id,
        error: "no linkedinCompanyId or linkedinUrl",
      });
      continue;
    }

    try {
      if (useScrapeCreators) {
        const companyUrl =
          advertiser.linkedinUrl?.trim() ||
          (advertiser.linkedinCompanyId
            ? `https://www.linkedin.com/company/${advertiser.linkedinCompanyId}/`
            : null);
        if (!companyUrl) {
          results.push({
            advertiserId: advertiser.id,
            error: "no linkedinUrl or linkedinCompanyId",
          });
          continue;
        }
        const scraper = await getLinkedInScraper();
        const result = await scraper.scrape(companyUrl);
        await storeNormalizedResult(
          prisma,
          advertiser.id,
          result,
          "scheduled"
        );
        const next = new Date();
        const freq = advertiser.scrapeFrequency?.toLowerCase();
        if (freq === "weekly") next.setDate(next.getDate() + 7);
        else if (freq === "monthly") next.setDate(next.getDate() + 30);
        await prisma.advertiser.update({
          where: { id: advertiser.id },
          data: {
            lastScrapedAt: new Date(),
            ...(freq === "weekly" || freq === "monthly" ? { nextScrapeAt: next } : {}),
          },
        });
        await prisma.scrapeRun.create({
          data: {
            advertiserId: advertiser.id,
            status: "completed",
            jobType: "scheduled",
            adsFound: result.ads.length,
            completedAt: new Date(),
          },
        });
        results.push({ advertiserId: advertiser.id, started: true });
        continue;
      }

      const hasFollowers =
        advertiser.userAdvertisers != null &&
        advertiser.userAdvertisers.length > 0;
      const useDateRange =
        hasFollowers &&
        hasId &&
        advertiser.scrapeFrequency != null &&
        (advertiser.scrapeFrequency === "weekly" ||
          advertiser.scrapeFrequency === "monthly");

      const { runId, datasetId } = await startScrapeRun(
        useDateRange
          ? {
              startUrls: [
                buildAdLibrarySearchUrl(
                  advertiser.linkedinCompanyId!,
                  frequencyToWindow(
                    advertiser.scrapeFrequency as "weekly" | "monthly"
                  )
                ),
              ],
              resultsLimit: advertiser.resultsLimit ?? undefined,
            }
          : {
              ...(hasId && { linkedinCompanyId: advertiser.linkedinCompanyId! }),
              ...(hasUrl && { startUrls: [advertiser.linkedinUrl!] }),
              resultsLimit: advertiser.resultsLimit ?? undefined,
            }
      );

      await prisma.scrapeRun.create({
        data: {
          advertiserId: advertiser.id,
          status: "running",
          apifyRunId: runId,
          apifyDatasetId: datasetId,
          jobType: "scheduled",
        },
      });

      results.push({ advertiserId: advertiser.id, started: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Scrape-due start failed", advertiser.id, message);
      results.push({ advertiserId: advertiser.id, error: message });
    }
  }

  return NextResponse.json({
    ok: true,
    due: due.length,
    started: results.filter((r) => r.started).length,
    results,
  });
}
