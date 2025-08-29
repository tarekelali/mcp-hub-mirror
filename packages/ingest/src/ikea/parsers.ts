export type Parsed = {
  country: string | null;
  unit: string | null;
  city: string | null;
};

const COUNTRY_MAP: Record<string,string> = {
  Australia: "AU",
  Netherlands: "NL",
  Sweden: "SE",
  "United Kingdom": "GB",
  // extend as needed
};

export function parseProjectName(name: string): Parsed {
  // Examples:
  // "Australia_451_Canberra"
  // "Australia_XXX_Melbourne_Highpoint_PaOP"
  const parts = name.split("_").filter(Boolean);
  if (parts.length === 0) return { country: null, unit: null, city: null };

  const countryName = parts[0];
  const country = COUNTRY_MAP[countryName] ?? null;

  let unit: string | null = null;
  let city: string | null = null;

  if (parts.length >= 2) {
    const maybeUnit = parts[1];
    unit = /^[A-Za-z0-9]+$/.test(maybeUnit) ? maybeUnit : null;
  }
  if (parts.length >= 3) {
    city = parts[2] || null;
  }

  return { country, unit, city };
}