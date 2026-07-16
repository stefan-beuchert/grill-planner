"use client";

import { useState } from "react";
import { Hand } from "lucide-react";
import type { Coordinates } from "@/lib/geocode";
import { useI18n } from "@/lib/i18n/locale-context";

// Bare OSM iframe embed has no way to lock panning while keeping zoom, so
// instead we gate interaction behind a tap: until the first tap, an overlay
// sits in front of the iframe and just eats touch/scroll input, which stops
// scrolling the page near the map from accidentally scroll-jacking it.
// Once tapped, the overlay disappears and the iframe is fully interactive,
// exactly like before this component existed.
export function LocationMap({ coords }: { coords: Coordinates }) {
  const { t } = useI18n();
  const [activated, setActivated] = useState(false);

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl border">
      <iframe
        title="Party location map"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
          coords.longitude - 0.01
        }%2C${coords.latitude - 0.01}%2C${coords.longitude + 0.01}%2C${
          coords.latitude + 0.01
        }&marker=${coords.latitude}%2C${coords.longitude}`}
        className="h-full w-full"
        loading="lazy"
      />
      {!activated && (
        <button
          type="button"
          onClick={() => setActivated(true)}
          aria-label={t.location.mapTapHintAria}
          className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]"
        >
          <span className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow-sm">
            <Hand className="size-4" />
            {t.location.mapTapHint}
          </span>
        </button>
      )}
    </div>
  );
}
