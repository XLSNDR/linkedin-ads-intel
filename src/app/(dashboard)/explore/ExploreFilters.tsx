"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface FilterOptions {
  advertisers: { id: string; name: string }[];
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
      router.push(`/explore?${next.toString()}`);
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

      {/* Advertiser (multiselect) */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground mb-2">
          Advertiser
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {options.advertisers.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleMulti("advertisers", advertisers, a.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                advertisers.includes(a.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {a.name}
            </button>
          ))}
          {options.advertisers.length === 0 && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      </div>

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
