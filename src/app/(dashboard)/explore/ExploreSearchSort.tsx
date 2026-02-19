"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: string): { start: string; end: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case "last30": {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { start: toYYYYMMDD(start), end: toYYYYMMDD(today) };
    }
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
    }
    case "thisYear": {
      return {
        start: `${today.getFullYear()}-01-01`,
        end: toYYYYMMDD(today),
      };
    }
    case "lastYear": {
      const y = today.getFullYear() - 1;
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    default:
      return null;
  }
}

function matchPreset(start: string, end: string): string {
  if (!start || !end) return "";
  const ranges: Array<{ key: string; get: () => { start: string; end: string } | null }> = [
    { key: "last30", get: () => getPresetRange("last30") },
    { key: "thisMonth", get: () => getPresetRange("thisMonth") },
    { key: "thisYear", get: () => getPresetRange("thisYear") },
    { key: "lastYear", get: () => getPresetRange("lastYear") },
  ];
  for (const { key, get } of ranges) {
    const r = get();
    if (r && r.start === start && r.end === end) return key;
  }
  return "";
}

export function ExploreSearchSort({
  sort,
  hasCountryFilter,
}: {
  sort: string;
  hasCountryFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const searchMode = searchParams.get("searchMode") ?? "keyword";
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";

  const [inputValue, setInputValue] = useState(search);
  const [dateOpen, setDateOpen] = useState(false);
  const [datePreset, setDatePreset] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dateResetClicked, setDateResetClicked] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(search);
  }, [search]);

  useEffect(() => {
    if (dateOpen) {
      const preset = matchPreset(startDateParam, endDateParam);
      setDatePreset(preset || "custom");
      setCustomStart(preset ? "" : startDateParam);
      setCustomEnd(preset ? "" : endDateParam);
      setDateResetClicked(false);
    }
  }, [dateOpen, startDateParam, endDateParam]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
    }
    if (dateOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dateOpen]);

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

  const applyDate = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (datePreset === "custom") {
      if (customStart && customEnd) {
        next.set("startDate", customStart);
        next.set("endDate", customEnd);
      } else {
        next.delete("startDate");
        next.delete("endDate");
      }
    } else if (datePreset) {
      const r = getPresetRange(datePreset);
      if (r) {
        next.set("startDate", r.start);
        next.set("endDate", r.end);
      }
    } else {
      next.delete("startDate");
      next.delete("endDate");
    }
    // Reset to page 1 when date changes so we don't land on an invalid page (e.g. page 3 with fewer results)
    if (next.get("page")) next.set("page", "1");
    setDateOpen(false);
    const q = next.toString();
    const target = q ? `/explore?${q}` : "/explore";
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (target !== current) {
      router.push(target);
    }
  }, [datePreset, customStart, customEnd, router, searchParams, pathname]);

  const placeholder =
    searchMode === "url"
      ? "Search by URL (e.g. linkedin.com/...)"
      : "Search ads by meaning... (e.g. fitness products)";

  const hasDateFilter = startDateParam !== "" || endDateParam !== "";

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

      <div className="relative shrink-0" ref={dateRef}>
        <button
          type="button"
          onClick={() => setDateOpen((o) => !o)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
            hasDateFilter
              ? "border-primary bg-primary/10 text-primary"
              : "border-input bg-background hover:bg-muted/80"
          }`}
          aria-expanded={dateOpen}
          aria-haspopup="dialog"
        >
          Date
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {dateOpen && (
          <div
            role="dialog"
            aria-label="Select date range"
            className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-popover p-4 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDateOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="datePreset"
                  checked={datePreset === "last30"}
                  onChange={() => setDatePreset("last30")}
                  className="text-primary"
                />
                Last 30 days
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="datePreset"
                  checked={datePreset === "thisMonth"}
                  onChange={() => setDatePreset("thisMonth")}
                  className="text-primary"
                />
                This month
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="datePreset"
                  checked={datePreset === "thisYear"}
                  onChange={() => setDatePreset("thisYear")}
                  className="text-primary"
                />
                This year
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="datePreset"
                  checked={datePreset === "lastYear"}
                  onChange={() => setDatePreset("lastYear")}
                  className="text-primary"
                />
                Last year
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="datePreset"
                  checked={datePreset === "custom"}
                  onChange={() => setDatePreset("custom")}
                  className="text-primary"
                />
                Select date range
              </label>

              {datePreset === "custom" && (
                <div className="space-y-2 pl-6">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Start date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">End date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (dateResetClicked) {
                    const preset = matchPreset(startDateParam, endDateParam);
                    setDatePreset(preset || "custom");
                    setCustomStart(preset ? "" : startDateParam);
                    setCustomEnd(preset ? "" : endDateParam);
                    setDateResetClicked(false);
                  } else {
                    setDatePreset("");
                    setCustomStart("");
                    setCustomEnd("");
                    setDateResetClicked(true);
                  }
                }}
                className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted/80"
              >
                {dateResetClicked ? "Cancel" : "Reset"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  applyDate();
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
