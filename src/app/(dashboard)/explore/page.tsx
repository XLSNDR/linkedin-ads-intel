import Link from "next/link";
import { Prisma, prisma } from "@/lib/prisma";
import { ExploreFilters } from "./ExploreFilters";
import { ExploreSearchSort } from "./ExploreSearchSort";
import { AdCardSaveButton } from "./AdCardSaveButton";
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

function formatAdLaunchDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Ad is still active when its end date is today or in the future. */
function isAdActive(endDate: Date | null): boolean {
  if (!endDate) return false;
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end >= today;
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

type SearchParams = {
  sort?: string;
  advertisers?: string;
  formats?: string;
  status?: string;
  minImpressions?: string;
  countries?: string;
  languages?: string;
  startDate?: string;
  endDate?: string;
  ctas?: string;
  search?: string;
  searchMode?: string;
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sort = params.sort ?? "date";
  const advertiserIds = params.advertisers?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const formats = params.formats?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const status = params.status ?? "";
  const minImpressions = params.minImpressions?.trim() ? parseInt(params.minImpressions, 10) : null;
  const countries = params.countries?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const languages = params.languages?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const startDateParam = params.startDate?.trim();
  const endDateParam = params.endDate?.trim();
  const ctas = params.ctas?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const search = params.search?.trim() ?? "";
  const searchMode = params.searchMode ?? "keyword";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const whereConditions: Prisma.AdWhereInput[] = [];

  if (advertiserIds.length) whereConditions.push({ advertiserId: { in: advertiserIds } });
  if (formats.length) whereConditions.push({ format: { in: formats } });
  if (status === "active") whereConditions.push({ OR: [{ endDate: { gte: today } }, { endDate: null }] });
  if (status === "stopped") whereConditions.push({ endDate: { not: null, lt: today } });
  if (minImpressions != null && !Number.isNaN(minImpressions)) whereConditions.push({ impressionsEstimate: { gte: minImpressions } });
  if (countries.length) {
    whereConditions.push({
      OR: countries.map((c) => ({
        countryImpressionsEstimate: { path: [c], not: Prisma.JsonNull },
      })),
    });
  }
  if (languages.length) whereConditions.push({ targetLanguage: { in: languages } });
  if (startDateParam && endDateParam) {
    const rangeStart = new Date(startDateParam);
    const rangeEnd = new Date(endDateParam);
    whereConditions.push({
      startDate: { lte: rangeEnd },
      OR: [{ endDate: { gte: rangeStart } }, { endDate: null }],
    });
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

  ads = ads.slice(0, 50);

  // Filter options for sidebar
  const [advertisersWithAds, allFormats, adsForOptions] = await Promise.all([
    prisma.advertiser.findMany({
      where: { ads: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.ad.findMany({ select: { format: true } }),
    prisma.ad.findMany({
      select: { targetLanguage: true, callToAction: true, countryImpressionsEstimate: true },
    }),
  ]);
  const formatCountMap = allFormats.reduce<Record<string, number>>((acc, { format }) => {
    acc[format] = (acc[format] ?? 0) + 1;
    return acc;
  }, {});
  const formatCounts = Object.entries(formatCountMap).map(([format, count]) => ({ format, count }));
  const countrySet = new Set<string>();
  adsForOptions.forEach((ad) => {
    const obj = ad.countryImpressionsEstimate as Record<string, unknown> | null;
    if (obj && typeof obj === "object") Object.keys(obj).forEach((k) => countrySet.add(k));
  });
  const countriesList = Array.from(countrySet).sort();
  const languagesList = Array.from(new Set(adsForOptions.map((a) => a.targetLanguage).filter(Boolean))) as string[];
  const ctasList = Array.from(new Set(adsForOptions.map((a) => a.callToAction).filter(Boolean))) as string[];

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
              {ads.length} {ads.length === 1 ? "ad" : "ads"}
            </p>
          </div>
          <ExploreSearchSort sort={sort} hasCountryFilter={countries.length > 0} />
        </div>

        {ads.length === 0 ? (
          <p className="text-muted-foreground">
            No ads yet. Add advertisers via the test scraper or Advertisers page
            to see ads here.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <li key={ad.id}>
                <article className="rounded-lg border border-border bg-card overflow-hidden shadow-sm flex flex-col">
                  {/* 1. Header: logo + company + Promoted | Status + Save */}
                  <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative h-6 w-6 shrink-0 rounded overflow-hidden bg-muted">
                        {ad.advertiser.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={ad.advertiser.logoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                            {ad.advertiser.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-bold leading-5 truncate">
                          {ad.advertiser.name}
                        </span>
                        <span className="text-xs text-muted-foreground leading-[15px]">
                          Promoted
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1 text-xs font-medium ${
                          isAdActive(ad.endDate)
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                        title={isAdActive(ad.endDate) ? "Active (end date is today or later)" : "Stopped (end date has passed)"}
                      >
                        {isAdActive(ad.endDate) ? (
                          <>
                            <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden />
                            Active
                          </>
                        ) : (
                          <>
                            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" aria-hidden />
                            Stopped
                          </>
                        )}
                      </span>
                      <AdCardSaveButton adId={ad.id} />
                    </div>
                  </div>

                  {/* 2. Intro text (above the creative) */}
                  <div className="px-3 py-1.5">
                    <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap line-clamp-4">
                      {ad.bodyText || ad.headline || "—"}
                    </p>
                  </div>

                  {/* 3. Main creative (image / video thumbnail) */}
                  <div className="border-t border-border mt-0">
                    <a
                      href={ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col hover:no-underline focus:no-underline"
                    >
                      {ad.mediaUrl && (
                        <div className="relative w-full min-h-[150px] bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ad.mediaUrl}
                            alt=""
                            className="w-full object-cover min-h-[150px]"
                          />
                        </div>
                      )}

                      {/* 4. Headline underneath the creative */}
                      {ad.callToAction && (
                        <div className="border-t border-border bg-muted/30 px-3 py-2">
                          <h2 className="text-sm font-semibold leading-[18px] text-foreground">
                            {ad.callToAction}
                          </h2>
                        </div>
                      )}
                    </a>
                  </div>

                  {/* 5. Launch date + runtime (AdsMom-style) */}
                  <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5" title="Launch date">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {ad.startDate ? formatAdLaunchDate(ad.startDate) : "—"}
                    </span>
                    {(() => {
                      const runtimeDays = ad.startDate && ad.endDate
                        ? Math.round((ad.endDate.getTime() - ad.startDate.getTime()) / (24 * 60 * 60 * 1000))
                        : 0;
                      return runtimeDays > 0 ? (
                      <span className="flex items-center gap-1.5" title="Runtime">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {runtimeDays} days
                      </span>
                      ) : null;
                    })()}
                  </div>

                  {/* 6. Ad detail metrics (impressions, etc.) */}
                  <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ad.impressions && (
                      <span title="Impressions">
                        <span className="font-medium text-foreground">
                          {ad.impressions}
                        </span>{" "}
                        impressions
                      </span>
                    )}
                    {ad.targetLocation && (
                      <span title="Location">{ad.targetLocation}</span>
                    )}
                    {ad.targetLanguage && !ad.targetLocation && (
                      <span title="Language">{ad.targetLanguage}</span>
                    )}
                  </div>

                  {/* 7. Format badge + country flags (AdsMom-style bottom row) */}
                  <div className="border-t border-border px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground" title="Ad format">
                      {FORMAT_LABELS[ad.format] ?? ad.format.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1" title="Top countries by impressions">
                      {parseCountryData(ad.impressionsPerCountry).map(({ country }) => (
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
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
