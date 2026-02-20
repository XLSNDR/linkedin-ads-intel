"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ExploreFollowBanner({
  userAdvertiserId,
  advertiserName,
}: {
  userAdvertiserId: string;
  advertiserName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFollow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/advertisers/${userAdvertiserId}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm"
      role="region"
      aria-label="Follow advertiser"
    >
      <span className="text-muted-foreground">
        Follow <strong className="text-foreground">{advertiserName}</strong> to get recurring ad updates.
      </span>
      <Button size="sm" onClick={handleFollow} disabled={loading}>
        {loading ? "Following…" : "Follow"}
      </Button>
    </div>
  );
}
