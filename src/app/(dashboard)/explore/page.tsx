import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ExploreToolbar } from "./ExploreToolbar";
import { AdCardSaveButton } from "./AdCardSaveButton";
import { getCountryFlag, parseCountryData } from "@/lib/country-flags";

const FORMAT_LABELS: Record<string, string> = {
  single_image: "Single image",
  video: "Video",
  event: "Event",
  carousel: "Carousel",
  document: "Document",
  text: "Text",
  thought_leader_image: "Thought leader (image)",
  thought_leader_video: "Thought leader (video)",
  thought_leader_text: "Thought leader (text)",
  other: "Other",
};

function formatAdLaunchDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Ad is still active when its end date (lastSeenDate) is today or in the future. */
function isAdActive(lastSeenDate: Date): boolean {
  const end = new Date(lastSeenDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end >= today;
}

/** Parse impression bucket (e.g. "100k-150k", "1k-5k") to midpoint number for sorting. */
function impressionBucketToNumber(bucket: string | null): number {
  if (!bucket || !bucket.trim()) return 0;
  const lower = bucket.toLowerCase().replace(/\s/g, "");
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

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; format?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort ?? "date";
  const formatFilter = params.format ?? "";

  const orderBy =
    sort === "runtime"
      ? { runtimeDays: "desc" as const }
      : { lastSeenDate: "desc" as const };

  let ads = await prisma.ad.findMany({
    where: formatFilter ? { format: formatFilter } : undefined,
    include: { advertiser: true },
    orderBy,
    take: 50,
  });

  if (sort === "impressions") {
    ads = [...ads].sort(
      (a, b) =>
        impressionBucketToNumber(b.impressionBucket) -
        impressionBucketToNumber(a.impressionBucket)
    );
  }

  // Count by format (in-memory to avoid groupBy adapter issues)
  const allFormats = await prisma.ad.findMany({
    select: { format: true },
  });
  const formatCountMap = allFormats.reduce<Record<string, number>>((acc, { format }) => {
    acc[format] = (acc[format] ?? 0) + 1;
    return acc;
  }, {});
  const formatCounts = Object.entries(formatCountMap).map(([format, count]) => ({
    format,
    count,
  }));

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Explore Ads</h1>
            <p className="text-muted-foreground text-sm">
              {ads.length} {ads.length === 1 ? "ad" : "ads"}
              {formatFilter && ` · ${formatFilter.replace(/_/g, " ")}`}
            </p>
          </div>
          <ExploreToolbar
            sort={sort}
            formatFilter={formatFilter}
            formatCounts={formatCounts.map((f) => ({
              format: f.format,
              count: f.count,
            }))}
          />
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
                        {ad.advertiser.companyLogoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={ad.advertiser.companyLogoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                            {ad.advertiser.companyName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-bold leading-5 truncate">
                          {ad.advertiser.companyName}
                        </span>
                        <span className="text-xs text-muted-foreground leading-[15px]">
                          Promoted
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1 text-xs font-medium ${
                          isAdActive(ad.lastSeenDate)
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                        title={isAdActive(ad.lastSeenDate) ? "Active (end date is today or later)" : "Stopped (end date has passed)"}
                      >
                        {isAdActive(ad.lastSeenDate) ? (
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
                      <AdCardSaveButton adId={ad.adId} />
                    </div>
                  </div>

                  {/* 2. Intro text (above the creative) */}
                  <div className="px-3 py-1.5">
                    <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap line-clamp-4">
                      {ad.introText || "—"}
                    </p>
                  </div>

                  {/* 3. Main creative (image / video thumbnail) */}
                  <div className="border-t border-border mt-0">
                    <a
                      href={ad.adLibraryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col hover:no-underline focus:no-underline"
                    >
                      {ad.creativeThumbnailUrl && (
                        <div className="relative w-full min-h-[150px] bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ad.creativeThumbnailUrl}
                            alt=""
                            className="w-full object-cover min-h-[150px]"
                          />
                        </div>
                      )}

                      {/* 4. Headline underneath the creative */}
                      {ad.ctaText && (
                        <div className="border-t border-border bg-muted/30 px-3 py-2">
                          <h2 className="text-sm font-semibold leading-[18px] text-foreground">
                            {ad.ctaText}
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
                      {formatAdLaunchDate(ad.firstSeenDate)}
                    </span>
                    {ad.runtimeDays > 0 && (
                      <span className="flex items-center gap-1.5" title="Runtime">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {ad.runtimeDays} days
                      </span>
                    )}
                  </div>

                  {/* 6. Ad detail metrics (impressions, etc.) */}
                  <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ad.impressionBucket && (
                      <span title="Impressions">
                        <span className="font-medium text-foreground">
                          {ad.impressionBucket}
                        </span>{" "}
                        impressions
                      </span>
                    )}
                    {ad.locations?.length > 0 && (
                      <span title="Location">{ad.locations[0]}</span>
                    )}
                    {ad.languages?.length > 0 && ad.locations?.length === 0 && (
                      <span title="Language">{ad.languages[0]}</span>
                    )}
                  </div>

                  {/* 7. Format badge + country flags (AdsMom-style bottom row) */}
                  <div className="border-t border-border px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground" title="Ad format">
                      {FORMAT_LABELS[ad.format] ?? ad.format.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1" title="Top countries by impressions">
                      {parseCountryData(ad.countryData).map(({ country }) => (
                        <span key={country} className="text-base leading-none" aria-label={country}>
                          {getCountryFlag(country)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 8. "View details" link at bottom */}
                  <div className="flex justify-center py-2 border-t border-border mt-auto">
                    <Link
                      href={ad.adLibraryUrl}
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
