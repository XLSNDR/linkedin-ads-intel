"use client";

import { useAdDetailModal } from "./AdDetailModalContext";

type Props = {
  adId: string;
  children: React.ReactNode;
};

/**
 * Wraps an ad card so clicking it (except on links/buttons) opens the ad detail modal.
 */
export function AdCardClickWrapper({ adId, children }: Props) {
  const { openAdDetail } = useAdDetailModal();

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't open modal when user clicked a link or button (e.g. Save, View details)
    if (target.closest("a") || target.closest("button")) {
      return;
    }
    openAdDetail(adId);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openAdDetail(adId);
        }
      }}
      className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      {children}
    </div>
  );
}
