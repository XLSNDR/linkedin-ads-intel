"use client";

import { AdCardBodyText } from "./AdCardBodyText";

/**
 * LinkedIn Article ad creative – matches LinkedIn Ads Library
 * (SPONSORED_UPDATE_LINKEDIN_ARTICLE): commentary text + article card (cover image
 * or company logo placeholder, headline, excerpt). Card links to clickURL when set.
 */
type Props = {
  bodyText: string | null;
  headline: string | null;
  destinationUrl: string | null;
  mediaUrl: string | null;
  companyLogoUrl: string | null;
  companyName: string | null;
};

export function LinkedInArticleAdPreview({
  bodyText,
  headline,
  destinationUrl,
  mediaUrl,
  companyLogoUrl,
  companyName,
}: Props) {
  const commentary = (bodyText ?? "").trim() || "—";
  const articleTitle = (headline ?? "").trim() || "—";
  const excerpt = commentary !== "—" ? commentary.slice(0, 80).trim() + (commentary.length > 80 ? "…" : "") : "";
  const href = destinationUrl?.trim() || null;
  const imageUrl = mediaUrl?.trim() || null;

  const imageBlock = (
    <div className="relative w-full bg-muted" style={{ aspectRatio: "1120 / 630" }}>
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt={articleTitle}
          className="object-cover block w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4">
          {companyLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={companyLogoUrl}
              alt={companyName ?? "Advertiser"}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-4xl font-bold text-muted-foreground">
              {companyName?.charAt(0) ?? "?"}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const footerBlock = (
    <div className="px-2 py-2 flex flex-col gap-1 bg-muted/50 rounded-b-md">
      <span className="text-foreground font-semibold text-xs leading-[16px] line-clamp-1 break-words">
        {articleTitle}
      </span>
      {excerpt && (
        <span className="text-muted-foreground leading-[20px] font-normal text-xs break-words line-clamp-2">
          {excerpt}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col overflow-hidden border-t border-border">
      {/* Commentary (LinkedIn style: …see more) */}
      <div className="commentary__container relative my-1.5 px-3">
        <AdCardBodyText text={commentary} />
      </div>

      {/* Article card: image (or logo placeholder) + footer; clickable only when destinationUrl is set */}
      <div className="flex flex-col mt-0 px-2 pb-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:no-underline focus:no-underline active:no-underline rounded-b-md overflow-hidden block"
          >
            {imageBlock}
            {footerBlock}
          </a>
        ) : (
          <div className="rounded-b-md overflow-hidden block">
            {imageBlock}
            {footerBlock}
          </div>
        )}
      </div>
    </div>
  );
}
