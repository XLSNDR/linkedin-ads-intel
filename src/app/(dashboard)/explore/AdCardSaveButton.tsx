"use client";

import { useSaveToCollection } from "@/components/collections/SaveToCollectionContext";

type Props = {
  adId: string;
  isSaved?: boolean;
};

/**
 * Save-to-collection button for ad cards. Opens SaveToCollection modal.
 * Filled heart when ad is in ≥1 collection.
 */
export function AdCardSaveButton({ adId, isSaved = false }: Props) {
  const { openSaveModal } = useSaveToCollection();

  return (
    <button
      type="button"
      data-ad-id={adId}
      onClick={() => openSaveModal(adId)}
      className="flex items-center gap-1 text-xs transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
      title={isSaved ? "Saved to collection (click to edit)" : "Save to collection"}
      aria-label={isSaved ? "Saved to collection" : "Save to collection"}
      style={{ color: isSaved ? "var(--destructive, #dc2626)" : "currentColor" }}
    >
      {isSaved ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
      ) : (
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
      )}
      <span>{isSaved ? "Saved" : "Save"}</span>
    </button>
  );
}
