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

const CHEVRON_DOWN = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const CHEVRON_UP = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

function FilterSection({
  id,
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-controls={`filter-${id}`}
        id={`filter-heading-${id}`}
      >
        <span className="flex items-center gap-2">
          {icon ?? null}
          <span>{title}</span>
        </span>
        <span className="shrink-0 text-foreground/70">{open ? CHEVRON_UP : CHEVRON_DOWN}</span>
      </button>
      <div
        id={`filter-${id}`}
        role="region"
        aria-labelledby={`filter-heading-${id}`}
        hidden={!open}
        className={open ? "mt-2" : "sr-only"}
      >
        {children}
      </div>
    </div>
  );
}

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
    setDropdownOpen(false);
  };
  const remove = (id: string) => {
    const next = selectedIds.filter((x) => x !== id);
    onSelectionChange(next);
  };

  return (
    <div ref={containerRef} className="relative">
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

function CountryFilter({
  countries: countryOptions,
  selected,
  onSelectionChange,
}: {
  countries: string[];
  selected: string[];
  onSelectionChange: (countries: string[]) => void;
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

  const q = searchQuery.trim().toLowerCase();
  const filtered = countryOptions.filter(
    (c) => !selected.includes(c) && c.toLowerCase().includes(q)
  );

  const add = (country: string) => {
    onSelectionChange([...selected, country]);
    setSearchQuery("");
    setDropdownOpen(false);
  };
  const remove = (country: string) => {
    onSelectionChange(selected.filter((x) => x !== country));
  };

  return (
    <div ref={containerRef} className="relative">
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
          placeholder="Search for country..."
          className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
          aria-label="Search for country"
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
            filtered.map((c) => (
              <li key={c} role="option" aria-selected="false">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 focus:bg-muted/80"
                  onClick={() => add(c)}
                >
                  <span className="truncate">{c}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              <span className="truncate max-w-[120px]">{c}</span>
              <button
                type="button"
                onClick={() => remove(c)}
                className="ml-0.5 -mr-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${c}`}
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

function LanguageFilter({
  languages: languageOptions,
  selected,
  onSelectionChange,
}: {
  languages: string[];
  selected: string[];
  onSelectionChange: (languages: string[]) => void;
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

  const q = searchQuery.trim().toLowerCase();
  const filtered = languageOptions.filter(
    (lang) => !selected.includes(lang) && lang.toLowerCase().includes(q)
  );

  const add = (lang: string) => {
    onSelectionChange([...selected, lang]);
    setSearchQuery("");
    setDropdownOpen(false);
  };
  const remove = (lang: string) => {
    onSelectionChange(selected.filter((x) => x !== lang));
  };

  return (
    <div ref={containerRef} className="relative">
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
          placeholder="Search for language..."
          className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
          aria-label="Search for language"
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
            filtered.map((lang) => (
              <li key={lang} role="option" aria-selected="false">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 focus:bg-muted/80"
                  onClick={() => add(lang)}
                >
                  <span className="truncate">{lang}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              <span className="truncate max-w-[120px]">{lang}</span>
              <button
                type="button"
                onClick={() => remove(lang)}
                className="ml-0.5 -mr-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${lang}`}
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

function CtaFilter({
  ctas: ctaOptions,
  selected,
  onSelectionChange,
}: {
  ctas: string[];
  selected: string[];
  onSelectionChange: (ctas: string[]) => void;
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

  const q = searchQuery.trim().toLowerCase();
  const filtered = [...ctaOptions.filter(
    (cta) => !selected.includes(cta) && cta.toLowerCase().includes(q)
  )].sort((a, b) => a.localeCompare(b));

  const add = (cta: string) => {
    onSelectionChange([...selected, cta]);
    setSearchQuery("");
    setDropdownOpen(false);
  };
  const remove = (cta: string) => {
    onSelectionChange(selected.filter((x) => x !== cta));
  };

  return (
    <div ref={containerRef} className="relative">
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
          placeholder="Search for CTA..."
          className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
          aria-label="Search for CTA"
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
            filtered.map((cta) => (
              <li key={cta} role="option" aria-selected="false">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 focus:bg-muted/80"
                  onClick={() => add(cta)}
                >
                  <span className="truncate">{cta}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((cta) => (
            <span
              key={cta}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              <span className="truncate max-w-[120px]">{cta}</span>
              <button
                type="button"
                onClick={() => remove(cta)}
                className="ml-0.5 -mr-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${cta}`}
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

type SectionId =
  | "advertiser"
  | "format"
  | "promotedBy"
  | "minImpressions"
  | "country"
  | "language"
  | "cta";

export function ExploreFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sectionOpen, setSectionOpen] = useState<Partial<Record<SectionId, boolean>>>({});

  const safeOptions = {
    advertisers: options.advertisers ?? [],
    formats: options.formats ?? [],
    countries: Array.isArray(options.countries) ? options.countries : [],
    languages: Array.isArray(options.languages) ? options.languages : [],
    ctas: Array.isArray(options.ctas) ? options.ctas : [],
    formatLabels: options.formatLabels ?? {},
  };

  const advertisers = getParam(searchParams, "advertisers");
  const formats = getParam(searchParams, "formats");
  const promotedBy = getParam(searchParams, "promotedBy");
  const minImpressions = searchParams.get("minImpressions") ?? "";
  const [minImpressionsInput, setMinImpressionsInput] = useState(minImpressions);
  const countries = getParam(searchParams, "countries");
  const languages = getParam(searchParams, "languages");
  const ctas = getParam(searchParams, "ctas");

  const hasValue: Record<SectionId, boolean> = {
    advertiser: advertisers.length > 0,
    format: formats.length > 0,
    promotedBy: promotedBy.length > 0,
    minImpressions: minImpressions !== "",
    country: countries.length > 0,
    language: languages.length > 0,
    cta: ctas.length > 0,
  };

  function isSectionOpen(id: SectionId) {
    return sectionOpen[id] ?? (id === "advertiser" || hasValue[id]);
  }

  function toggleSection(id: SectionId) {
    const current = isSectionOpen(id);
    setSectionOpen((prev) => ({ ...prev, [id]: !current }));
  }

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

  // Keep local min-impressions input in sync with URL (e.g. after Clear all or external nav)
  useEffect(() => {
    setMinImpressionsInput(minImpressions);
  }, [minImpressions]);

  const hasAny =
    advertisers.length > 0 ||
    formats.length > 0 ||
    promotedBy.length > 0 ||
    minImpressions !== "" ||
    countries.length > 0 ||
    languages.length > 0 ||
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

      {/* Advertiser: search + dropdown + pills (at top) */}
      <FilterSection
        id="advertiser"
        title="Advertiser"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        }
        open={isSectionOpen("advertiser")}
        onToggle={() => toggleSection("advertiser")}
      >
        <AdvertiserFilter
          advertisers={safeOptions.advertisers}
          selectedIds={advertisers}
          onSelectionChange={(ids) => update({ advertisers: ids })}
        />
      </FilterSection>

      {/* Ad Format (multiselect) */}
      <FilterSection
        id="format"
        title="Ad Format"
        open={isSectionOpen("format")}
        onToggle={() => toggleSection("format")}
      >
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {safeOptions.formats.map((f) => (
            <label key={f.format} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formats.includes(f.format)}
                onChange={() => toggleMulti("formats", formats, f.format)}
                className="rounded border-input"
              />
              <span>
                {safeOptions.formatLabels[f.format] ?? f.format} ({f.count})
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Min. Est. Impressions: type in input, then click Filter to apply (avoids URL update on every keystroke) */}
      <FilterSection
        id="minImpressions"
        title="Min. Est. Impressions"
        open={isSectionOpen("minImpressions")}
        onToggle={() => toggleSection("minImpressions")}
      >
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={minImpressionsInput}
            onChange={(e) =>
              setMinImpressionsInput(e.target.value.replace(/\D/g, ""))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                update({
                  minImpressions: minImpressionsInput.trim(),
                });
              }
            }}
            placeholder="e.g. 1000"
            className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            aria-label="Min. Est. Impressions"
          />
          <button
            type="button"
            onClick={() =>
              update({
                minImpressions: minImpressionsInput.trim(),
              })
            }
            className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Filter
          </button>
        </div>
      </FilterSection>

      {/* Country: search + dropdown + pills (same UX as Advertiser) */}
      <FilterSection
        id="country"
        title="Country"
        open={isSectionOpen("country")}
        onToggle={() => toggleSection("country")}
      >
        <CountryFilter
          countries={safeOptions.countries}
          selected={countries}
          onSelectionChange={(ids) => update({ countries: ids })}
        />
      </FilterSection>

      {/* Language: search + dropdown + pills */}
      <FilterSection
        id="language"
        title="Language"
        open={isSectionOpen("language")}
        onToggle={() => toggleSection("language")}
      >
        <LanguageFilter
          languages={safeOptions.languages}
          selected={languages}
          onSelectionChange={(ids) => update({ languages: ids })}
        />
      </FilterSection>

      {/* CTA: search + dropdown + pills */}
      <FilterSection
        id="cta"
        title="CTA"
        open={isSectionOpen("cta")}
        onToggle={() => toggleSection("cta")}
      >
        <CtaFilter
          ctas={safeOptions.ctas}
          selected={ctas}
          onSelectionChange={(ids) => update({ ctas: ids })}
        />
      </FilterSection>

      {/* Promoted by (placeholder – no backend yet, keep at very bottom) */}
      <FilterSection
        id="promotedBy"
        title="Promoted by"
        open={isSectionOpen("promotedBy")}
        onToggle={() => toggleSection("promotedBy")}
      >
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
      </FilterSection>
    </aside>
  );
}
