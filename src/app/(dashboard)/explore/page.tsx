import Link from "next/link";
import { Prisma, prisma } from "@/lib/prisma";
import { ExploreFilters } from "./ExploreFilters";
import { ExploreSearchSort } from "./ExploreSearchSort";
import { AdCardSaveButton } from "./AdCardSaveButton";
import { AdCardBodyText } from "./AdCardBodyText";
import { DocumentAdPreview } from "./DocumentAdPreview";
import { SpotlightAdPreview } from "./SpotlightAdPreview";
import { ExploreScrapingBanner } from "./ExploreScrapingBanner";
import { getCountryFlag, parseCountryData } from "@/lib/country-flags";

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_IMAGE: "Single Image",
  CAROUSEL: "Carousel",
  VIDEO: "Video",
  MESSAGE: "Message",
  TEXT: "Text",
  DOCUMENT: "Document",
  EVENT: "Event",
  SPOTLIGHT: "Spotlight",
  FOLLOW_COMPANY: "Follow Company",
  single_image: "Single Image",
  video: "Video",
  carousel: "Carousel",
  document: "Document",
  event: "Event",
  conversation: "Conversation",
  text: "Text",
  spotlight: "Spotlight",
  thought_leader_image: "Thought Leader (image)",
  thought_leader_video: "Thought Leader (video)",
  thought_leader_text: "Thought Leader (text)",
  other: "Other",
};

