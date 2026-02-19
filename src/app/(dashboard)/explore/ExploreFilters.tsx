"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";

export interface FilterOptions {
  advertisers: { id: string; name: string; logoUrl: string | null }[];
  formats: { format: string; count: number }[];
  formatLabels: Record<string, string>;
  countries: string[];
  languages: string[];
  ctas: string[];
}

const PROMOTED_BY_OPTIONS = [
  { value: "company", label: "Company page" },
  { value: "thought_leader", label: "Thought leader" },
];

function AdvertiserFilter({
  advertisers,
  selectedIds,
  onSelectionChange,
}: {
  advertisers: FilterOptions["advertisers"];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = advertisers.filter(
    (a) =>
      !selectedIds.includes(a.id) &&
      a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const selectedAdvertisers = advertisers.filter((a) => selectedIds.includes(a.id));

  const add = (id: string) => {
    onSelectionChange([...selectedIds, id]);
    setSearchQuery("");
  };
  const remove = (id: string) => {
    const next = selectedIds.filter((x) => x !== id);
    onSelectionChange(next);
  };

  return (
    <div ref={containerRef} className="relative">
      <h3 className="text-xs font-medium text-muted-foreground mb-2">
        Advertiser
      </h3>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Search for advertiser..."
          className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
          aria-label="Search for advertiser"
        />
      </div>
      {dropdownOpen && (
        <ul
          className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-56 overflow-auto"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
          ) : (
            filtered.map((a) => (
              <li key={a.id} role="option" aria-selected="false">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 focus:bg-muted/80"
                  onClick={() => add(a.id)}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {a.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={a.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{a.name.charAt(0)}</span>
                    )}
                  </span>
                  <span className="truncate">{a.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {selectedAdvertisers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedAdvertisers.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background">
                {a.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={a.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground">{a.name.charAt(0)}</span>
                )}
              </span>
              <span className="truncate max-w-[120px]">{a.name}</span>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="ml-0.5 -mr-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${a.name}`}
              >
                <span aria-hidden>×</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function getParam(params: URLSearchParams, key: string): string[] {
  const v = params.get(key);
  if (!v?.trim()) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function setParam(params: URLSearchParams, key: string, values: string[]) {
  if (values.length) params.set(key, values.join(","));
  else params.delete(key);
}

export function ExploreFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const advertisers = getParam(searchParams, "advertisers");
  const formats = getParam(searchParams, "formats");
  const promotedBy = getParam(searchParams, "promotedBy");
  const status = searchParams.get("status") ?? "";
  const minImpressions = searchParams.get("minImpressions") ?? "";
  const countries = getParam(searchParams, "countries");
  const languages = getParam(searchParams, "languages");
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const ctas = getParam(searchParams, "ctas");

  const update = useCallback(
    (updates: Record<string, string | string[]>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (Array.isArray(v)) setParam(next, k, v);
        else if (v != null && v !== "") next.set(k, v);
        else next.delete(k);
      }
      const query = next.toString();
      router.push(query ? `/explore?${query}` : "/explore");
    },
    [router, searchParams]
  );

  const toggleMulti = (key: string, current: string[], value: string) => {
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value];
    update({ [key]: next });
  };

  const clearAll = () => router.push("/explore");

  const hasAny =
    advertisers.length > 0 ||
    formats.length > 0 ||
    promotedBy.length > 0 ||
    status !== "" ||
    minImpressions !== "" ||
    countries.length > 0 ||
    languages.length > 0 ||
    startDate !== "" ||
    endDate !== "" ||
    ctas.length > 0;

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-muted/30 p-4 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Advertiser: search + dropdown + pills */}
      <AdvertiserFilter
        advertisers={options.advertisers}
        selectedIds={advertisers}
        onSelectionChange={(ids) => update({ advertisers: ids })}
      />

      {/* Ad Format (multiselect) */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Ad Format
        </h3>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {options.formats.map((f) => (
            <label key={f.format} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formats.includes(f.format)}
                onChange={() => toggleMulti("formats", formats, f.format)}
                className="rounded border-input"
              />
              <span>
                {options.formatLabels[f.format] ?? f.format} ({f.count})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Promoted by (placeholder – no backend yet) */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Promoted by
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          Coming soon (data not yet in Apify).
        </p>
        <div className="space-y-1.5">
          {PROMOTED_BY_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer opacity-60">
              <input type="checkbox" disabled className="rounded border-input" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Status
        </h3>
        <div className="flex gap-2">
          {(["", "active", "stopped"] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => update({ status: s })}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                status === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {s === "" ? "All" : s === "active" ? "Active" : "Stopped"}
            </button>
          ))}
        </div>
      </div>

      {/* Min. Est. Impressions */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Min. Est. Impressions
        </h3>
        <input
          type="number"
          min={0}
          value={minImpressions}
          onChange={(e) =>
            update({ minImpressions: e.target.value.replace(/\D/g, "") })
          }
          placeholder="e.g. 1000"
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
      </div>

      {/* Country (multiselect) */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Country
        </h3>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {options.countries.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleMulti("countries", countries, c)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                countries.includes(c) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {c}
            </button>
          ))}
          {options.countries.length === 0 && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      </div>

      {/* Language (multiselect) */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Language
        </h3>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {options.languages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggleMulti("languages", languages, lang)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                languages.includes(lang) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {lang}
            </button>
          ))}
          {options.languages.length === 0 && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      </div>

      {/* Daterange */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Date range (ads running in period)
        </h3>
        <div className="space-y-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* CTA (multiselect) */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          CTA
        </h3>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {options.ctas.map((cta) => (
            <button
              key={cta}
              type="button"
              onClick={() => toggleMulti("ctas", ctas, cta)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                ctas.includes(cta) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {cta}
            </button>
          ))}
          {options.ctas.length === 0 && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      </div>
    </aside>
  );
}
