import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAddAdvertiser } from "@/lib/services/plan-limits";
import { checkMonthlyBudget, storeNormalizedResult } from "@/lib/services/ad-storage";
import { startScrapeRun } from "@/lib/apify/client";
import { getLinkedInScraper } from "@/lib/scrapers";
import {
  normalizeLinkedInCompanyUrl,
  getCompanyPathSegment,
  normalizedUrlWithoutTrailingSlash,
} from "@/lib/utils/linkedin-url";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s: string | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  const t = s.trim();
  if (!YYYY_MM_DD.test(t)) return false;
  return !Number.isNaN(new Date(t).getTime());
}

export const dynamic = "force-dynamic";

/** POST: Add advertiser (new = one-time scrape; existing = link only, no scrape). */
export async function POST(req: Request) {
  let body: { linkedinUrl?: string; startDate?: string; endDate?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const linkedinUrl = body.linkedinUrl?.trim();
  const startDate = body.startDate?.trim();
  const endDate = body.endDate?.trim();
  const scrapeOptions =
    isValidDate(startDate) || isValidDate(endDate)
      ? { startDate: isValidDate(startDate) ? startDate : undefined, endDate: isValidDate(endDate) ? endDate : undefined }
      : undefined;
  if (!linkedinUrl) {
    return NextResponse.json(
      { error: "linkedinUrl is required", code: "MISSING_URL" },
      { status: 400 }
    );
  }

  const normalized = normalizeLinkedInCompanyUrl(linkedinUrl);
  if (!normalized) {
    return NextResponse.json(
      {
        error:
          "Please enter a LinkedIn company page URL (e.g., linkedin.com/company/hubspot)",
        code: "INVALID_URL",
      },
      { status: 400 }
    );
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addCheck = await canAddAdvertiser(prisma, user.id);
  if (!addCheck.allowed) {
    return NextResponse.json(
      {
        error: "Advertiser limit reached",
        code: "LIMIT_REACHED",
        current: addCheck.current,
        max: addCheck.max,
      },
      { status: 403 }
    );
  }

  const pathSegment = getCompanyPathSegment(normalized);
  const isNumericId = pathSegment != null && /^\d+$/.test(pathSegment);
  const normalizedNoSlash = normalizedUrlWithoutTrailingSlash(normalized);

  const orConditions: Array<{ linkedinUrl?: string; linkedinCompanyId?: string; name?: { equals: string; mode: "insensitive" } }> = [
    { linkedinUrl: normalized },
    { linkedinUrl: normalizedNoSlash },
  ];
  if (isNumericId && pathSegment) orConditions.push({ linkedinCompanyId: pathSegment });
  if (pathSegment && !isNumericId) orConditions.push({ name: { equals: pathSegment, mode: "insensitive" } });

  const existingAdvertiser = await prisma.advertiser.findFirst({
    where: { OR: orConditions },
    orderBy: { totalAdsFound: "desc" },
  });

  if (existingAdvertiser) {
    const existingLink = await prisma.userAdvertiser.findUnique({
      where: {
        userId_advertiserId: {
          userId: user.id,
          advertiserId: existingAdvertiser.id,
        },
      },
    });
    if (existingLink) {
      // Already in list: treat as success so modal closes and user is redirected to the advertiser
      return NextResponse.json({
        advertiser: {
          id: existingAdvertiser.id,
          name: existingAdvertiser.name,
          logoUrl: existingAdvertiser.logoUrl,
          totalAdsFound: existingAdvertiser.totalAdsFound,
        },
        userAdvertiser: {
          id: existingLink.id,
          status: existingLink.status,
        },
        scrapeStatus: "already_added",
      });
    }

    const userAdvertiser = await prisma.userAdvertiser.create({
      data: {
        userId: user.id,
        advertiserId: existingAdvertiser.id,
        status: "added",
      },
      include: { advertiser: true },
    });

    // If existing advertiser has no ads or no company ID, start a scrape so user gets data (and we can set linkedinCompanyId from ad data)
    const needsScrape =
      (existingAdvertiser.totalAdsFound ?? 0) === 0 ||
      !existingAdvertiser.linkedinCompanyId?.trim();
    const scrapeUrl =
      existingAdvertiser.linkedinUrl?.trim() || normalized;

    if (needsScrape && scrapeUrl) {
      const budgetCheck = await checkMonthlyBudget(prisma);
      if (budgetCheck.ok) {
        try {
          const settings = await prisma.settings.findFirst();
          const useScrapeCreators = settings?.linkedinScraper === "scrapecreators";

          if (useScrapeCreators) {
            const scraper = await getLinkedInScraper();
            const result = await scraper.scrape(scrapeUrl, scrapeOptions);
            const storeResult = await storeNormalizedResult(
              prisma,
              existingAdvertiser.id,
              result,
              "initial"
            );
            await prisma.scrapeRun.create({
              data: {
                advertiserId: existingAdvertiser.id,
                status: "completed",
                jobType: "initial",
                adsFound: result.ads.length,
                adsNew: storeResult.adsNew,
                adsUpdated: storeResult.adsUpdated,
                completedAt: new Date(),
              },
            });
            return NextResponse.json({
              advertiser: {
                id: existingAdvertiser.id,
                name: existingAdvertiser.name,
                logoUrl: existingAdvertiser.logoUrl,
                totalAdsFound: result.ads.length,
              },
              userAdvertiser: {
                id: userAdvertiser.id,
                status: userAdvertiser.status,
              },
              scrapeStatus: "started",
            });
          }

          const { runId, datasetId } = await startScrapeRun({
            startUrls: [scrapeUrl],
            resultsLimit: existingAdvertiser.resultsLimit ?? undefined,
          });
          await prisma.scrapeRun.create({
            data: {
              advertiserId: existingAdvertiser.id,
              status: "running",
              jobType: "initial",
              apifyRunId: runId,
              apifyDatasetId: datasetId,
            },
          });
          return NextResponse.json({
            advertiser: {
              id: existingAdvertiser.id,
              name: existingAdvertiser.name,
              logoUrl: existingAdvertiser.logoUrl,
              totalAdsFound: existingAdvertiser.totalAdsFound,
            },
            userAdvertiser: {
              id: userAdvertiser.id,
              status: userAdvertiser.status,
            },
            scrapeStatus: "started",
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            "Add advertiser (existing) scrape start failed",
            existingAdvertiser.id,
            message
          );
          // Still return success with link; scrape can be retried via Follow or manual refresh
          return NextResponse.json({
            advertiser: {
              id: existingAdvertiser.id,
              name: existingAdvertiser.name,
              logoUrl: existingAdvertiser.logoUrl,
              totalAdsFound: existingAdvertiser.totalAdsFound,
            },
            userAdvertiser: {
              id: userAdvertiser.id,
              status: userAdvertiser.status,
            },
            scrapeStatus: "failed",
            error: message,
          });
        }
      }
    }

    return NextResponse.json({
      advertiser: {
        id: existingAdvertiser.id,
        name: existingAdvertiser.name,
        logoUrl: existingAdvertiser.logoUrl,
        totalAdsFound: existingAdvertiser.totalAdsFound,
      },
      userAdvertiser: {
        id: userAdvertiser.id,
        status: userAdvertiser.status,
      },
      scrapeStatus: "skipped",
    });
  }

  const slugOrId = pathSegment ?? "unknown";
  const advertiser = await prisma.advertiser.create({
    data: {
      name: slugOrId.charAt(0).toUpperCase() + slugOrId.slice(1).replace(/-/g, " "),
      linkedinUrl: normalized,
      linkedinCompanyId: isNumericId ? pathSegment : null,
      status: "approved",
    },
  });

  const userAdvertiser = await prisma.userAdvertiser.create({
    data: {
      userId: user.id,
      advertiserId: advertiser.id,
      status: "added",
    },
    include: { advertiser: true },
  });

  const budgetCheck = await checkMonthlyBudget(prisma);
  if (!budgetCheck.ok) {
    return NextResponse.json(
      {
        error: "Monthly spend limit exceeded",
        code: "BUDGET_EXCEEDED",
        details: `Current spend: $${budgetCheck.currentSpend.toFixed(2)}. Limit: $${budgetCheck.limit}.`,
      },
      { status: 429 }
    );
  }

  try {
    const settings = await prisma.settings.findFirst();
    const useScrapeCreators = settings?.linkedinScraper === "scrapecreators";

    if (useScrapeCreators) {
      const scraper = await getLinkedInScraper();
      const result = await scraper.scrape(normalized, scrapeOptions);
      const storeResult = await storeNormalizedResult(
        prisma,
        advertiser.id,
        result,
        "initial"
      );
      await prisma.scrapeRun.create({
        data: {
          advertiserId: advertiser.id,
          status: "completed",
          jobType: "initial",
          adsFound: result.ads.length,
          adsNew: storeResult.adsNew,
          adsUpdated: storeResult.adsUpdated,
          completedAt: new Date(),
        },
      });
      return NextResponse.json({
        advertiser: {
          id: advertiser.id,
          name: advertiser.name,
          logoUrl: advertiser.logoUrl,
          totalAdsFound: advertiser.totalAdsFound,
        },
        userAdvertiser: {
          id: userAdvertiser.id,
          status: userAdvertiser.status,
        },
        scrapeStatus: "started",
      });
    }

    const { runId, datasetId } = await startScrapeRun({
      startUrls: [normalized],
      resultsLimit: advertiser.resultsLimit ?? undefined,
    });

    await prisma.scrapeRun.create({
      data: {
        advertiserId: advertiser.id,
        status: "running",
        jobType: "initial",
        apifyRunId: runId,
        apifyDatasetId: datasetId,
      },
    });

    return NextResponse.json({
      advertiser: {
        id: advertiser.id,
        name: advertiser.name,
        logoUrl: advertiser.logoUrl,
        totalAdsFound: advertiser.totalAdsFound,
      },
      userAdvertiser: {
        id: userAdvertiser.id,
        status: userAdvertiser.status,
      },
      scrapeStatus: "started",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Add advertiser scrape start failed", advertiser.id, message);
    return NextResponse.json(
      {
        error: "Something went wrong while scraping. Please try again.",
        code: "SCRAPE_FAILED",
        details: message,
      },
      { status: 500 }
    );
  }
}
