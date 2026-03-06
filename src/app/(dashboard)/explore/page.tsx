import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { Prisma, prisma } from "@/lib/prisma";
import { syncAllRunningRuns } from "@/lib/services/sync-scrape-run";
import { ExploreFilters } from "./ExploreFilters";
import { ExploreSearchSort } from "./ExploreSearchSort";
import { ExploreAdCardWithModal } from "./ExploreAdCardWithModal";
import { ExploreScrapingBanner } from "./ExploreScrapingBanner";
import { ExploreFollowBanner } from "./ExploreFollowBanner";
import { ExploreFetchingAdsBanner } from "./ExploreFetchingAdsBanner";
import { FORMAT_LABELS, impressionsToNumber, getAdEstImpressions } from "./ad-card-utils";

const PAGE_SIZE = 50;
/** Load this many ads (minimal select) to compute totals, sidebar counts, and pagination. Correct totals up to this cap. */
const FILTER_POOL_SIZE = 20_000;

type SearchParams = {
  sort?: string;
  advertisers?: string;
  /** Single advertiser ID (used by Add modal redirect). Same as advertisers when one. */
  advertiser?: string;
  formats?: string;
  minImpressions?: string;
  minRuntime?: string;
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

  const sort = params.sort ?? "impressions";
  const advertiserIds =
    params.advertisers?.split(",").map((s) => s.trim()).filter(Boolean) ??
    (params.advertiser?.trim() ? [params.advertiser.trim()] : []);

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

  const RUNNING_SCRAPE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const hasRunningScrape =
    advertiserIds.length === 1
      ? (await prisma.scrapeRun.findFirst({
          where: {
            advertiserId: advertiserIds[0],
            status: "running",
            startedAt: { gte: new Date(Date.now() - RUNNING_SCRAPE_MAX_AGE_MS) },
          },
          select: { id: true },
        })) != null
      : false;

  const showFollowBanner =
    singleSelectedLink?.status === "added" &&
    singleSelectedLink.advertiser != null &&
    !!singleSelectedLink.advertiser.linkedinCompanyId?.trim();
  const formats = params.formats?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const minImpressions = params.minImpressions?.trim() ? parseInt(params.minImpressions, 10) : null;
  const minRuntime = params.minRuntime?.trim() ? parseInt(params.minRuntime, 10) : null;
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

  const whereConditions: Prisma.AdWhereInput[] = [...whereConditionsNoFormat];
  if (formats.length) whereConditions.push({ format: { in: formats } });
  // Thought leader: Apify sets thoughtLeaderMemberImageUrl; ScrapeCreators sets posterTitle only for thought leader ads
  if (hasThoughtLeaderColumn && promotedBy.length === 1) {
    if (promotedBy[0] === "thought_leader") {
      whereConditions.push({
        OR: [
          { thoughtLeaderMemberImageUrl: { not: null } },
          { posterTitle: { not: null } },
        ],
      });
    } else if (promotedBy[0] === "company_page") {
      whereConditions.push({
        thoughtLeaderMemberImageUrl: null,
        posterTitle: null,
      });
    }
  } else if (hasThoughtLeaderColumn && promotedBy.length === 2 && promotedBy.includes("thought_leader") && promotedBy.includes("company_page")) {
    // both selected = no filter
  } else if (hasThoughtLeaderColumn && promotedBy.length > 0) {
    if (promotedBy.includes("thought_leader") && !promotedBy.includes("company_page")) {
      whereConditions.push({
        OR: [
          { thoughtLeaderMemberImageUrl: { not: null } },
          { posterTitle: { not: null } },
        ],
      });
    } else if (promotedBy.includes("company_page") && !promotedBy.includes("thought_leader")) {
      whereConditions.push({
        thoughtLeaderMemberImageUrl: null,
        posterTitle: null,
      });
    }
  }

  const where: Prisma.AdWhereInput = whereConditions.length ? { AND: whereConditions } : {};

  type PoolRow = {
    id: string;
    startDate: Date | null;
    endDate: Date | null;
    lastSeenAt: Date | null;
    impressionsEstimate: number | null;
    impressions: string | null;
    countryImpressionsEstimate: unknown;
    format: string | null;
    thoughtLeaderMemberImageUrl?: string | null;
    poster?: string | null;
    posterTitle?: string | null;
    advertiserId: string;
    targetLanguage: string | null;
    callToAction: string | null;
    advertiser: { id: string; name: string | null; logoUrl: string | null };
  };

  const poolSelect = {
    id: true,
    startDate: true,
    endDate: true,
    lastSeenAt: true,
    impressionsEstimate: true,
    impressions: true,
    countryImpressionsEstimate: true,
    format: true,
    advertiserId: true,
    targetLanguage: true,
    callToAction: true,
    advertiser: { select: { id: true, name: true, logoUrl: true } },
    ...(hasThoughtLeaderColumn && { thoughtLeaderMemberImageUrl: true, poster: true, posterTitle: true }),
  } as const;

  const pool = await prisma.ad.findMany({
    where,
    select: poolSelect,
    take: FILTER_POOL_SIZE,
  }) as PoolRow[];

  const runtimeDays = (ad: { startDate: Date | null; endDate: Date | null; lastSeenAt: Date | null }): number => {
    const end = ad.endDate ?? ad.lastSeenAt;
    if (!ad.startDate || !end) return 0;
    return Math.round((end.getTime() - ad.startDate.getTime()) / (24 * 60 * 60 * 1000));
  };

  let filtered = pool;

  if (countries.length > 0) {
    filtered = filtered.filter((ad) => {
      const est = ad.countryImpressionsEstimate as Record<string, unknown> | null;
      if (!est || typeof est !== "object") return false;
      return countries.some((c) => c in est);
    });
  }

  if (minImpressions != null && !Number.isNaN(minImpressions)) {
    filtered = filtered.filter((ad) => {
      const est = getAdEstImpressions(ad, countries, impressionsToNumber);
      return est >= minImpressions;
    });
  }

  if (minRuntime != null && !Number.isNaN(minRuntime) && minRuntime >= 0) {
    filtered = filtered.filter((ad) => runtimeDays(ad) >= minRuntime);
  }

  if (sort === "impressions") {
    const countryForSort = countries[0] ?? null;
    filtered = [...filtered].sort((a, b) => {
      const estA = countryForSort
        ? (a.countryImpressionsEstimate as Record<string, number> | null)?.[countryForSort] ?? 0
        : (a.impressionsEstimate ?? impressionsToNumber(a.impressions));
      const estB = countryForSort
        ? (b.countryImpressionsEstimate as Record<string, number> | null)?.[countryForSort] ?? 0
        : (b.impressionsEstimate ?? impressionsToNumber(b.impressions));
      return estB - estA;
    });
  } else if (sort === "runtime") {
    filtered = [...filtered].sort((a, b) => {
      const daysA = runtimeDays(a);
      const daysB = runtimeDays(b);
      return daysB - daysA;
    });
  } else {
    filtered = [...filtered].sort((a, b) => {
      const aStart = a.startDate?.getTime() ?? 0;
      const bStart = b.startDate?.getTime() ?? 0;
      return bStart - aStart;
    });
  }

  const totalCount = filtered.length;
  const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageNum), maxPage);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageIds = filtered.slice(start, start + PAGE_SIZE).map((a) => a.id);

  type AdWithAdvertiser = Prisma.AdGetPayload<{ include: { advertiser: true } }> & {
    collectionAds?: { collectionId: string }[];
  };

  let paginatedAds: AdWithAdvertiser[];
  if (pageIds.length === 0) {
    paginatedAds = [];
  } else {
    const fullAds = await prisma.ad.findMany({
      where: { id: { in: pageIds } },
      include: {
        advertiser: true,
        ...(dbUser && {
          collectionAds: {
            where: { collection: { userId: dbUser.id } },
            select: { collectionId: true },
          },
        }),
      },
    });
    const orderByPageIds = new Map(pageIds.map((id, i) => [id, i]));
    paginatedAds = fullAds.slice().sort((a, b) => (orderByPageIds.get(a.id) ?? 0) - (orderByPageIds.get(b.id) ?? 0)) as AdWithAdvertiser[];
  }

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

  for (const ad of filtered) {
    if (ad.format) {
      formatCountMap[ad.format] = (formatCountMap[ad.format] ?? 0) + 1;
    }
    const isThoughtLeader =
      (ad.thoughtLeaderMemberImageUrl && ad.thoughtLeaderMemberImageUrl.trim()) ||
      (ad.posterTitle && ad.posterTitle.trim());
    if (isThoughtLeader) {
      promotedByThoughtLeader++;
    } else {
      promotedByCompanyPage++;
    }
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
      <Suspense fallback={<div className="w-64 shrink-0 border-r border-border bg-muted/20 animate-pulse rounded-r-lg" />}>
        <ExploreFilters options={filterOptions} />
      </Suspense>
      <main className="flex-1 min-w-0 px-6 py-8">
        <ExploreScrapingBanner />
        <Suspense fallback={null}>
          {showFollowBanner && singleSelectedLink && (
            <ExploreFollowBanner
              userAdvertiserId={singleSelectedLink.id}
              advertiserName={singleSelectedLink.advertiser.name ?? "—"}
            />
          )}
          {advertiserIds.length === 1 && singleSelectedLink && (
            <ExploreFetchingAdsBanner
              advertiserName={singleSelectedLink.advertiser.name ?? "this advertiser"}
              currentAdCount={totalCount}
              hasRunningScrape={hasRunningScrape}
            />
          )}
        </Suspense>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Explore Ads</h1>
            <p className="text-muted-foreground text-sm">
              {totalCount === 0
                ? "0 ads"
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount}`}
            </p>
          </div>
          <Suspense fallback={null}>
            <ExploreSearchSort sort={sort} hasCountryFilter={countries.length > 0} />
          </Suspense>
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
          <>
            {advertiserIds.length === 1 && totalCount === 0 ? (
              <p className="text-muted-foreground">
                Ads will appear here once the first scrape has finished. The page refreshes automatically.
              </p>
            ) : (
              <p className="text-muted-foreground">
                No ads match your filters yet. Try changing filters or add more advertisers.
              </p>
            )}
          </>
        ) : (
          <>
          {/* Wrapper caps content so 4 columns fit; ~400px per column with gap */}
          <div className="w-full mx-auto" style={{ maxWidth: 1636 }}>
          <ul className="explore-ads-list grid grid-cols-1 sm:grid-cols-4 gap-3 list-none p-0 m-0 w-full">
            {paginatedAds.map((ad) => {
              const advertiser = ad.advertiser;
              if (!advertiser) return null;
              const { startDate, endDate, lastSeenAt, ...adRest } = ad;
              const adForClient = {
                ...adRest,
                startDate: startDate?.toISOString() ?? null,
                endDate: endDate?.toISOString() ?? null,
                lastSeenAt: lastSeenAt?.toISOString() ?? null,
              };
              return (
                <li key={ad.id} className="explore-ad-card-item min-w-0">
                  <ExploreAdCardWithModal
                    adId={ad.id}
                    ad={adForClient}
                    advertiser={advertiser}
                    countries={countries}
                    isSaved={(ad.collectionAds?.length ?? 0) > 0}
                  />
                </li>
              );
            })}
          </ul>
          </div>

          {totalCount > PAGE_SIZE && (() => {
            const exploreUrl = (p: SearchParams, page: number): string => {
              const q = new URLSearchParams();
              if (p.advertisers) q.set("advertisers", p.advertisers); else if (p.advertiser) q.set("advertisers", p.advertiser);
              if (p.formats) q.set("formats", p.formats);
              if (p.minImpressions) q.set("minImpressions", p.minImpressions);
              if (p.minRuntime) q.set("minRuntime", p.minRuntime);
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
            };
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
