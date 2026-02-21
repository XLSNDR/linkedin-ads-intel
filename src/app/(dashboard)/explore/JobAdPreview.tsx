"use client";

/**
 * Job Ad creative – LinkedIn Ads Library style (JOBS_V2).
 * Centered block: two 72px circles (placeholder + company logo), body text, "See More Jobs" CTA.
 * Body text comes from body/bodyText when Apify provides it (e.g. "%FIRSTNAME%, explore jobs at X that match your skills").
 */
type Props = {
  bodyText: string | null;
  headline: string | null;
  callToAction: string | null;
  destinationUrl: string | null;
  companyLogoUrl: string | null;
  companyName: string | null;
};

export function JobAdPreview({
  bodyText,
  headline,
  callToAction,
  destinationUrl,
  companyLogoUrl,
  companyName,
}: Props) {
  const body = (bodyText ?? headline ?? "").trim() || "—";
  const ctaLabel = (callToAction ?? "See More Jobs").trim() || "See More Jobs";
  const ctaHref = destinationUrl?.trim() || "#";

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col px-3 py-1.5 m-1.5 gap-y-1.5 text-center items-center border border-border rounded-md bg-muted/20">
        <div className="flex gap-x-2">
          {/* Left: generic placeholder (LinkedIn uses ghost/profile icon) */}
          <div className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground" aria-hidden>
              J
            </span>
          </div>
          {/* Right: company logo (optionally linked) */}
          {ctaHref !== "#" ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-[72px] h-[72px] shrink-0 block rounded-full overflow-hidden bg-muted"
            >
              {companyLogoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={companyLogoUrl}
                  alt={companyName ?? "Company"}
                  className="w-full h-full object-scale-down object-center"
                />
              ) : (
                <span className="flex w-full h-full items-center justify-center text-xl font-bold text-muted-foreground">
                  {companyName?.charAt(0) ?? "?"}
                </span>
              )}
            </a>
          ) : (
            <div className="w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden bg-muted">
              {companyLogoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={companyLogoUrl}
                  alt={companyName ?? "Company"}
                  className="w-full h-full object-scale-down object-center"
                />
              ) : (
                <span className="flex w-full h-full items-center justify-center text-xl font-bold text-muted-foreground">
                  {companyName?.charAt(0) ?? "?"}
                </span>
              )}
            </div>
          )}
        </div>
        <h2 className="text-sm leading-[18px] text-foreground max-w-[276px] break-words w-full">
          {body}
        </h2>
        {ctaHref !== "#" && (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block my-1 px-2 py-[6px] rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 no-underline"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </div>
  );
}
