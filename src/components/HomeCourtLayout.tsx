"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type CourtViewState = {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
};

const CourtViewContext = createContext<CourtViewState | null>(null);

export function useCourtView() {
  const view = useContext(CourtViewContext);
  if (!view) throw new Error("Court view is unavailable");
  return view;
}

export default function HomeCourtLayout({
  notices,
  children,
}: {
  notices: ReactNode;
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <CourtViewContext.Provider value={{ activeId, setActiveId }}>
      {!activeId && notices}
      {children}
    </CourtViewContext.Provider>
  );
}
