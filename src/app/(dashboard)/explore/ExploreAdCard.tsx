import Link from "next/link";
import { AdCardBodyText } from "./AdCardBodyText";
import { CarouselAdPreview } from "./CarouselAdPreview";
import { DocumentAdPreview } from "./DocumentAdPreview";
import { EventAdPreview } from "./EventAdPreview";
import { FollowCompanyAdPreview } from "./FollowCompanyAdPreview";
import { TextAdPreview } from "./TextAdPreview";
import { MessageAdPreview } from "./MessageAdPreview";
import { SpotlightAdPreview } from "./SpotlightAdPreview";
import { VideoAdPreview } from "./VideoAdPreview";
import { LinkedInArticleAdPreview } from "./LinkedInArticleAdPreview";
import { JobAdPreview } from "./JobAdPreview";
import {
  FORMAT_LABELS,
  formatAdLaunchDate,
  formatEventTimeRange,
  formatEstImpressions,
  getAdEstImpressions,
} from "./ad-card-utils";
import { getCountryFlag, parseCountryData } from "@/lib/country-flags";

type Advertiser = { id: string; name: string | null; logoUrl: string | null };

type Ad = {
  id: string;
  format: string;
  bodyText: string | null;
  headline: string | null;
  callToAction: string | null;
  destinationUrl: string | null;
  mediaUrl: string | null;
  mediaData: unknown;
  startDate: Date | null;
  endDate: Date | null;
  lastSeenAt: Date | null;
  thoughtLeaderMemberImageUrl: string | null;
  externalId: string;
  adLibraryUrl: string | null;
  targetLanguage: string | null;
  countryImpressionsEstimate: unknown;
  impressionsEstimate: number | null;
  impressions: string | null;
  impressionsPerCountry: unknown;
};

type Props = {
  ad: Ad;
  advertiser: Advertiser;
  countries: string[];
  impressionsToNumber: (s: string | null) => number;
  actionsSlot: React.ReactNode;
};

