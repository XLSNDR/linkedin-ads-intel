"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const FORMAT_LABELS: Record<string, string> = {
  single_image: "Single Image",
  video: "Video",
  carousel: "Carousel",
  document: "Document",
  event: "Event",
  conversation: "Conversation",
  text: "Text",
  spotlight: "Spotlight",
  linkedin_article: "Linkedin Article",
  LINKEDIN_ARTICLE: "Linkedin Article",
  SPONSORED_UPDATE_LINKEDIN_ARTICLE: "Linkedin Article",
  thought_leader_image: "Thought Leader (image)",
  thought_leader_video: "Thought Leader (video)",
  thought_leader_text: "Thought Leader (text)",
  other: "Other",
};

const FORMAT_ORDER = [
  "single_image",
  "video",
  "carousel",
  "document",
  "event",
  "conversation",
  "text",
  "spotlight",
  "linkedin_article",
  "LINKEDIN_ARTICLE",
  "SPONSORED_UPDATE_LINKEDIN_ARTICLE",
  "thought_leader_image",
  "thought_leader_video",
  "thought_leader_text",
  "other",
];

export function ExploreToolbar({
  sort,
  formatFilter,
  formatCounts,
}: {
  sort: string;
  formatFilter: string;
  formatCounts: { format: string; count: number }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildUrl(updates: { sort?: string; format?: string }) {
    const next = new URLSearchParams(searchParams.toString());
    if (updates.sort !== undefined) next.set("sort", updates.sort);
    if (updates.format !== undefined) {
      if (updates.format) next.set("format", updates.format);
      else next.delete("format");
    }
    return `/explore?${next.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by</span>
        <select
          value={sort}
          onChange={(e) => router.push(buildUrl({ sort: e.target.value }))}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="date">Date (newest)</option>
          <option value="impressions">Impressions (highest)</option>
          <option value="runtime">Runtime (longest)</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Format</span>
        <select
          value={formatFilter}
          onChange={(e) =>
            router.push(buildUrl({ format: e.target.value }))
          }
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All</option>
          {[...formatCounts]
            .sort(
              (a, b) =>
                FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format)
            )
            .map(({ format, count }) => (
              <option key={format} value={format}>
                {FORMAT_LABELS[format] ?? format} ({count})
              </option>
            ))}
        </select>
      </label>
      {(sort !== "date" || formatFilter) && (
        <Link
          href="/explore"
          className="text-sm text-muted-foreground hover:underline"
        >
          Clear
        </Link>
      )}
    </div>
  );
}
