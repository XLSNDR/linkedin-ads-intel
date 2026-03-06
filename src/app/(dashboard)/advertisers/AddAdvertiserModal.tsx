"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(s: string): boolean {
  if (!s.trim()) return false;
  if (!YYYY_MM_DD.test(s.trim())) return false;
  return !Number.isNaN(new Date(s.trim()).getTime());
}

export function AddAdvertiserModal({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}) {
  const router = useRouter();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scraper, setScraper] = useState<"apify" | "scrapecreators">("apify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setScraper(data.linkedinScraper === "scrapecreators" ? "scrapecreators" : "apify");
      })
      .catch(() => setScraper("apify"));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body: { linkedinUrl: string; startDate?: string; endDate?: string } = {
      linkedinUrl: linkedinUrl.trim(),
    };
    if (scraper === "scrapecreators") {
      if (startDate.trim() && isValidDate(startDate)) body.startDate = startDate.trim();
      if (endDate.trim() && isValidDate(endDate)) body.endDate = endDate.trim();
    }
    try {
      const res = await fetch("/api/advertisers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      onOpenChange(false);
      setLinkedinUrl("");
      setStartDate("");
      setEndDate("");
      onAdded?.();
      const advertiserId = data.advertiser?.id;
      if (advertiserId) {
        router.push(`/explore?advertiser=${advertiserId}`);
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add advertiser</DialogTitle>
          <DialogDescription>
            Enter a LinkedIn company page URL (e.g. linkedin.com/company/hubspot).
            We&apos;ll scrape their ads once and add them to your list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="linkedin-url" className="text-sm font-medium">
                LinkedIn company URL
              </label>
              <Input
                id="linkedin-url"
                type="url"
                placeholder="https://www.linkedin.com/company/example/"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            {scraper === "scrapecreators" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label htmlFor="start-date" className="text-sm font-medium">
                    Start date (optional)
                  </label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">YYYY-MM-DD. Limits ads to this range (saves credits).</p>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="end-date" className="text-sm font-medium">
                    End date (optional)
                  </label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !linkedinUrl.trim()}>
              {loading ? "Adding…" : "Add advertiser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
