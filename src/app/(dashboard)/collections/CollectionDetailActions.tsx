"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { collectionId: string; adId: string };

export function CollectionDetailActions({ collectionId, adId }: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/collections/${collectionId}/ads/${adId}`,
        { method: "DELETE" }
      );
      if (res.ok) router.refresh();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={removing}
      className="text-xs text-destructive hover:text-destructive/90 hover:underline disabled:opacity-50"
      title="Remove from collection"
    >
      {removing ? "Removing…" : "Remove"}
    </button>
  );
}
