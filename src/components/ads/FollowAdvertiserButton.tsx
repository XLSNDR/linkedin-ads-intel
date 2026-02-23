"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Props = {
  userAdvertiserId: string;
  isFollowing: boolean;
  advertiserName: string;
  onStateChange?: (isFollowing: boolean) => void;
};

export function FollowAdvertiserButton({
  userAdvertiserId,
  isFollowing: initialFollowing,
  advertiserName,
  onStateChange,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleFollow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/advertisers/${userAdvertiserId}/follow`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setIsFollowing(true);
        onStateChange?.(true);
      } else if (res.status === 403 && data.code === "LIMIT_REACHED") {
        alert(
          `Follow limit reached (${data.current}/${data.max}). Upgrade your plan to follow more advertisers.`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUnfollow() {
    const ok = window.confirm(
      `Unfollow ${advertiserName}? Their ads will no longer update.`
    );
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/advertisers/${userAdvertiserId}/unfollow`, {
        method: "POST",
      });
      if (res.ok) {
        setIsFollowing(false);
        onStateChange?.(false);
      }
    } finally {
      setLoading(false);
    }
  }

  const followTooltip = "Follow to get recurring ad updates for this advertiser's ads.";

  if (isFollowing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleUnfollow}
        disabled={loading}
        className="gap-1.5"
        title={followTooltip}
      >
        <Check className="h-3.5 w-3.5" />
        {loading ? "Updating…" : "Following"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleFollow}
      disabled={loading}
      title={followTooltip}
    >
      {loading ? "Following…" : "Follow"}
    </Button>
  );
}
