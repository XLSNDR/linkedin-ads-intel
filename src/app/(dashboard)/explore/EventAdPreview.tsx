"use client";

/**
 * Event ad creative – LinkedIn Ads Library style.
 * Event image, then row: time (accent), title, "Event by X", Online + View event button.
 */
type Props = {
  eventImageUrl: string | null;
  eventTitle: string | null;
  eventTimeDisplay: string | null;
  companyName: string | null;
  isOnline?: boolean;
  eventUrl: string | null;
};

export function EventAdPreview({
  eventImageUrl,
  eventTitle,
  eventTimeDisplay,
  companyName,
  isOnline = true,
  eventUrl,
}: Props) {
  const href = eventUrl ?? "#";
  const hasLink = href !== "#";

  return (
    <div className="flex flex-col mt-1.5">
      {eventImageUrl && hasLink && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-t border-border hover:no-underline focus:no-underline active:no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={eventImageUrl}
            alt={eventTitle ?? "Event"}
            className="object-cover block min-h-[80px] w-full"
          />
        </a>
      )}
      {eventImageUrl && !hasLink && (
        <div className="border-t border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={eventImageUrl}
            alt={eventTitle ?? "Event"}
            className="object-cover block min-h-[80px] w-full"
          />
        </div>
      )}

      <div className="flex gap-x-1.5 p-1.5 border-t border-border overflow-anywhere">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`grow min-w-0 hover:no-underline focus:no-underline active:no-underline ${!hasLink ? "pointer-events-none" : ""}`}
        >
          {eventTimeDisplay && (
            <time className="text-amber-600 dark:text-amber-500 text-xs leading-4 font-semibold block">
              {eventTimeDisplay}
            </time>
          )}
          {eventTitle && (
            <h2 className="text-foreground text-sm font-semibold leading-[18px] mt-1">
              {eventTitle}
            </h2>
          )}
          {companyName && (
            <h3 className="text-foreground text-xs leading-4 mt-0.5">
              Event by {companyName}
            </h3>
          )}
          {isOnline && (
            <div className="flex gap-0.5 items-center mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                className="w-3 h-3 text-muted-foreground shrink-0"
                aria-hidden
              >
                <path
                  fill="currentColor"
                  d="M3 3h8v10H3a2 2 0 01-2-2V5a2 2 0 012-2zm10.5 1l-1.5.75v6.5l1.5.75H15V4z"
                />
              </svg>
              <span className="text-foreground text-xs leading-4">Online</span>
            </div>
          )}
        </a>
        {hasLink && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 self-center px-4 py-1.5 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 no-underline max-w-[120px] text-center"
          >
            View event
          </a>
        )}
      </div>
    </div>
  );
}
