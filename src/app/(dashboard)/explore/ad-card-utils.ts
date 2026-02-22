/**
 * Shared helpers for ad cards (Explore and Collection detail).
 */

export const FORMAT_LABELS: Record<string, string> = {
  SINGLE_IMAGE: "Single Image",
  CAROUSEL: "Carousel",
  VIDEO: "Video",
  MESSAGE: "Message",
  TEXT: "Text",
  DOCUMENT: "Document",
  EVENT: "Event",
  SPOTLIGHT: "Spotlight",
  FOLLOW_COMPANY: "Follow Company",
  LINKEDIN_ARTICLE: "Linkedin Article",
  SPONSORED_UPDATE_LINKEDIN_ARTICLE: "Linkedin Article",
  JOB: "Job",
  JOBS_V2: "Job",
  job: "Job",
  jobs_v2: "Job",
  single_image: "Single Image",
  linkedin_article: "Linkedin Article",
  video: "Video",
  carousel: "Carousel",
  document: "Document",
  event: "Event",
  conversation: "Conversation",
  text: "Text",
  spotlight: "Spotlight",
  thought_leader_image: "Thought Leader (image)",
  thought_leader_video: "Thought Leader (video)",
  thought_leader_text: "Thought Leader (text)",
  other: "Other",
};

export function formatAdLaunchDate(date: Date | null | undefined): string {
  if (!date || typeof date.getTime !== "function" || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatEventTimeRange(
  start: Date | null | undefined,
  end: Date | null | undefined
): string | null {
  if (!start || typeof start.getTime !== "function" || Number.isNaN(start.getTime())) return null;
  const startStr = start.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!end || typeof end.getTime !== "function" || Number.isNaN(end.getTime())) return startStr;
  const endStr = end.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr} - ${endStr}`;
}

export function formatEstImpressions(n: number): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

export function impressionsToNumber(impressions: string | null): number {
  if (!impressions || !impressions.trim()) return 0;
  const lower = impressions.toLowerCase().replace(/\s/g, "");
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

export function getAdEstImpressions(
  ad: {
    countryImpressionsEstimate: unknown;
    impressionsEstimate: number | null;
    impressions: string | null;
  },
  selectedCountries: string[],
  impressionsToNumberFn: (s: string | null) => number
): number {
  if (selectedCountries.length > 0) {
    const byCountry = ad.countryImpressionsEstimate as Record<string, number> | null;
    if (byCountry && typeof byCountry === "object") {
      let sum = 0;
      for (const c of selectedCountries) {
        const v = byCountry[c];
        if (typeof v === "number") sum += v;
      }
      if (sum > 0) return sum;
    }
  }
  if (selectedCountries.length === 0) {
    return ad.impressionsEstimate ?? impressionsToNumberFn(ad.impressions);
  }
  return 0;
}
