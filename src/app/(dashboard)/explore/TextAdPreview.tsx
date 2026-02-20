"use client";

/**
 * Text ad creative – LinkedIn Ads Library style (TEXT_AD).
 * Row: 50×50 ad image (optional) + headline/body text; footer: "View details" link.
 */
type Props = {
  headline: string | null;
  bodyText: string | null;
  imageUrl: string | null;
  adLibraryUrl: string;
};

export function TextAdPreview({
  headline,
  bodyText,
  imageUrl,
  adLibraryUrl,
}: Props) {
  const textPart = [headline?.trim(), bodyText?.trim()].filter(Boolean).join(" - ") || "—";

  return (
    <div className="overflow-hidden">
      <div className="m-1.5 p-1.5 flex gap-x-1.5 border border-border rounded-md bg-muted/20">
        <div className="h-[50px] w-[50px] shrink-0 flex items-center justify-center overflow-hidden rounded bg-muted">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt="Ad image"
              className="max-h-[50px] max-w-[50px] w-auto h-auto object-contain"
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">?</span>
          )}
        </div>
        <div className="min-w-0 flex-1 font-semibold text-sm break-words leading-[18px] text-foreground">
          {textPart}
        </div>
      </div>
      <div className="flex justify-center py-1 border-t border-border">
        <a
          href={adLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold text-primary hover:underline focus:no-underline py-1 px-2 rounded-lg hover:bg-muted/80"
        >
          View details
        </a>
      </div>
    </div>
  );
}
