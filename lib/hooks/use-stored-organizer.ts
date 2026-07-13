"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getStoredOrganizerSnapshot,
  parseStoredOrganizer,
  subscribeToOrganizerStorage,
} from "@/lib/organizer-storage";

export function useStoredOrganizer(slug: string) {
  const raw = useSyncExternalStore(
    subscribeToOrganizerStorage,
    () => getStoredOrganizerSnapshot(slug),
    () => null,
  );
  return useMemo(() => parseStoredOrganizer(raw), [raw]);
}
