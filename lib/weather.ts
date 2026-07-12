import type { Coordinates } from "@/lib/geocode";

export type Weather = {
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number;
  // Numeric code, not text — the caller resolves it to a description in
  // the current locale (see lib/i18n/dictionaries).
  weatherCode: number;
};

// https://open-meteo.com/en/docs — free, no API key, generous rate limits.
// Open-Meteo's free forecast only covers ~16 days out — returns null
// outside that window rather than a stale or fabricated forecast.
export async function getWeatherForecast(
  coords: Coordinates,
  date: Date,
): Promise<Weather | null> {
  try {
    const dateStr = date.toISOString().slice(0, 10);

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(coords.latitude));
    url.searchParams.set("longitude", String(coords.longitude));
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode",
    );
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("start_date", dateStr);
    url.searchParams.set("end_date", dateStr);

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const i = data.daily?.time?.indexOf(dateStr) ?? -1;
    if (i < 0) return null;

    return {
      temperatureMin: data.daily.temperature_2m_min[i],
      temperatureMax: data.daily.temperature_2m_max[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
      weatherCode: data.daily.weathercode[i],
    };
  } catch {
    return null;
  }
}
