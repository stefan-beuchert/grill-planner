import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Navigation,
  Sun,
} from "lucide-react";
import { geocodeLocation, type Coordinates } from "@/lib/geocode";
import { getWeatherForecast } from "@/lib/weather";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/party/section-heading";
import { LocationMap } from "@/components/party/location-map";
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

// WMO weather codes (https://open-meteo.com/en/docs) → icon. Falls back to
// CloudSun for anything unmapped rather than rendering nothing. Written as a
// switch over literal JSX tags (rather than a code → component lookup map)
// so no component reference is computed/created during another component's
// render — see eslint-plugin-react-hooks's "static components" rule.
function WeatherIcon({
  code,
  className,
  label,
}: {
  code: number;
  className?: string;
  label?: string;
}) {
  const props = { className, role: "img" as const, "aria-label": label };
  switch (code) {
    case 0:
      return <Sun {...props} />;
    case 1:
    case 2:
      return <CloudSun {...props} />;
    case 3:
      return <Cloud {...props} />;
    case 45:
    case 48:
      return <CloudFog {...props} />;
    case 51:
    case 53:
    case 55:
      return <CloudDrizzle {...props} />;
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82:
      return <CloudRain {...props} />;
    case 71:
    case 73:
    case 75:
      return <CloudSnow {...props} />;
    case 95:
    case 96:
    case 99:
      return <CloudLightning {...props} />;
    default:
      return <CloudSun {...props} />;
  }
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
          <div className="flex items-center gap-2">
            <WeatherIcon
              code={weather.weatherCode}
              className="size-6 text-muted-foreground"
              label={description ?? undefined}
            />
            <span className="text-xl font-semibold tabular-nums">
              {Math.round(weather.temperatureMax)}°C
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t.location.noForecastYet}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeading icon={MapPin}>{t.location.mapHeading}</SectionHeading>
        <p className="text-base">{location}</p>
        <Button
          render={
            <a
              href={googleMapsUrl(location, coords)}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          nativeButton={false}
          className="h-9 w-fit gap-1.5 self-start rounded-full px-4"
        >
          <Navigation className="size-4" />
          {t.location.openInGoogleMaps}
        </Button>
        {coords ? (
          <LocationMap coords={coords} />
        ) : (
          <p className="text-muted-foreground text-sm">{t.location.noMapLocation}</p>
        )}
      </div>
    </div>
  );
}
