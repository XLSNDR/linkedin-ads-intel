"use client";

import { AdCardBodyText } from "./AdCardBodyText";

/**
 * Message ad creative – LinkedIn Ads Library style.
 * Sender avatar stack (profile + company logo), sender name, message body with see more, CTA button(s), optional banner image.
 */
type Props = {
  bodyText: string | null;
  senderName: string | null;
  senderImageUrl: string | null;
  companyLogoUrl: string | null;
  companyName: string | null;
  callToAction: string | null;
  destinationUrl: string | null;
  adLibraryUrl: string | null;
  bannerImageUrl: string | null;
};

export function MessageAdPreview({
  bodyText,
  senderName,
  senderImageUrl,
  companyLogoUrl,
  companyName,
  callToAction,
  destinationUrl,
  adLibraryUrl,
  bannerImageUrl,
}: Props) {
  const ctaHref = destinationUrl ?? adLibraryUrl ?? "#";
  const showCta = callToAction && ctaHref !== "#";

  return (
    <div className="overflow-hidden">
      <div className="flex py-[18px] px-1.5 gap-x-1">
        {/* Avatar stack: sender (or placeholder) + company logo bottom-right */}
        <div className="relative shrink-0 h-6 w-6">
          <div className="absolute top-0 left-0 w-4 h-4 rounded-full overflow-hidden bg-muted">
            {senderImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={senderImageUrl}
                alt={senderName ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-[8px] font-bold text-muted-foreground">
                ?
              </span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full overflow-hidden bg-muted border border-background">
            {companyLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={companyLogoUrl}
                alt={companyName ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-[6px] font-bold text-muted-foreground">
                {companyName?.charAt(0) ?? "?"}
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 mt-[6px] flex-1">
          {senderName && (
            <p className="font-semibold text-sm leading-5 text-foreground">
              {senderName}
            </p>
          )}
          <div className="mt-1">
            <AdCardBodyText text={bodyText || "—"} />
          </div>
          {showCta && (
            <div className="mt-1.5">
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-1.5 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 no-underline"
              >
                {callToAction}
              </a>
            </div>
          )}
        </div>
      </div>

      {bannerImageUrl && (
        <div className="border-t border-border py-4 px-1 mx-3 my-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerImageUrl}
            alt=""
            className="object-contain block mx-auto min-h-[150px] w-full"
          />
        </div>
      )}
    </div>
  );
}
