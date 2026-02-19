"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

export function ExploreSearchSort({
  sort,
  hasCountryFilter,
}: {
  sort: string;
  hasCountryFilter: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const searchMode = searchParams.get("searchMode") ?? "keyword";

  const [inputValue, setInputValue] = useState(search);
  useEffect(() => {
    setInputValue(search);
  }, [search]);

  const applySearch = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (inputValue.trim()) {
      next.set("search", inputValue.trim());
      next.set("searchMode", searchMode);
    } else {
      next.delete("search");
      next.delete("searchMode");
    }
    router.push(`/explore?${next.toString()}`);
  }, [inputValue, searchMode, router, searchParams]);

  const setSort = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("sort", value);
      router.push(`/explore?${next.toString()}`);
    },
    [router, searchParams]
  );

  const placeholder =
    searchMode === "url"
      ? "Search by URL (e.g. linkedin.com/...)"
      : "Search ads by meaning... (e.g. fitness products)";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-1 min-w-[200px] max-w-xl items-center gap-2">
        <select
          value={searchMode}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("searchMode", e.target.value);
            router.push(`/explore?${next.toString()}`);
          }}
          className="rounded-md border border-input bg-background px-2 py-2 text-sm shrink-0"
          aria-label="Search mode"
        >
          <option value="keyword">By keyword</option>
          <option value="url">By URL</option>
        </select>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
          placeholder={placeholder}
          className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="Search ads"
        />
        <button
          type="button"
          onClick={applySearch}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm shrink-0">
        <span className="text-muted-foreground">Sort by</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="date">Date (newest)</option>
          <option value="impressions">
            {hasCountryFilter ? "Impressions (in selected country)" : "Impressions (highest)"}
          </option>
          <option value="runtime">Runtime (longest)</option>
        </select>
      </label>
    </div>
  );
}
