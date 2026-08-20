"use client";

import { useEffect, useState } from "react";
import type { View } from "@/components/studio/ViewToggle";

/**
 * Grid/list preference, kept in localStorage per page (`key` scopes it — a
 * coach may want grid for exercises and list for clients). Starts at "grid"
 * on both server and client so hydration never has to reconcile a mismatch;
 * the stored value, if any, applies right after mount.
 */
export function usePersistedView(key: string): [View, (view: View) => void] {
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage after mount, see comment above
    if (stored === "grid" || stored === "list") setView(stored);
  }, [key]);

  useEffect(() => {
    window.localStorage.setItem(key, view);
  }, [key, view]);

  return [view, setView];
}
