// Identifies "which participant is me" without an account: after joining,
// the edit token is stored here and never sent anywhere except back to the
// server to prove ownership of that one row.
//
// Modeled as a tiny external store (read via useSyncExternalStore in the
// component) so a same-tab write after joining is reflected immediately,
// and so the server/client snapshot mismatch during hydration is handled
// the React-recommended way instead of an effect+setState waterfall.

export type StoredParticipant = {
  participantId: string;
  editToken: string;
};

const STORAGE_EVENT = "grill-planner:participant-storage";

const storageKey = (slug: string) => `grill-planner:participant:${slug}`;

export function getStoredParticipantSnapshot(slug: string): string | null {
  return window.localStorage.getItem(storageKey(slug));
}

export function parseStoredParticipant(raw: string | null): StoredParticipant | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredParticipant;
  } catch {
    return null;
  }
}

export function setStoredParticipant(slug: string, value: StoredParticipant) {
  window.localStorage.setItem(storageKey(slug), JSON.stringify(value));
  // The native "storage" event only fires in *other* tabs — dispatch our
  // own so this tab's useSyncExternalStore subscriber re-reads too.
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeToParticipantStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}
