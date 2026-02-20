"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function FollowConfirmModal({
  open,
  onOpenChange,
  advertiserName,
  onConfirm,
  loading,
  isRefollow = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertiserName: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
  isRefollow?: boolean;
}) {
  async function handleConfirm() {
    await onConfirm();
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isRefollow ? "Re-follow advertiser" : "Follow advertiser"}</DialogTitle>
          <DialogDescription>
            {isRefollow ? (
              <>
                Start recurring updates again for <strong>{advertiserName}</strong>? We&apos;ll
                re-scrape their ads on your plan&apos;s schedule.
              </>
            ) : (
              <>
                Start recurring updates for <strong>{advertiserName}</strong>? We&apos;ll
                re-scrape their ads on your plan&apos;s schedule (weekly or monthly).
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (isRefollow ? "Re-following…" : "Following…") : isRefollow ? "Re-follow" : "Follow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnfollowConfirmModal({
  open,
  onOpenChange,
  advertiserName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertiserName: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}) {
  async function handleConfirm() {
    await onConfirm();
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unfollow advertiser</DialogTitle>
          <DialogDescription>
            Stop recurring updates for <strong>{advertiserName}</strong>. Their ads
            will stay visible in Explore; you can re-follow anytime.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Unfollowing…" : "Unfollow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveConfirmModal({
  open,
  onOpenChange,
  advertiserName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertiserName: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}) {
  async function handleConfirm() {
    await onConfirm();
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove advertiser</DialogTitle>
          <DialogDescription>
            Remove <strong>{advertiserName}</strong> from your list? You can add them
            again later with a new scrape.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
