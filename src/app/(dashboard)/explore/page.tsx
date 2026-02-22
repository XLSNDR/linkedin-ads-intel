import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Prisma, prisma } from "@/lib/prisma";
import { syncAllRunningRuns } from "@/lib/services/sync-scrape-run";
import { ExploreFilters } from "./ExploreFilters";
import { ExploreSearchSort } from "./ExploreSearchSort";
import { AdCardSaveButton } from "./AdCardSaveButton";
import { ExploreAdCard } from "./ExploreAdCard";
import { ExploreScrapingBanner } from "./ExploreScrapingBanner";
import { ExploreFollowBanner } from "./ExploreFollowBanner";
import { FORMAT_LABELS, impressionsToNumber, getAdEstImpressions } from "./ad-card-utils";

const PAGE_SIZE = 50;
/** Max ads to load from DB per request. Lower = faster Explore load; use filters to narrow results. */
const EXPLORE_MAX_ADS = 1000;

type SearchParams = {
  sort?: string;
  advertisers?: string;
  formats?: string;
  minImpressions?: string;
  countries?: string;
  languages?: string;
  promotedBy?: string;
  startDate?: string;
  endDate?: string;
  ctas?: string;
  search?: string;
  searchMode?: string;
  page?: string;
};

/** Explore uses searchParams for filters; must be dynamic (no static pre-render at build). */
export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  try {
  const params = await searchParams;
  // Sync any running scrapes so new ads appear (does not rely on cron or client polling)
  try {
    await syncAllRunningRuns(prisma);
  } catch (syncErr) {
    console.warn("[Explore page] syncAllRunningRuns failed (non-fatal):", syncErr);
  }
  const { userId: clerkId } = await auth();
  const dbUser = clerkId
    ? await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    : null;
  const userAdvertisers = dbUser
    ? await prisma.userAdvertiser.findMany({
        where: { userId: dbUser.id },
        select: { advertiserId: true, status: true },
      })
    : [];
  const userAdvertiserStatusMap = new Map<string, "following" | "added">();
  for (const ua of userAdvertisers) {
    if (ua.status === "following" || ua.status === "added") {
      userAdvertiserStatusMap.set(ua.advertiserId, ua.status);
    }
  }

  const sort = params.sort ?? "date";
  const advertiserIds = params.advertisers?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  const singleSelectedLink =
    dbUser && advertiserIds.length === 1
      ? await prisma.userAdvertiser.findUnique({
          where: {
            userId_advertiserId: {
              userId: dbUser.id,
              advertiserId: advertiserIds[0],
            },
          },
          include: { advertiser: true },
        })
      : null;
  const showFollowBanner =
    singleSelectedLink?.status === "added" &&
    singleSelectedLink.advertiser != null;
  const formats = params.formats?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const minImpressions = params.minImpressions?.trim() ? parseInt(params.minImpressions, 10) : null;
  const countries = params.countries?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const languages = params.languages?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const promotedBy = params.promotedBy?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const startDateParam = params.startDate?.trim();
  const endDateParam = params.endDate?.trim();
  const ctas = params.ctas?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const search = params.search?.trim() ?? "";
  const searchMode = params.searchMode ?? "keyword";
  const pageParam = params.page?.trim();
  const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const whereConditionsNoFormat: Prisma.AdWhereInput[] = [];
  if (advertiserIds.length) whereConditionsNoFormat.push({ advertiserId: { in: advertiserIds } });
  if (languages.length) whereConditionsNoFormat.push({ targetLanguage: { in: languages } });
  if (startDateParam && endDateParam) {
    const rangeStart = new Date(startDateParam);
    const rangeEnd = new Date(endDateParam);
    const startValid = !Number.isNaN(rangeStart.getTime());
    const endValid = !Number.isNaN(rangeEnd.getTime());
    if (startValid && endValid) {
      const dateCondition = {
        startDate: { lte: rangeEnd },
        OR: [{ endDate: { gte: rangeStart } }, { endDate: null }],
      };
      whereConditionsNoFormat.push(dateCondition);
    }
  }
  if (ctas.length) {
    whereConditionsNoFormat.push({ callToAction: { in: ctas } });
  }
  if (search) {
    const searchCondition =
      searchMode === "url"
        ? { destinationUrl: { contains: search, mode: "insensitive" as const } }
        : {
            OR: [
              { bodyText: { contains: search, mode: "insensitive" as const } },
              { headline: { contains: search, mode: "insensitive" as const } },
            ],
          };
    whereConditionsNoFormat.push(searchCondition);
  }

  const whereNoFormat: Prisma.AdWhereInput =
    whereConditionsNoFormat.length ? { AND: whereConditionsNoFormat } : {};

  // Probe: does DB have thoughtLeaderMemberImageUrl? (avoids error on local when migration not applied)
  let hasThoughtLeaderColumn = false;
  type FormatOptionRow = { format: string | null; countryImpressionsEstimate: unknown; impressionsEstimate: number | null; impressions: string | null; thoughtLeaderMemberImageUrl?: string | null };
  let adsForFormatOptions: FormatOptionRow[];
  try {
    await prisma.ad.findMany({
      where: Object.keys(whereNoFormat).length > 0 ? whereNoFormat : undefined,
      select: { thoughtLeaderMemberImageUrl: true },
      take: 1,
    });
    hasThoughtLeaderColumn = true;
  } catch {
    hasThoughtLeaderColumn = false;
  }
  adsForFormatOptions = await prisma.ad.findMany({
    where: Object.keys(whereNoFormat).length > 0 ? whereNoFormat : undefined,
    select: hasThoughtLeaderColumn
      ? {
          format: true,
          countryImpressionsEstimate: true,
          impressionsEstimate: true,
          impressions: true,
          thoughtLeaderMemberImageUrl: true,
        }
      : {
          format: true,
          countryImpressionsEstimate: true,
          impressionsEstimate: true,
          impressions: true,
        },
    take: EXPLORE_MAX_ADS,
  });

  const whereConditions: Prisma.AdWhereInput[] = [...whereConditionsNoFormat];
  if (formats.length) whereConditions.push({ format: { in: formats } });
  if (hasThoughtLeaderColumn && promotedBy.length === 1) {
    if (promotedBy[0] === "thought_leader") {
      whereConditions.push({ thoughtLeaderMemberImageUrl: { not: null } });
    } else if (promotedBy[0] === "company_page") {
      whereConditions.push({ thoughtLeaderMemberImageUrl: null });
    }
  } else if (hasThoughtLeaderColumn && promotedBy.length === 2 && promotedBy.includes("thought_leader") && promotedBy.includes("company_page")) {
    // both selected = no filter
  } else if (hasThoughtLeaderColumn && promotedBy.length > 0) {
    if (promotedBy.includes("thought_leader") && !promotedBy.includes("company_page")) {
      whereConditions.push({ thoughtLeaderMemberImageUrl: { not: null } });
    } else if (promotedBy.includes("company_page") && !promotedBy.includes("thought_leader")) {
      whereConditions.push({ thoughtLeaderMemberImageUrl: null });
    }
  }

  const where: Prisma.AdWhereInput = whereConditions.length ? { AND: whereConditions } : {};

  const orderBy =
    sort === "runtime"
      ? { startDate: "asc" as const }
      : sort === "date"
        ? { startDate: "desc" as const }
        : { lastSeenAt: "desc" as const };

  let ads = await prisma.ad.findMany({
    where,
    include: {
      advertiser: true,
      ...(dbUser && {
        collectionAds: {
          where: { collection: { userId: dbUser.id } },
          select: { collectionId: true },
        },
      }),
    },
    orderBy,
    take: EXPLORE_MAX_ADS,
  });

  if (countries.length > 0) {
    ads = ads.filter((ad) => {
      const est = ad.countryImpressionsEstimate as Record<string, unknown> | null;
      if (!est || typeof est !== "object") return false;
      return countries.some((c) => c in est);
    });
    adsForFormatOptions = adsForFormatOptions.filter((ad) => {
      const est = ad.countryImpressionsEstimate as Record<string, unknown> | null;
      if (!est || typeof est !== "object") return false;
      return countries.some((c) => c in est);
    });
  }

  // Apply Min. Est. Impressions filter in-memory using the same logic as display/sort
  if (minImpressions != null && !Number.isNaN(minImpressions)) {
    ads = ads.filter((ad) => {
      const est = getAdEstImpressions(ad, countries, impressionsToNumber);
      return est >= minImpressions;
    });
    adsForFormatOptions = adsForFormatOptions.filter((ad) => {
      const est = getAdEstImpressions(ad, countries, impressionsToNumber);
      return est >= minImpressions;
    });
  }

  if (sort === "impressions") {
    const countryForSort = countries[0] ?? null;
    ads = [...ads].sort((a, b) => {
      const estA = countryForSort
        ? (a.countryImpressionsEstimate as Record<string, number> | null)?.[countryForSort] ?? 0
        : (a.impressionsEstimate ?? impressionsToNumber(a.impressions));
      const estB = countryForSort
        ? (b.countryImpressionsEstimate as Record<string, number> | null)?.[countryForSort] ?? 0
        : (b.impressionsEstimate ?? impressionsToNumber(b.impressions));
      return estB - estA;
    });
  }
  if (sort === "runtime") {
    ads = [...ads].sort((a, b) => {
      const endA = a.endDate ?? a.lastSeenAt;
      const endB = b.endDate ?? b.lastSeenAt;
      const daysA =
        a.startDate && endA
          ? Math.round(
              (endA.getTime() - a.startDate.getTime()) / (24 * 60 * 60 * 1000)
            )
          : 0;
      const daysB =
        b.startDate && endB
          ? Math.round(
              (endB.getTime() - b.startDate.getTime()) / (24 * 60 * 60 * 1000)
            )
          : 0;
      return daysB - daysA;
    });
  }

  const totalCount = ads.length;
  const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageNum), maxPage);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginatedAds = ads.slice(start, start + PAGE_SIZE);

  // Filter options for sidebar – advertisers/countries/languages/ctas from filtered ads; formats from ads without format filter (so multi-select shows all formats)
  const advertiserMap = new Map<
    string,
    { id: string; name: string; logoUrl: string | null; status?: "following" | "added" }
  >();
  const formatCountMap: Record<string, number> = {};
  const countrySet = new Set<string>();
  const languageSet = new Set<string>();
  const ctaSet = new Set<string>();
  let promotedByThoughtLeader = 0;
  let promotedByCompanyPage = 0;

  for (const ad of adsForFormatOptions) {
    if (ad.format) {
      formatCountMap[ad.format] = (formatCountMap[ad.format] ?? 0) + 1;
    }
  }

  for (const ad of ads) {
    if (ad.advertiser) {
      if (!advertiserMap.has(ad.advertiser.id)) {
        const status = userAdvertiserStatusMap.get(ad.advertiser.id);
        advertiserMap.set(ad.advertiser.id, {
          id: ad.advertiser.id,
          name: ad.advertiser.name ?? "—",
          logoUrl: ad.advertiser.logoUrl,
          ...(status && { status }),
        });
      }
    }
    const countryObj = ad.countryImpressionsEstimate as Record<string, unknown> | null;
    if (countryObj && typeof countryObj === "object") {
      for (const key of Object.keys(countryObj)) {
        countrySet.add(key);
      }
    }
    if (ad.targetLanguage) languageSet.add(ad.targetLanguage);
    if (ad.callToAction) ctaSet.add(ad.callToAction);
  }
  for (const ad of adsForFormatOptions) {
    if (ad.thoughtLeaderMemberImageUrl && ad.thoughtLeaderMemberImageUrl.trim()) {
      promotedByThoughtLeader++;
    } else {
      promotedByCompanyPage++;
    }
  }

  const advertisersWithAds = Array.from(advertiserMap.values()).sort((a, b) => {
    const an = (a.name ?? "").toLocaleLowerCase();
    const bn = (b.name ?? "").toLocaleLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
  const formatCounts = Object.entries(formatCountMap).map(([format, count]) => ({ format, count }));
  const countriesList = Array.from(countrySet).sort();
  const languagesList = Array.from(languageSet);
  const ctasList = Array.from(ctaSet);

  const filterOptions = {
    advertisers: advertisersWithAds,
    formats: formatCounts,
    formatLabels: FORMAT_LABELS,
    countries: countriesList,
    languages: languagesList,
    promotedByCounts: { thought_leader: promotedByThoughtLeader, company_page: promotedByCompanyPage },
    ctas: ctasList,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)] flex">
      <ExploreFilters options={filterOptions} />
      <main className="flex-1 min-w-0 px-6 py-8">
        <ExploreScrapingBanner />
        {showFollowBanner && singleSelectedLink && (
          <ExploreFollowBanner
            userAdvertiserId={singleSelectedLink.id}
            advertiserName={singleSelectedLink.advertiser.name ?? "—"}
          />
        )}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Explore Ads</h1>
            <p className="text-muted-foreground text-sm">
              {totalCount === 0
                ? "0 ads"
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount}`}
            </p>
          </div>
          <ExploreSearchSort sort={sort} hasCountryFilter={countries.length > 0} />
        </div>

        {userAdvertisers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t added any advertisers yet. Add a LinkedIn company to explore their ads.
            </p>
            <Link
              href="/advertisers"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add your first advertiser
            </Link>
          </div>
        ) : paginatedAds.length === 0 ? (
          <p className="text-muted-foreground">
            No ads match your filters yet. Try changing filters or add more advertisers.
          </p>
        ) : (
          <>
          {/* Wrapper caps content so 4 columns fit; ~400px per column with gap */}
          <div className="w-full mx-auto" style={{ maxWidth: 1636 }}>
          <ul className="explore-ads-list grid grid-cols-1 sm:grid-cols-4 gap-3 list-none p-0 m-0 w-full">
            {paginatedAds.map((ad) => {
              const advertiser = ad.advertiser;
              if (!advertiser) return null;
              return (
                <li key={ad.id} className="explore-ad-card-item min-w-0">
                  <ExploreAdCard
                    ad={ad}
                    advertiser={advertiser}
                    countries={countries}
                    impressionsToNumber={impressionsToNumber}
                    actionsSlot={
                      <AdCardSaveButton
                        adId={ad.id}
                        isSaved={(ad.collectionAds?.length ?? 0) > 0}
                      />
                    }
                  />
                </li>
              );
            })}
          </ul>
          </div>

          {totalCount > PAGE_SIZE && (() => {
            function exploreUrl(p: SearchParams, page: number): string {
              const q = new URLSearchParams();
              if (p.advertisers) q.set("advertisers", p.advertisers);
              if (p.formats) q.set("formats", p.formats);
              if (p.minImpressions) q.set("minImpressions", p.minImpressions);
              if (p.countries) q.set("countries", p.countries);
              if (p.languages) q.set("languages", p.languages);
              if (p.promotedBy) q.set("promotedBy", p.promotedBy);
              if (p.startDate) q.set("startDate", p.startDate);
              if (p.endDate) q.set("endDate", p.endDate);
              if (p.ctas) q.set("ctas", p.ctas);
              if (p.search) q.set("search", p.search);
              if (p.searchMode) q.set("searchMode", p.searchMode);
              if (p.sort) q.set("sort", p.sort);
              if (page > 1) q.set("page", String(page));
              const s = q.toString();
              return s ? `/explore?${s}` : "/explore";
            }
            const prevUrl = currentPage > 1 ? exploreUrl(params, currentPage - 1) : null;
            const nextUrl = currentPage < maxPage ? exploreUrl(params, currentPage + 1) : null;
            const pages: number[] = [];
            let lo = Math.max(1, currentPage - 2);
            let hi = Math.min(maxPage, currentPage + 2);
            if (hi - lo < 4) {
              if (lo === 1) hi = Math.min(maxPage, 5);
              else hi = maxPage; lo = Math.max(1, hi - 4);
            }
            for (let i = lo; i <= hi; i++) pages.push(i);
            return (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
                {prevUrl ? (
                  <Link href={prevUrl} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted/80">
                    Previous
                  </Link>
                ) : (
                  <span className="rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                    Previous
                  </span>
                )}
                {lo > 1 && (
                  <>
                    <Link href={exploreUrl(params, 1)} className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm hover:bg-muted/80">1</Link>
                    {lo > 2 && <span className="px-1 text-muted-foreground">…</span>}
                  </>
                )}
                {pages.map((p) => (
                  p === currentPage ? (
                    <span key={p} className="rounded-md border border-primary bg-primary/10 px-2.5 py-1.5 text-sm font-medium" aria-current="page">{p}</span>
                  ) : (
                    <Link key={p} href={exploreUrl(params, p)} className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm hover:bg-muted/80">{p}</Link>
                  )
                ))}
                {hi < maxPage && (
                  <>
                    {hi < maxPage - 1 && <span className="px-1 text-muted-foreground">…</span>}
                    <Link href={exploreUrl(params, maxPage)} className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm hover:bg-muted/80">{maxPage}</Link>
                  </>
                )}
                {nextUrl ? (
                  <Link href={nextUrl} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted/80">
                    Next
                  </Link>
                ) : (
                  <span className="rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                    Next
                  </span>
                )}
              </nav>
            );
          })()}
          </>
        )}
      </main>
    </div>
  );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[Explore page error]", message, stack ?? err);
    throw err;
  }
}
