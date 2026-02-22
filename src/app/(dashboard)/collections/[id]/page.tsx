import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCollectionWithAllAds } from "@/lib/services/collection.service";
import { ExploreFilters } from "@/app/(dashboard)/explore/ExploreFilters";
import { ExploreSearchSort } from "@/app/(dashboard)/explore/ExploreSearchSort";
import { ExploreAdCard } from "@/app/(dashboard)/explore/ExploreAdCard";
import { AdCardSaveButton } from "@/app/(dashboard)/explore/AdCardSaveButton";
import { FORMAT_LABELS, impressionsToNumber, getAdEstImpressions } from "@/app/(dashboard)/explore/ad-card-utils";
import { CollectionDetailActions } from "../CollectionDetailActions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> };

export default async function CollectionDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const raw = await searchParams;

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    notFound();
  }

  const data = await getCollectionWithAllAds(id, user.id);
  if (!data) notFound();

  const advertiserIds = (raw.advertisers ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const formats = (raw.formats ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const countries = (raw.countries ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const languages = (raw.languages ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ctas = (raw.ctas ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const promotedBy = (raw.promotedBy ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const minImpressionsRaw = raw.minImpressions?.trim() ?? "";
  const minImpressions = minImpressionsRaw ? parseInt(minImpressionsRaw, 10) : null;
  const startDateParam = raw.startDate?.trim();
  const endDateParam = raw.endDate?.trim();
  const search = raw.search?.trim() ?? "";
  const searchMode = raw.searchMode ?? "keyword";
  const sort = raw.sort ?? "date";
  const pageNum = Math.max(1, parseInt(raw.page ?? "1", 10) || 1);

  let ads = data.ads;

  // Apply filters (same logic as Explore, in memory)
  if (advertiserIds.length > 0) {
    ads = ads.filter((ad) => ad.advertiser && advertiserIds.includes(ad.advertiser.id));
  }
  if (formats.length > 0) {
    ads = ads.filter((ad) => ad.format && formats.includes(ad.format.toLowerCase()));
  }
  if (languages.length > 0) {
    ads = ads.filter((ad) => ad.targetLanguage && languages.includes(ad.targetLanguage));
  }
  if (ctas.length > 0) {
    ads = ads.filter((ad) => ad.callToAction && ctas.includes(ad.callToAction));
  }
  if (promotedBy.length === 1) {
    if (promotedBy[0] === "thought_leader") {
      ads = ads.filter((ad) => (ad as { thoughtLeaderMemberImageUrl?: string | null }).thoughtLeaderMemberImageUrl?.trim());
    } else if (promotedBy[0] === "company_page") {
      ads = ads.filter((ad) => !(ad as { thoughtLeaderMemberImageUrl?: string | null }).thoughtLeaderMemberImageUrl?.trim());
    }
  }
  if (promotedBy.length === 2 && promotedBy.includes("thought_leader") && promotedBy.includes("company_page")) {
    // both = no filter
  } else if (promotedBy.length > 0) {
    if (promotedBy.includes("thought_leader") && !promotedBy.includes("company_page")) {
      ads = ads.filter((ad) => (ad as { thoughtLeaderMemberImageUrl?: string | null }).thoughtLeaderMemberImageUrl?.trim());
    } else if (promotedBy.includes("company_page") && !promotedBy.includes("thought_leader")) {
      ads = ads.filter((ad) => !(ad as { thoughtLeaderMemberImageUrl?: string | null }).thoughtLeaderMemberImageUrl?.trim());
    }
  }
  if (startDateParam && endDateParam) {
    const rangeStart = new Date(startDateParam);
    const rangeEnd = new Date(endDateParam);
    if (!Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime())) {
      ads = ads.filter((ad) => {
        const start = ad.startDate;
        const end = ad.endDate ?? ad.lastSeenAt;
        if (!start) return false;
        const startValid = start.getTime() <= rangeEnd.getTime();
        const endValid = !end || end.getTime() >= rangeStart.getTime();
        return startValid && endValid;
      });
    }
  }
  if (search) {
    if (searchMode === "url") {
      ads = ads.filter((ad) => ad.destinationUrl?.toLowerCase().includes(search.toLowerCase()));
    } else {
      const q = search.toLowerCase();
      ads = ads.filter(
        (ad) =>
          (ad.bodyText?.toLowerCase().includes(q) ?? false) ||
          (ad.headline?.toLowerCase().includes(q) ?? false)
      );
    }
  }
  if (countries.length > 0) {
    ads = ads.filter((ad) => {
      const est = ad.countryImpressionsEstimate as Record<string, unknown> | null;
      if (!est || typeof est !== "object") return false;
      return countries.some((c) => c in est);
    });
  }
  if (minImpressions != null && !Number.isNaN(minImpressions)) {
    ads = ads.filter((ad) => getAdEstImpressions(ad, countries, impressionsToNumber) >= minImpressions);
  }

  // Sort
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
  } else if (sort === "runtime") {
    ads = [...ads].sort((a, b) => {
      const endA = a.endDate ?? a.lastSeenAt;
      const endB = b.endDate ?? b.lastSeenAt;
      const daysA =
        a.startDate && endA
          ? Math.round((endA.getTime() - a.startDate.getTime()) / (24 * 60 * 60 * 1000))
          : 0;
      const daysB =
        b.startDate && endB
          ? Math.round((endB.getTime() - b.startDate.getTime()) / (24 * 60 * 60 * 1000))
          : 0;
      return daysB - daysA;
    });
  } else {
    // date desc
    ads = [...ads].sort((a, b) => {
      const tA = a.startDate?.getTime() ?? 0;
      const tB = b.startDate?.getTime() ?? 0;
      return tB - tA;
    });
  }

  const totalCount = ads.length;
  const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(pageNum, maxPage);
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginatedAds = ads.slice(start, start + PAGE_SIZE);

  // Filter options from full collection ads (data.ads)
  const advertiserMap = new Map<string, { id: string; name: string; logoUrl: string | null }>();
  const formatCountMap: Record<string, number> = {};
  const countrySet = new Set<string>();
  const languageSet = new Set<string>();
  const ctaSet = new Set<string>();
  let promotedByThoughtLeader = 0;
  let promotedByCompanyPage = 0;

  for (const ad of data.ads) {
    if (ad.advertiser && !advertiserMap.has(ad.advertiser.id)) {
      advertiserMap.set(ad.advertiser.id, {
        id: ad.advertiser.id,
        name: ad.advertiser.name ?? "—",
        logoUrl: ad.advertiser.logoUrl,
      });
    }
    if (ad.format) formatCountMap[ad.format] = (formatCountMap[ad.format] ?? 0) + 1;
    const countryObj = ad.countryImpressionsEstimate as Record<string, unknown> | null;
    if (countryObj && typeof countryObj === "object") {
      for (const key of Object.keys(countryObj)) countrySet.add(key);
    }
    if (ad.targetLanguage) languageSet.add(ad.targetLanguage);
    if (ad.callToAction) ctaSet.add(ad.callToAction);
    const tl = (ad as { thoughtLeaderMemberImageUrl?: string | null }).thoughtLeaderMemberImageUrl;
    if (tl?.trim()) promotedByThoughtLeader++;
    else promotedByCompanyPage++;
  }

  const filterOptions = {
    advertisers: Array.from(advertiserMap.values()).sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" })
    ),
    formats: Object.entries(formatCountMap).map(([format, count]) => ({ format, count })),
    formatLabels: FORMAT_LABELS,
    countries: Array.from(countrySet).sort(),
    languages: Array.from(languageSet),
    promotedByCounts: { thought_leader: promotedByThoughtLeader, company_page: promotedByCompanyPage },
    ctas: Array.from(ctaSet),
  };

  const basePath = `/collections/${id}`;

  function collectionPageUrl(page: number): string {
    const q = new URLSearchParams();
    if (raw.advertisers) q.set("advertisers", raw.advertisers);
    if (raw.formats) q.set("formats", raw.formats);
    if (raw.minImpressions) q.set("minImpressions", raw.minImpressions);
    if (raw.countries) q.set("countries", raw.countries);
    if (raw.languages) q.set("languages", raw.languages);
    if (raw.promotedBy) q.set("promotedBy", raw.promotedBy);
    if (raw.startDate) q.set("startDate", raw.startDate);
    if (raw.endDate) q.set("endDate", raw.endDate);
    if (raw.ctas) q.set("ctas", raw.ctas);
    if (raw.search) q.set("search", raw.search);
    if (raw.searchMode) q.set("searchMode", raw.searchMode);
    if (raw.sort) q.set("sort", raw.sort);
    if (page > 1) q.set("page", String(page));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)] flex">
      <ExploreFilters options={filterOptions} basePath={basePath} />
      <main className="flex-1 min-w-0 px-6 py-8">
        {/* Header: folder + name + item count (left), Showing + Back to Collections (right), like Explore */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0" aria-hidden>
              📁
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold truncate">{data.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data._count.collectionAds} {data._count.collectionAds === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <p className="text-muted-foreground text-sm">
              {totalCount === 0
                ? "0 ads"
                : `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, totalCount)} of ${totalCount}`}
            </p>
            <Link
              href="/collections"
              className="text-sm font-medium text-primary hover:underline"
            >
              ← Back to Collections
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <ExploreSearchSort
            sort={sort}
            hasCountryFilter={countries.length > 0}
            basePath={basePath}
          />
        </div>

        {paginatedAds.length === 0 ? (
          <p className="text-muted-foreground">
            {totalCount === 0
              ? "This collection is empty. Browse ads to add some."
              : "No ads match your filters. Try changing filters."}
          </p>
        ) : (
          <>
            <div className="w-full mx-auto" style={{ maxWidth: 1636 }}>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 list-none p-0 m-0 w-full">
                {paginatedAds.map((ad) => {
                  const advertiser = ad.advertiser;
                  if (!advertiser) return null;
                  return (
                    <li key={ad.id} className="min-w-0">
                      <ExploreAdCard
                        ad={ad}
                        advertiser={advertiser}
                        countries={countries}
                        impressionsToNumber={impressionsToNumber}
                        actionsSlot={
                          <div className="flex items-center gap-2">
                            <AdCardSaveButton
                              adId={ad.id}
                              isSaved={true}
                            />
                            <CollectionDetailActions collectionId={id} adId={ad.id} />
                          </div>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>

            {totalCount > PAGE_SIZE && (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
                {currentPage > 1 ? (
                  <Link
                    href={collectionPageUrl(currentPage - 1)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted/80"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                    Previous
                  </span>
                )}
                {Array.from({ length: maxPage }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === maxPage || Math.abs(p - currentPage) <= 2)
                  .map((p, i, arr) => (
                    <span key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-1 text-muted-foreground">…</span>
                      )}
                      {p === currentPage ? (
                        <span
                          className="rounded-md border border-primary bg-primary/10 px-2.5 py-1.5 text-sm font-medium"
                          aria-current="page"
                        >
                          {p}
                        </span>
                      ) : (
                        <Link
                          href={collectionPageUrl(p)}
                          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm hover:bg-muted/80"
                        >
                          {p}
                        </Link>
                      )}
                    </span>
                  ))}
                {currentPage < maxPage ? (
                  <Link
                    href={collectionPageUrl(currentPage + 1)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted/80"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                    Next
                  </span>
                )}
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
