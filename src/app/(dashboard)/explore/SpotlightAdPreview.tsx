"use client";

/**
 * Spotlight ad creative – LinkedIn Ads Library style.
 * Centered block: intro text, two circular images (profile + company logo), headline, CTA button.
 */
type Props = {
  bodyText: string | null;
  headline: string | null;
  callToAction: string | null;
  destinationUrl: string | null;
  profileImageUrl: string | null;
  companyLogoUrl: string | null;
  companyName: string | null;
  adLibraryUrl?: string | null;
};

export function SpotlightAdPreview({
  bodyText,
  headline,
  callToAction,
  destinationUrl,
  profileImageUrl,
  companyLogoUrl,
  companyName,
  adLibraryUrl,
}: Props) {
  const ctaHref = destinationUrl ?? adLibraryUrl ?? "#";
  const showCta = callToAction && ctaHref !== "#";

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col px-3 py-1.5 m-1.5 gap-y-1.5 text-center items-center border border-border rounded-md bg-muted/20">
        {bodyText && (
          <p className="text-xs leading-4 text-muted-foreground break-words w-full">
            {bodyText}
          </p>
        )}
        <div className="flex gap-x-2">
          {/* Profile / thought leader image (or placeholder) */}
          <div className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden bg-muted">
            {profileImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profileImageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-2xl font-bold text-muted-foreground">
                ?
              </span>
            )}
          </div>
          {/* Company logo */}
          <div className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden bg-muted object-contain">
            {companyLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={companyLogoUrl}
                alt={companyName ?? "Company"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-xl font-bold text-muted-foreground">
                {companyName?.charAt(0) ?? "?"}
              </span>
            )}
          </div>
        </div>
        {headline && (
          <h2 className="text-sm font-semibold leading-[18px] text-foreground break-words w-full">
            {headline}
          </h2>
        )}
        {showCta && (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block my-1 px-4 py-1.5 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 no-underline"
          >
            {callToAction}
          </a>
        )}
      </div>
    </div>
  );
}