export function ExploreAdCard({
  ad,
  advertiser,
  countries,
  impressionsToNumber,
  actionsSlot,
}: Props) {
  return (
    <article className="w-full rounded-lg border border-border bg-card overflow-hidden shadow-sm flex flex-col">
      {/* 1. Header: logo + company + Promoted | actions (Save / Remove) */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative h-12 w-12 shrink-0 rounded overflow-hidden bg-muted">
            {(ad.thoughtLeaderMemberImageUrl?.trim() || advertiser.logoUrl) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={(ad.thoughtLeaderMemberImageUrl?.trim() || advertiser.logoUrl) ?? ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
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
        <div className="flex items-center gap-2 shrink-0">{actionsSlot}</div>
      </div>

      {/* 2. Intro text – skip for spotlight, message, follow company, text, linkedin_article, job */}
      {ad.format?.toLowerCase() !== "spotlight" &&
        ad.format?.toLowerCase() !== "message" &&
        ad.format?.toLowerCase() !== "follow_company" &&
        ad.format?.toLowerCase() !== "text" &&
        ad.format?.toLowerCase() !== "linkedin_article" &&
        ad.format?.toLowerCase() !== "sponsored_update_linkedin_article" &&
        ad.format?.toLowerCase() !== "job" &&
        ad.format?.toLowerCase() !== "jobs_v2" && (
          <div className="px-3 py-1.5">
            <AdCardBodyText text={ad.bodyText || ad.headline || "—"} />
          </div>
        )}

      {/* 3. Main creative */}
      <div className="border-t border-border mt-0">
        {ad.format?.toLowerCase() === "spotlight" ? (
          <SpotlightAdPreview
            bodyText={ad.bodyText}
            headline={ad.headline}
            callToAction={ad.callToAction}
            destinationUrl={ad.destinationUrl}
            profileImageUrl={ad.mediaUrl}
            companyLogoUrl={ad.thoughtLeaderMemberImageUrl?.trim() ?? advertiser.logoUrl}
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
        ) : ad.format?.toLowerCase() === "video" ? (
          <VideoAdPreview
            videoUrl={ad.mediaUrl}
            posterUrl={(ad.mediaData as { posterUrl?: string } | null)?.posterUrl}
            adLibraryUrl={ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`}
          />
        ) : ad.format?.toLowerCase() === "message" ? (
          <MessageAdPreview
            bodyText={ad.bodyText}
            senderName={(ad.mediaData as { senderName?: string } | null)?.senderName ?? null}
            senderImageUrl={(ad.mediaData as { senderImageUrl?: string } | null)?.senderImageUrl ?? null}
            companyLogoUrl={ad.thoughtLeaderMemberImageUrl?.trim() ?? advertiser.logoUrl}
            companyName={advertiser.name}
            callToAction={ad.callToAction}
            destinationUrl={ad.destinationUrl}
            adLibraryUrl={ad.adLibraryUrl ?? `https://www.linkedin.com/ad-library/detail/${ad.externalId}`}
            bannerImageUrl={ad.mediaUrl}
          />
        ) : ad.format?.toLowerCase() === "event" ? (
          <EventAdPreview
            eventImageUrl={ad.mediaUrl}
            eventTitle={ad.headline}
            eventTimeDisplay={
              (ad.mediaData as { eventTimeDisplay?: string } | null)?.eventTimeDisplay ??
              formatEventTimeRange(ad.startDate, ad.endDate)
            }
            companyName={advertiser.name}
            isOnline={true}
            eventUrl={
              (ad.mediaData as { eventUrl?: string } | null)?.eventUrl ??
              ad.destinationUrl ??
              ad.adLibraryUrl ??
              `https://www.linkedin.com/ad-library/detail/${ad.externalId}`
            }
          />
        ) : ad.format?.toLowerCase() === "carousel" &&
          (ad.mediaData as { slides?: Array<{ imageUrl: string; title?: string }> } | null)?.slides?.length ? (
          <CarouselAdPreview
            slides={
              (ad.mediaData as { slides: Array<{ imageUrl: string; title?: string }> }).slides
            }
            destinationUrl={ad.destinationUrl ?? null}
          />
        ) : ad.format?.toLowerCase() === "follow_company" ? (
          <FollowCompanyAdPreview
            bodyText={ad.bodyText}
            headline={ad.headline}
            callToAction={ad.callToAction}
            destinationUrl={ad.destinationUrl ?? null}
            profileImageUrl={ad.mediaUrl}
            companyLogoUrl={ad.thoughtLeaderMemberImageUrl?.trim() ?? advertiser.logoUrl}
            companyName={advertiser.name}
            companyUrl={ad.destinationUrl ?? null}
          />
        ) : ad.format?.toLowerCase() === "job" || ad.format?.toLowerCase() === "jobs_v2" ? (
          <JobAdPreview
            bodyText={ad.bodyText}
            headline={ad.headline}
            callToAction={ad.callToAction}
            destinationUrl={ad.destinationUrl ?? null}
            companyLogoUrl={ad.thoughtLeaderMemberImageUrl?.trim() ?? advertiser.logoUrl}
            companyName={advertiser.name}
          />
        ) : ad.format?.toLowerCase() === "text" ? (
          <TextAdPreview
            headline={ad.headline}
            bodyText={ad.bodyText}
            imageUrl={ad.mediaUrl}
            companyLogoUrl={ad.thoughtLeaderMemberImageUrl?.trim() ?? advertiser.logoUrl}
            companyName={advertiser.name}
          />
        ) : ad.format?.toLowerCase() === "linkedin_article" ||
          ad.format?.toLowerCase() === "sponsored_update_linkedin_article" ? (
          <LinkedInArticleAdPreview
            bodyText={ad.bodyText}
            headline={ad.headline}
            destinationUrl={ad.destinationUrl}
            mediaUrl={ad.mediaUrl}
            companyLogoUrl={ad.thoughtLeaderMemberImageUrl?.trim() ?? advertiser.logoUrl}
            companyName={advertiser.name}
          />
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

        {/* 4. Headline bar */}
        {ad.format?.toLowerCase() !== "spotlight" &&
          ad.format?.toLowerCase() !== "message" &&
          ad.format?.toLowerCase() !== "event" &&
          ad.format?.toLowerCase() !== "carousel" &&
          ad.format?.toLowerCase() !== "follow_company" &&
          ad.format?.toLowerCase() !== "text" &&
          ad.format?.toLowerCase() !== "linkedin_article" &&
          ad.format?.toLowerCase() !== "sponsored_update_linkedin_article" &&
          ad.format?.toLowerCase() !== "job" &&
          ad.format?.toLowerCase() !== "jobs_v2" &&
          (ad.headline || ad.callToAction) && (
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
                  href={
                    ad.destinationUrl ??
                    ad.adLibraryUrl ??
                    `https://www.linkedin.com/ad-library/detail/${ad.externalId}`
                  }
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

      {/* 5. Runtime */}
      <div className="border-t border-border px-3 py-2 flex flex-col gap-1 text-xs text-muted-foreground">
        {(() => {
          const effectiveEnd = ad.endDate ?? ad.lastSeenAt;
          const runtimeDays =
            ad.startDate && effectiveEnd
              ? Math.round(
                  (effectiveEnd.getTime() - ad.startDate.getTime()) /
                    (24 * 60 * 60 * 1000)
                )
              : 0;
          return (
            <>
              {runtimeDays > 0 ? (
                <span className="flex items-center gap-1.5 font-bold text-foreground" title="Runtime (from Start to Last Seen)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Runtime: {runtimeDays} Days
                </span>
              ) : null}
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
                  Last Seen: {effectiveEnd ? formatAdLaunchDate(effectiveEnd) : "—"}
                </span>
              </div>
            </>
          );
        })()}
      </div>

      {/* 6. Est. Impressions */}
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

      {/* 7. Format badge + country flags */}
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

      {/* 8. View details link */}
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
  );
}
