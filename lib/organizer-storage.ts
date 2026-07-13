// Identifies "did this browser create this party" without an account —
// mirrors lib/participant-storage.ts exactly, but kept as its own key/event
// since organizer and participant are independent identities (someone can
// be either, both, or neither for a given party).

export type StoredOrganizer = {
  organizerToken: string;
};

const STORAGE_EVENT = "grill-planner:organizer-storage";

const storageKey = (slug: string) => `grill-planner:organizer:${slug}`;

export function getStoredOrganizerSnapshot(slug: string): string | null {
  return window.localStorage.getItem(storageKey(slug));
}

export function parseStoredOrganizer(raw: string | null): StoredOrganizer | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOrganizer;
  } catch {
    return null;
  }
}

export function setStoredOrganizer(slug: string, value: StoredOrganizer) {
  window.localStorage.setItem(storageKey(slug), JSON.stringify(value));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeToOrganizerStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}
