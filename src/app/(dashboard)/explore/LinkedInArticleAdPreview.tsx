"use client";

import { AdCardBodyText } from "./AdCardBodyText";

/**
 * LinkedIn Article ad creative – matches LinkedIn Ads Library
 * (SPONSORED_UPDATE_LINKEDIN_ARTICLE): commentary text + article card (cover image,
 * headline, excerpt) linking to the article.
 */
type Props = {
  bodyText: string | null;
  headline: string | null;
  destinationUrl: string | null;
  mediaUrl: string | null;
};

export function LinkedInArticleAdPreview({
  bodyText,
  headline,
  destinationUrl,
  mediaUrl,
}: Props) {
  const commentary = (bodyText ?? "").trim() || "—";
  const articleTitle = (headline ?? "").trim() || "—";
  const excerpt = commentary !== "—" ? commentary.slice(0, 80).trim() + (commentary.length > 80 ? "…" : "") : "";
  const href = destinationUrl?.trim() || "#";

  return (
    <div className="flex flex-col overflow-hidden border-t border-border">
      {/* Commentary (LinkedIn style: …see more) */}
      <div className="commentary__container relative my-1.5 px-3">
        <AdCardBodyText text={commentary} />
      </div>

      {/* Article card: link → image + footer box */}
      <div className="flex flex-col mt-0 px-2 pb-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:no-underline focus:no-underline active:no-underline rounded-b-md overflow-hidden block"
        >
          {mediaUrl && (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt={articleTitle}
                className="object-cover block w-full"
                style={{ aspectRatio: "1120 / 630" }}
              />
            </div>
          )}
          <div className="px-2 py-2 flex flex-col gap-1 bg-muted/50 rounded-b-md">
            <span className="text-foreground font-semibold leading-[22px] text-base break-words">
              {articleTitle}
            </span>
            {excerpt && (
              <span className="text-muted-foreground leading-[20px] font-normal text-xs break-words line-clamp-2">
                {excerpt}
              </span>
            )}
          </div>
        </a>
      </div>
    </div>
  );
}
