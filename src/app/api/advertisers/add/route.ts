import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAddAdvertiser } from "@/lib/services/plan-limits";
import { checkMonthlyBudget } from "@/lib/services/ad-storage";
import { startScrapeRun } from "@/lib/apify/client";
import {
  normalizeLinkedInCompanyUrl,
  getCompanyPathSegment,
} from "@/lib/utils/linkedin-url";

export const dynamic = "force-dynamic";

const FRESH_HOURS = 24;

/** POST: Add advertiser (one-time scrape or link if fresh). */
export async function POST(req: Request) {
  let body: { linkedinUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const linkedinUrl = body.linkedinUrl?.trim();
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

  const existingAdvertiser = await prisma.advertiser.findFirst({
    where: {
      OR: [
        { linkedinUrl: normalized },
        ...(isNumericId && pathSegment
          ? [{ linkedinCompanyId: pathSegment }]
          : []),
      ],
    },
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
      return NextResponse.json(
        {
          error: "You've already added this advertiser",
          code: "ALREADY_ADDED",
          advertiserId: existingAdvertiser.id,
        },
        { status: 409 }
      );
    }

    const hoursSince =
      existingAdvertiser.lastScrapedAt != null
        ? (Date.now() - existingAdvertiser.lastScrapedAt.getTime()) /
          (1000 * 60 * 60)
        : Infinity;
    if (hoursSince < FRESH_HOURS) {
      const userAdvertiser = await prisma.userAdvertiser.create({
        data: {
          userId: user.id,
          advertiserId: existingAdvertiser.id,
          status: "added",
        },
        include: { advertiser: true },
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
        scrapeStatus: "skipped",
      });
    }
  }

  let advertiser = existingAdvertiser;
  if (!advertiser) {
    const slugOrId = pathSegment ?? "unknown";
    advertiser = await prisma.advertiser.create({
      data: {
        name: slugOrId.charAt(0).toUpperCase() + slugOrId.slice(1).replace(/-/g, " "),
        linkedinUrl: normalized,
        linkedinCompanyId: isNumericId ? pathSegment : null,
        status: "approved",
      },
    });
  }

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
    const { runId, datasetId } = await startScrapeRun({
      startUrls: [normalized],
      resultsLimit: advertiser.resultsLimit ?? undefined,
    });

    await prisma.scrapeRun.create({
      data: {
        advertiserId: advertiser.id,
        status: "running",
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
