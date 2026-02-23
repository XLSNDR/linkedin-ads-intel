"use client";

import * as React from "react";
import { AdDetailModal } from "./AdDetailModal";

type ContextValue = {
  openAdDetail: (adId: string) => void;
  closeAdDetail: () => void;
};

const Ctx = React.createContext<ContextValue | null>(null);

export function useAdDetailModal() {
  const ctx = React.useContext(Ctx);
  if (!ctx)
    return { openAdDetail: () => {}, closeAdDetail: () => {} };
  return ctx;
}

export function AdDetailModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedAdId, setSelectedAdId] = React.useState<string | null>(null);
  const open = !!selectedAdId;
  const openAdDetail = React.useCallback((adId: string) => setSelectedAdId(adId), []);
  const closeAdDetail = React.useCallback(() => setSelectedAdId(null), []);

  return (
    <Ctx.Provider value={{ openAdDetail, closeAdDetail }}>
      {children}
      <AdDetailModal adId={selectedAdId} open={open} onOpenChange={(o) => !o && setSelectedAdId(null)} />
    </Ctx.Provider>
  );
}
