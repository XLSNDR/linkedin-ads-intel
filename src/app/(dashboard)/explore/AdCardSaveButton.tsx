"use client";

/**
 * Save-to-collection button for ad cards. Visual only for now; will wire to collections API later.
 */
export function AdCardSaveButton({ adId }: { adId: string }) {
  return (
    <button
      type="button"
      data-ad-id={adId}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Save to collection (coming soon)"
      aria-label="Save to collection"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
      <span>Save</span>
    </button>
  );
}
