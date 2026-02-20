"use client";

import { useState } from "react";

/** MediaData for document ads: documentUrl (PDF) and/or imageUrls (per-page preview images) */
type DocumentMediaData = {
  documentUrl?: string | null;
  imageUrls?: string[];
};

type Props = {
  mediaData: unknown;
  mediaUrl: string | null;
};

/**
 * Document ad creative: LinkedIn Ads Library style.
 * - If we have multiple page images (imageUrls), show a swipeable page carousel.
 * - Else if we have a PDF (documentUrl), embed it in an iframe.
 * - Else fallback to a single image (mediaUrl).
 */
export function DocumentAdPreview({ mediaData, mediaUrl }: Props) {
  const data = mediaData as DocumentMediaData | null;
  const documentUrl = data?.documentUrl ?? null;
  const imageUrls = Array.isArray(data?.imageUrls) ? data.imageUrls.filter(Boolean) : [];
  const hasPageImages = imageUrls.length > 0;
  const hasPdf = documentUrl && documentUrl.trim().length > 0;

  const [page, setPage] = useState(0);

  // LinkedIn-style container: portrait aspect (padding-top 129.41% ≈ document proportions)
  const containerClass =
    "relative w-full overflow-hidden rounded-b-md border-t border-border bg-muted";
  const aspectStyle = { paddingTop: "129.41%" as const };
  const innerClass = "absolute inset-0 flex flex-col";

  if (hasPageImages) {
    const total = imageUrls.length;
    const current = Math.min(page, total - 1);
    return (
      <div className={containerClass} style={aspectStyle}>
        <div className={innerClass}>
          <div className="relative flex-1 min-h-0 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrls[current]}
              alt={`Page ${current + 1} of ${total}`}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
          {total > 1 && (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-background/80 border-t border-border">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={current <= 0}
                className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Previous page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span className="text-xs text-muted-foreground">
                Page {current + 1} of {total}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
                disabled={current >= total - 1}
                className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Next page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (hasPdf) {
    return (
      <div className={containerClass} style={aspectStyle}>
        <div className={innerClass}>
          <iframe
            src={documentUrl}
            title="Document preview"
            className="w-full h-full rounded-b-md border-0"
          />
        </div>
      </div>
    );
  }

  // Fallback: single image (e.g. first page from mediaUrl)
  if (mediaUrl) {
    return (
      <div className={containerClass} style={aspectStyle}>
        <div className={innerClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt="Document"
            className="w-full h-full object-contain bg-muted"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass} style={aspectStyle}>
      <div className={`${innerClass} items-center justify-center text-muted-foreground text-sm`}>
        No document preview
      </div>
    </div>
  );
}
