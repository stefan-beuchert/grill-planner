import { CloudSun, MapPin } from "lucide-react";
import { geocodeLocation, type Coordinates } from "@/lib/geocode";
import { getWeatherForecast } from "@/lib/weather";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/party/section-heading";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Google's keyless "universal" URL scheme — works as a plain link and
// deep-links into the native Maps app on phones. Coordinates keep this
// pin consistent with the embedded OSM map above it; falling back to the
// raw address text still lets navigation work even when our own
// geocoding attempt (Nominatim) failed to resolve the location.
function googleMapsUrl(location: string, coords: Coordinates | null): string {
  const query = coords ? `${coords.latitude},${coords.longitude}` : location;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export async function LocationSection({
  location,
  startsAt,
  t,
}: {
  location: string;
  startsAt: Date;
  t: Dictionary;
}) {
  const coords = await geocodeLocation(location);
  const weather = coords ? await getWeatherForecast(coords, startsAt) : null;
  const description = weather
    ? (t.location.weatherCodes[weather.weatherCode] ?? t.location.weatherCodeUnknown)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SectionHeading icon={CloudSun}>{t.location.weatherHeading}</SectionHeading>
        {!coords ? (
          <p className="text-muted-foreground text-sm">{t.location.noForecastLocation}</p>
        ) : weather ? (
          <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-accent px-4 py-3">
            <span className="text-2xl font-semibold tabular-nums">
              {Math.round(weather.temperatureMin)}°–{Math.round(weather.temperatureMax)}°C
            </span>
            <div className="flex flex-col text-sm">
              <span>{description}</span>
              <span className="text-muted-foreground">
                {t.location.rainChance(weather.precipitationProbability)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t.location.noForecastYet}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading icon={MapPin}>{t.location.mapHeading}</SectionHeading>
        <p className="text-base">{location}</p>
        {coords ? (
          <iframe
            title="Party location map"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              coords.longitude - 0.01
            }%2C${coords.latitude - 0.01}%2C${coords.longitude + 0.01}%2C${
              coords.latitude + 0.01
            }&marker=${coords.latitude}%2C${coords.longitude}`}
            className="h-56 w-full rounded-xl border"
            loading="lazy"
          />
        ) : (
          <p className="text-muted-foreground text-sm">{t.location.noMapLocation}</p>
        )}
        <Button
          render={
            <a
              href={googleMapsUrl(location, coords)}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          nativeButton={false}
          variant="secondary"
          className="h-12 w-full text-base"
        >
          {t.location.openInGoogleMaps}
        </Button>
      </div>
    </div>
  );
}
