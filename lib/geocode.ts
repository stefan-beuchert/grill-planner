export type Coordinates = {
  latitude: number;
  longitude: number;
};

// Nominatim (OpenStreetMap's own geocoder) handles free-text street
// addresses much better than Open-Meteo's place-name-oriented geocoder,
// and it's free with no API key — just a required, descriptive User-Agent
// and a self-imposed rate limit, both trivial at this app's scale.
// See https://operations.osmfoundation.org/policies/nominatim/
export async function geocodeLocation(location: string): Promise<Coordinates | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", location);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: { "User-Agent": "GrillPlanner/1.0 (personal hobby project)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const results: Array<{ lat: string; lon: string }> = await res.json();
    const result = results[0];
    if (!result) return null;

    return { latitude: Number(result.lat), longitude: Number(result.lon) };
  } catch {
    return null;
  }
}