function formatAdLaunchDate(date: Date | null | undefined): string {
  if (!date || typeof date.getTime !== "function" || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format a number as Est. Impressions with dot thousands separator (e.g. 25000 → "25.000"). */
function formatEstImpressions(n: number): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

/** Get estimated impressions for an ad.
 * - When specific countries are selected, ONLY use their values from countryImpressionsEstimate.
 *   If none of the selected countries have data, treat the estimate as 0 (no fallback to global).
 * - When no countries are selected, use impressionsEstimate or fall back to parsing impressions.
 */
function getAdEstImpressions(
  ad: { countryImpressionsEstimate: unknown; impressionsEstimate: number | null; impressions: string | null },
  selectedCountries: string[],
  impressionsToNumberFn: (s: string | null) => number
): number {
  if (selectedCountries.length > 0) {
    const byCountry = ad.countryImpressionsEstimate as Record<string, number> | null;
    if (byCountry && typeof byCountry === "object") {
      let sum = 0;
      for (const c of selectedCountries) {
        const v = byCountry[c];
        if (typeof v === "number") sum += v;
      }
      if (sum > 0) return sum;
    }
  }
  // No country selected, or no data for selected countries: fall back to global estimate
  if (selectedCountries.length === 0) {
    return ad.impressionsEstimate ?? impressionsToNumberFn(ad.impressions);
  }
  // Countries selected but no per-country data → treat as 0 so it won't pass Min. Est. Impressions
  return 0;
}

/** Parse impression string (e.g. "100k-150k", "1k-5k") to midpoint number for sorting. */
function impressionsToNumber(impressions: string | null): number {
  if (!impressions || !impressions.trim()) return 0;
  const lower = impressions.toLowerCase().replace(/\s/g, "");
  const rangeMatch = lower.match(/(\d+)(k|m)?\s*[-–]\s*(\d+)(k|m)?/);
  if (rangeMatch) {
    const mul = (s: string | undefined) => (s === "m" ? 1_000_000 : s === "k" ? 1000 : 1);
    const a = parseInt(rangeMatch[1], 10) * mul(rangeMatch[2]);
    const b = parseInt(rangeMatch[3], 10) * mul(rangeMatch[4]);
    return Math.round((a + b) / 2);
  }
  const single = lower.match(/(\d+)(k|m)?/);
  if (single) {
    const n = parseInt(single[1], 10);
    return single[2] === "m" ? n * 1_000_000 : single[2] === "k" ? n * 1000 : n;
  }
  return 0;
}

const PAGE_SIZE = 50;

type SearchParams = {
  sort?: string;
  advertisers?: string;
  formats?: string;
  minImpressions?: string;
  countries?: string;
  languages?: string;
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
  const sort = params.sort ?? "date";
  const advertiserIds = params.advertisers?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const formats = params.formats?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const minImpressions = params.minImpressions?.trim() ? parseInt(params.minImpressions, 10) : null;
  const countries = params.countries?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const languages = params.languages?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const startDateParam = params.startDate?.trim();
  const endDateParam = params.endDate?.trim();
  const ctas = params.ctas?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const search = params.search?.trim() ?? "";
  const searchMode = params.searchMode ?? "keyword";
  const pageParam = params.page?.trim();
  const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const whereConditions: Prisma.AdWhereInput[] = [];

  if (advertiserIds.length) whereConditions.push({ advertiserId: { in: advertiserIds } });
  if (formats.length) whereConditions.push({ format: { in: formats } });
  // Country filter applied in memory below (Prisma JSON path filter can fail in serverless/Postgres)
  if (languages.length) whereConditions.push({ targetLanguage: { in: languages } });
  if (startDateParam && endDateParam) {
    const rangeStart = new Date(startDateParam);
    const rangeEnd = new Date(endDateParam);
    const startValid = !Number.isNaN(rangeStart.getTime());
    const endValid = !Number.isNaN(rangeEnd.getTime());
    if (startValid && endValid) {
      whereConditions.push({
        startDate: { lte: rangeEnd },
        OR: [{ endDate: { gte: rangeStart } }, { endDate: null }],
      });
    }
  }
  if (ctas.length) whereConditions.push({ callToAction: { in: ctas } });
  if (search) {
    if (searchMode === "url") {
      whereConditions.push({ destinationUrl: { contains: search, mode: "insensitive" } });
    } else {
      whereConditions.push({
        OR: [
          { bodyText: { contains: search, mode: "insensitive" } },
          { headline: { contains: search, mode: "insensitive" } },
        ],
      });
    }
  }

  const where: Prisma.AdWhereInput = whereConditions.length ? { AND: whereConditions } : {};

  const orderBy =
    sort === "runtime"
      ? { startDate: "asc" as const }
      : { lastSeenAt: "desc" as const };

  let ads = await prisma.ad.findMany({
    where,
    include: { advertiser: true },
    orderBy,
    take: 500,
  });

  if (countries.length > 0) {
    ads = ads.filter((ad) => {
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
      const daysA = a.startDate && a.endDate
        ? Math.round((a.endDate.getTime() - a.startDate.getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      const daysB = b.startDate && b.endDate
        ? Math.round((b.endDate.getTime() - b.startDate.getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      return daysB - daysA;
    });
  }

  const totalCount = ads.length;
  const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, pageNum), maxPage);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginatedAds = ads.slice(start, start + PAGE_SIZE);

  // Filter options for sidebar – derive from the ads we already fetched
  const advertiserMap = new Map<string, { id: string; name: string; logoUrl: string | null }>();
  const formatCountMap: Record<string, number> = {};
  const countrySet = new Set<string>();
  const languageSet = new Set<string>();
  const ctaSet = new Set<string>();

  for (const ad of ads) {
    // Advertisers (unique by id, sorted by name later)
    if (ad.advertiser) {
      if (!advertiserMap.has(ad.advertiser.id)) {
        advertiserMap.set(ad.advertiser.id, {
          id: ad.advertiser.id,
          name: ad.advertiser.name ?? "—",
          logoUrl: ad.advertiser.logoUrl,
        });
      }
    }

    // Formats with counts
    if (ad.format) {
      formatCountMap[ad.format] = (formatCountMap[ad.format] ?? 0) + 1;
    }

    // Countries from countryImpressionsEstimate
    const countryObj = ad.countryImpressionsEstimate as Record<string, unknown> | null;
    if (countryObj && typeof countryObj === "object") {
      for (const key of Object.keys(countryObj)) {
        countrySet.add(key);
      }
    }

    // Languages
    if (ad.targetLanguage) languageSet.add(ad.targetLanguage);

    // CTAs
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
    ctas: ctasList,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)] flex">
      <ExploreFilters options={filterOptions} />
      <main className="flex-1 min-w-0 px-6 py-8">
        <ExploreScrapingBanner />
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

        {paginatedAds.length === 0 ? (
          <p className="text-muted-foreground">
            No ads yet. Add advertisers via the test scraper or Advertisers page
            to see ads here.
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
                <article className="w-full rounded-lg border border-border bg-card overflow-hidden shadow-sm flex flex-col">
                  {/* 1. Header: logo + company + Promoted | Status + Save */}
                  <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative h-6 w-6 shrink-0 rounded overflow-hidden bg-muted">
                        {advertiser.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={advertiser.logoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                            {advertiser.name?.charAt(0) ?? "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-bold leading-5 truncate">
                          {advertiser.name ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground leading-[15px]">
                          Promoted
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AdCardSaveButton adId={ad.id} />
                    </div>
                  </div>

                  {/* 2. Intro text (above the creative) – skip for spotlight (intro is inside SpotlightAdPreview) */}
                  {ad.format?.toLowerCase() !== "spotlight" && (
                    <div className="px-3 py-1.5">
                      <AdCardBodyText text={ad.bodyText || ad.headline || "—"} />
                    </div>
                  )}

                  {/* 3. Main creative (spotlight / document / image / video) */}
                  <div className="border-t border-border mt-0">
                    {ad.format?.toLowerCase() === "spotlight" ? (
                      <SpotlightAdPreview
                        bodyText={ad.bodyText}
                        headline={ad.headline}
                        callToAction={ad.callToAction}
                        destinationUrl={ad.destinationUrl}
                        profileImageUrl={ad.mediaUrl}
                        companyLogoUrl={advertiser.logoUrl}
                        companyName={advertiser.name}
                        adLibraryUrl={ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`}
                      />
                    ) : ad.format?.toLowerCase() === "document" ? (
                      <div className="flex flex-col">
                        <DocumentAdPreview
                          mediaData={ad.mediaData}
                          mediaUrl={ad.mediaUrl}
                        />
                      </div>
                    ) : ad.mediaUrl ? (
                      ad.destinationUrl ? (
                        <a
                          href={ad.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col hover:no-underline focus:no-underline"
                        >
                          <div className="relative w-full min-h-[120px] bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ad.mediaUrl}
                              alt=""
                              className="w-full object-cover min-h-[120px]"
                            />
                          </div>
                        </a>
                      ) : (
                        <div className="relative w-full min-h-[120px] bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ad.mediaUrl}
                            alt=""
                            className="w-full object-cover min-h-[120px]"
                          />
                        </div>
                      )
                    ) : null}

                    {/* 4. Headline bar – skip for spotlight (headline + CTA are inside SpotlightAdPreview) */}
                    {ad.format?.toLowerCase() !== "spotlight" && (ad.headline || ad.callToAction) && (
                      <div className="border-t border-border bg-muted/30 p-1.5 flex justify-between gap-2 items-start">
                        {ad.headline ? (
                          <header className="grow min-w-[40%] break-words">
                            <h2 className="text-[11px] font-semibold leading-[15px] text-foreground break-words">
                              {ad.headline}
                            </h2>
                          </header>
                        ) : (
                          <span className="grow min-w-[40%]" />
                        )}
                        {ad.callToAction && (
                          <a
                            href={ad.destinationUrl ?? ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 self-center rounded-md bg-transparent border border-black px-3 py-1.5 text-sm font-medium text-black hover:bg-black/5 no-underline break-words max-w-[150px]"
                          >
                            {ad.callToAction}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Runtime (line 1) + Start & Last Seen (line 2) */}
                  <div className="border-t border-border px-3 py-2 flex flex-col gap-1 text-xs text-muted-foreground">
                    {(() => {
                      const runtimeDays = ad.startDate && ad.endDate
                        ? Math.round((ad.endDate.getTime() - ad.startDate.getTime()) / (24 * 60 * 60 * 1000))
                        : 0;
                      return runtimeDays > 0 ? (
                        <span className="flex items-center gap-1.5 font-bold text-foreground" title="Runtime">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Runtime: {runtimeDays} Days
                        </span>
                      ) : null;
                    })()}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1.5" title="Start date">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Start: {ad.startDate ? formatAdLaunchDate(ad.startDate) : "—"}
                      </span>
                      <span className="flex items-center gap-1.5" title="Last seen">
                        Last Seen: {ad.lastSeenAt ? formatAdLaunchDate(ad.lastSeenAt) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* 6. Est. Impressions (based on selected countries) */}
                  <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {(() => {
                      const est = getAdEstImpressions(ad, countries, impressionsToNumber);
                      return est > 0 ? (
                        <span title="Est. Impressions">
                          <span className="font-medium text-foreground">
                            {formatEstImpressions(est)}
                          </span>{" "}
                          <span className="font-medium text-foreground">Est. Impressions</span>
                        </span>
                      ) : null;
                    })()}
                    {ad.targetLanguage && (
                      <span title="Language">{ad.targetLanguage}</span>
                    )}
                  </div>

                  {/* 7. Format badge + country flags (AdsMom-style bottom row) */}
                  <div className="border-t border-border px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground" title="Ad format">
                      {FORMAT_LABELS[ad.format] ?? ad.format.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1" title="Top countries by impressions">
                      {parseCountryData(ad.impressionsPerCountry)
                        .slice(0, 2)
                        .map(({ country }) => (
                          <span key={country} className="text-base leading-none" aria-label={country}>
                            {getCountryFlag(country)}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* 8. "View details" link at bottom */}
                  <div className="flex justify-center py-2 border-t border-border mt-auto">
                    <Link
                      href={ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-primary hover:underline py-1 px-2 rounded-lg hover:bg-muted/50"
                    >
                      View details
                    </Link>
                  </div>
                </article>
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
