"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { SaveToCollectionModal } from "./SaveToCollectionModal";

type SaveToCollectionContextValue = {
  openSaveModal: (adId: string) => void;
  closeSaveModal: () => void;
  /** Subscribe to be notified when the save modal closes (with the adId that was open). Use to refresh ad detail save state. */
  subscribeToSaveModalClose: (cb: (adId: string) => void) => () => void;
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
      subscribeToSaveModalClose: () => () => {},
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
  const subscribersRef = useRef<Set<(adId: string) => void>>(new Set());
  const adIdRef = useRef<string | null>(null);
  adIdRef.current = adId;

  const openSaveModal = useCallback((id: string) => setAdId(id), []);
  const closeSaveModal = useCallback(() => {
    const id = adIdRef.current ?? "";
    setAdId(null);
    subscribersRef.current?.forEach((cb) => cb(id));
  }, []);

  const subscribeToSaveModalClose = useCallback(
    (cb: (adId: string) => void) => {
      if (!subscribersRef.current) subscribersRef.current = new Set();
      subscribersRef.current.add(cb);
      return () => {
        subscribersRef.current?.delete(cb);
      };
    },
    []
  );

  return (
    <SaveToCollectionContext.Provider
      value={{ openSaveModal, closeSaveModal, subscribeToSaveModalClose }}
    >
      {children}
      <SaveToCollectionModal
        adId={adId}
        onClose={closeSaveModal}
      />
    </SaveToCollectionContext.Provider>
  );
}
