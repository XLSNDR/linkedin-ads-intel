"use client";

import {
  BarChart3,
  Building2,
  Calendar,
  Clock,
  Globe,
  Image,
  Link as LinkIcon,
  MapPin,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  FORMAT_LABELS,
  formatEstImpressionsShort,
} from "@/app/(dashboard)/explore/ad-card-utils";

export type AdDetailData = {
  assumedImpressions: number | null;
  impressions: string | null;
  startDate: string | null;
  endDate: string | null;
  format: string;
  advertiser: { id: string; name: string | null };
  targetLanguage: string | null;
  targetLocation: string | null;
  destinationUrl: string | null;
  paidBy: string | null;
  advertiserName: string | null;
};

function formatRuntimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const d = (s: string) => {
    const date = new Date(s);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  };
  const a = d(start);
  const b = d(end);
  if (!a || !b) return "—";
  return `${a} - ${b}`;
}

function formatDurationDays(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return "—";
  const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
  return `${days} days`;
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname.slice(0, 30);
    const more = u.pathname.length > 30 ? "…" : "";
    return `${u.hostname}${path}${more}`;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "…" : url;
  }
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2 border-b border-border/50 last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

export function AdDetailsTab({ ad }: { ad: AdDetailData }) {
  const duration = formatDurationDays(ad.startDate, ad.endDate);
  const runtime = formatRuntimeRange(ad.startDate, ad.endDate);
  const formatLabel = FORMAT_LABELS[ad.format] ?? ad.format.replace(/_/g, " ");
  const showPaidBy =
    ad.paidBy != null &&
    ad.paidBy.trim() !== "" &&
    ad.advertiserName != null &&
    ad.paidBy.trim().toLowerCase() !== ad.advertiserName.trim().toLowerCase();

  return (
    <div className="space-y-1">
      {ad.assumedImpressions != null && ad.assumedImpressions > 0 && (
        <Row
          icon={BarChart3}
          label="Est. Impressions"
          value={
            <span>
              <span>{formatEstImpressionsShort(ad.assumedImpressions)}</span>
              {ad.impressions?.trim() && (
                <span className="block text-xs text-muted-foreground font-normal">
                  ({ad.impressions})
                </span>
              )}
            </span>
          }
        />
      )}
      {duration !== "—" && (
        <Row icon={Clock} label="Duration" value={duration} />
      )}
      {runtime !== "—" && (
        <Row icon={Calendar} label="Runtime" value={runtime} />
      )}
      <Row icon={Image} label="Ad Format" value={formatLabel} />
      {ad.advertiser?.name && (
        <Row
          icon={Building2}
          label="Advertiser"
          value={
            <Link
              href={`/explore?advertisers=${ad.advertiser.id}`}
              className="text-primary hover:underline"
            >
              {ad.advertiser.name}
            </Link>
          }
        />
      )}
      {ad.targetLanguage?.trim() && (
        <Row icon={Globe} label="Target Language" value={ad.targetLanguage} />
      )}
      {ad.targetLocation?.trim() && (
        <Row icon={MapPin} label="Target Location" value={ad.targetLocation} />
      )}
      {ad.destinationUrl?.trim() && (
        <Row
          icon={LinkIcon}
          label="Destination URL"
          value={
            <a
              href={ad.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {truncateUrl(ad.destinationUrl)}
            </a>
          }
        />
      )}
      {showPaidBy && (
        <Row icon={Wallet} label="Paid By" value={ad.paidBy!} />
      )}
    </div>
  );
}
