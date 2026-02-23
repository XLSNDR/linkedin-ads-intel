"use client";

import * as React from "react";
import { formatEstImpressionsShort } from "@/app/(dashboard)/explore/ad-card-utils";

export type CountryDataItem = {
  country: string;
  percentage: number;
  estimatedImpressions: number;
};

/** Raw impressions string from API (e.g. "90%" or "<1%") for display. */
type Props = {
  items: CountryDataItem[];
  /** Raw percentage string per country from impressionsPerCountry (e.g. "90%", "<1%") for display */
  rawPercentLabels?: Record<string, string>;
  maxVisible?: number;
};

const DEFAULT_MAX = 4;

export function CountryBreakdownBar({
  items,
  rawPercentLabels = {},
  maxVisible = DEFAULT_MAX,
}: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible && !expanded;

  const maxPct = Math.max(...items.map((i) => i.percentage), 1);

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <div
          key={item.country}
          className="grid gap-3 sm:gap-4 items-center text-sm"
          style={{ gridTemplateColumns: "minmax(120px, 1fr) minmax(100px, 180px) 72px 88px" }}
        >
          <span className="font-medium truncate text-left">{item.country}</span>
          <div className="min-w-0 h-5 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary/70 rounded min-w-[2px]"
              style={{ width: `${Math.max((item.percentage / maxPct) * 100, 2)}%` }}
            />
          </div>
          <span className="text-muted-foreground tabular-nums text-left">
            {rawPercentLabels[item.country] ?? `${item.percentage}%`}
          </span>
          <span className="text-muted-foreground tabular-nums text-left">
            {formatEstImpressionsShort(item.estimatedImpressions)}
          </span>
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-primary hover:underline"
        >
          Show more
        </button>
      )}
    </div>
  );
}
