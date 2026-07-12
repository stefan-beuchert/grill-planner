"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getStoredParticipantSnapshot,
  parseStoredParticipant,
  subscribeToParticipantStorage,
} from "@/lib/participant-storage";

export function useStoredParticipant(slug: string) {
  const raw = useSyncExternalStore(
    subscribeToParticipantStorage,
    () => getStoredParticipantSnapshot(slug),
    () => null,
  );
  return useMemo(() => parseStoredParticipant(raw), [raw]);
}
