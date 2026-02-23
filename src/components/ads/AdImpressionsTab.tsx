"use client";

import { formatEstImpressionsShort } from "@/app/(dashboard)/explore/ad-card-utils";
import { CountryBreakdownBar, type CountryDataItem } from "./CountryBreakdownBar";

export type AdImpressionsData = {
  assumedImpressions: number | null;
  impressions: string | null;
  countryData: CountryDataItem[];
  /** Raw impressionsPerCountry for "<1%" display */
  impressionsPerCountry?: Array<{ country: string; impressions: string }> | null;
};

export function AdImpressionsTab({ ad }: { ad: AdImpressionsData }) {
  const hasTotal =
    ad.assumedImpressions != null && ad.assumedImpressions > 0;
  const hasCountryData = (ad.countryData?.length ?? 0) > 0;
  const hasData = hasTotal || hasCountryData;

  const rawPercentLabels: Record<string, string> = {};
  if (ad.impressionsPerCountry?.length) {
    for (const item of ad.impressionsPerCountry) {
      if (item?.country?.trim() && item?.impressions != null) {
        rawPercentLabels[item.country.trim()] = item.impressions;
      }
    }
  }

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground">
        Impression data not available for this ad. LinkedIn only provides
        impression estimates for ads shown in the EU.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
        Estimates based on LinkedIn Ads Library data (EU only).
      </p>
      {hasTotal && (
        <div>
          <div className="text-xs text-muted-foreground font-medium mb-1">
            Total Estimated Impressions
          </div>
          <div className="text-lg font-semibold">
            {formatEstImpressionsShort(ad.assumedImpressions!)}
          </div>
          {ad.impressions?.trim() && (
            <div className="text-sm text-muted-foreground">
              ({ad.impressions})
            </div>
          )}
        </div>
      )}
      {hasCountryData ? (
        <div>
          <div className="text-xs text-muted-foreground font-medium mb-2">
            Country breakdown
          </div>
          <CountryBreakdownBar
            items={ad.countryData}
            rawPercentLabels={Object.keys(rawPercentLabels).length ? rawPercentLabels : undefined}
            maxVisible={4}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No country breakdown available for this ad.
        </p>
      )}
    </div>
  );
}
