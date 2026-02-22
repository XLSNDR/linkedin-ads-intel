"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CollectionRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { collectionAds: number };
};

type Props = {
  adId: string | null;
  onClose: () => void;
};

export function SaveToCollectionModal({ adId, onClose }: Props) {
  const router = useRouter();
  const open = !!adId;

  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!adId || !open) return;

    setLoading(true);
    setSuccessMessage(null);
    setCreateOpen(false);
    setCreateName("");
    setCreateDescription("");
    setCreateError(null);

    Promise.all([
      fetch("/api/collections").then((r) => r.json()),
      fetch(`/api/ads/${adId}/collections`).then((r) => r.json()),
    ])
      .then(([colRes, idsRes]) => {
        const list = colRes.collections ?? [];
        const ids: string[] = idsRes.collectionIds ?? [];
        setCollections(list);
        setInitialIds(new Set(ids));
        setSelectedIds(new Set(ids));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adId, open]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setCreateError("Name is required");
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: createDescription.trim().slice(0, 500) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create");
        return;
      }
      setCollections((prev) => [
        { id: data.id, name: data.name, description: data.description, _count: { collectionAds: 0 } },
        ...prev,
      ]);
      setSelectedIds((prev) => new Set([...Array.from(prev), data.id]));
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSave = async () => {
    if (!adId) return;

    const toAdd = Array.from(selectedIds).filter((id) => !initialIds.has(id));
    const toRemove = Array.from(initialIds).filter((id) => !selectedIds.has(id));

    setSaving(true);
    try {
      await Promise.all([
        ...toAdd.map((collectionId) =>
          fetch(`/api/collections/${collectionId}/ads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adId }),
          })
        ),
        ...toRemove.map((collectionId) =>
          fetch(`/api/collections/${collectionId}/ads/${adId}`, {
            method: "DELETE",
          })
        ),
      ]);
      const count = selectedIds.size;
      setSuccessMessage(
        count === 0
          ? "Removed from all collections"
          : `Saved to ${count} ${count === 1 ? "collection" : "collections"}`
      );
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save to collection</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : successMessage ? (
          <p className="text-sm text-foreground py-4">{successMessage}</p>
        ) : (
          <>
            <div className="max-h-[280px] overflow-y-auto space-y-2 py-2">
              {collections.length === 0 && !createOpen ? (
                <p className="text-sm text-muted-foreground">
                  No collections yet. Create one below.
                </p>
              ) : (
                collections.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 cursor-pointer rounded-md border p-3 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        ({c._count.collectionAds} ads)
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>

            {createOpen ? (
              <div className="border rounded-lg p-3 space-y-2">
                <Input
                  placeholder="Collection name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={200}
                />
                <textarea
                  placeholder="Description (optional, max 500 chars)"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  maxLength={500}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
                {createError && (
                  <p className="text-sm text-destructive">{createError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateOpen(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreate} disabled={createLoading}>
                    {createLoading ? "Creating…" : "Create"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setCreateOpen(true)}
              >
                + Create New Collection
              </Button>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
