"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { SaveToCollectionModal } from "./SaveToCollectionModal";

type SaveToCollectionContextValue = {
  openSaveModal: (adId: string) => void;
  closeSaveModal: () => void;
};

const SaveToCollectionContext = createContext<SaveToCollectionContextValue | null>(
  null
);

export function useSaveToCollection() {
  const ctx = useContext(SaveToCollectionContext);
  if (!ctx) {
    return {
      openSaveModal: () => {},
      closeSaveModal: () => {},
    };
  }
  return ctx;
}

export function SaveToCollectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adId, setAdId] = useState<string | null>(null);

  const openSaveModal = useCallback((id: string) => setAdId(id), []);
  const closeSaveModal = useCallback(() => setAdId(null), []);

  return (
    <SaveToCollectionContext.Provider
      value={{ openSaveModal, closeSaveModal }}
    >
      {children}
      <SaveToCollectionModal
        adId={adId}
        onClose={closeSaveModal}
      />
    </SaveToCollectionContext.Provider>
  );
}
