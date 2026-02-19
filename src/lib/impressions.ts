/**
 * Impression parsing and per-country estimates for filtering/sorting.
 * Apify gives: impressions (e.g. "10k-20k") and impressionsPerCountry (e.g. [{ country: "Netherlands", impressions: "90%" }]).
 * We convert to: total midpoint (15000) and per-country estimates (e.g. { Netherlands: 13500, Belgium: 1500 }).
 */

/** Parse range string (e.g. "10k-20k", "200k-500k") to midpoint number. */
export function parseImpressionsRangeToMidpoint(impressions: string | null): number {
  if (!impressions || !impressions.trim()) return 0;
  const lower = impressions.toLowerCase().replace(/\s/g, "").replace(/[\u200a\u200b\u00a0]/g, "");
  const rangeMatch = lower.match(/(\d+)(k|m)?\s*[-–]\s*(\d+)(k|m)?/);
  if (rangeMatch) {
    const mul = (s: string | undefined) => (s === "m" ? 1_000_000 : s === "k" ? 1000 : 1);
    const a = parseInt(rangeMatch[1], 10) * mul(rangeMatch[2]);
    const b = parseInt(rangeMatch[3], 10) * mul(rangeMatch[4]);
    return Math.round((a + b) / 2);
  }
  const single = lower.match(/(\d+)(k|m)?/);
  if (single) {
    const n = parseInt(single[1], 10);
    return single[2] === "m" ? n * 1_000_000 : single[2] === "k" ? n * 1000 : n;
  }
  return 0;
}

/** Parse percentage string (e.g. "90%", "10%") to fraction 0..1. */
export function parsePercent(pct: string | null | undefined): number {
  if (pct == null || typeof pct !== "string") return 0;
  const m = pct.trim().match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 100) return 0;
  return n / 100;
}

export interface CountryImpressionsItem {
  country: string;
  impressions: string; // e.g. "90%" or raw number
}

/**
 * Compute estimated impressions per country from total midpoint and percentages.
 * impressionsPerCountry[i].impressions is typically a percentage like "90%".
 */
export function computeCountryImpressionsEstimate(
  totalMidpoint: number,
  impressionsPerCountry: CountryImpressionsItem[] | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!impressionsPerCountry?.length || totalMidpoint <= 0) return out;
  for (const item of impressionsPerCountry) {
    const country = item?.country?.trim();
    if (!country) continue;
    const fraction = parsePercent(item.impressions);
    out[country] = Math.round(totalMidpoint * fraction);
  }
  return out;
}
