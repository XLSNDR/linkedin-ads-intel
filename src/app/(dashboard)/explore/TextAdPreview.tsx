"use client";

/**
 * Text ad creative – LinkedIn Ads Library style (TEXT_AD).
 * Row: 50×50 ad image or company logo (placeholder) + headline/body text.
 * "View details" is shown once in the main ad card footer.
 */
type Props = {
  headline: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  companyLogoUrl: string | null;
  companyName: string | null;
};

export function TextAdPreview({
  headline,
  bodyText,
  imageUrl,
  companyLogoUrl,
  companyName,
}: Props) {
  const textPart = [headline?.trim(), bodyText?.trim()].filter(Boolean).join(" - ") || "—";
  const showImage = imageUrl ?? companyLogoUrl;

  return (
    <div className="overflow-hidden">
      <div className="m-1.5 p-1.5 flex gap-x-1.5 border border-border rounded-md bg-muted/20">
        <div className="h-[50px] w-[50px] shrink-0 flex items-center justify-center overflow-hidden rounded bg-muted">
          {showImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={showImage}
              alt={imageUrl ? "Ad image" : (companyName ?? "Advertiser")}
              className="max-h-[50px] max-w-[50px] w-auto h-auto object-contain"
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {companyName?.charAt(0) ?? "?"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 font-semibold text-sm break-words leading-[18px] text-foreground">
          {textPart}
        </div>
      </div>
    </div>
  );
}
