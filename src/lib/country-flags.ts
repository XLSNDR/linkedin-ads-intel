/**
 * Map common country names (as from LinkedIn) to flag emoji for ad cards.
 * Covers EU/EEA and common targeting countries.
 */
const COUNTRY_TO_FLAG: Record<string, string> = {
  Netherlands: "🇳🇱",
  Nederland: "🇳🇱",
  Belgium: "🇧🇪",
  België: "🇧🇪",
  Germany: "🇩🇪",
  Deutschland: "🇩🇪",
  France: "🇫🇷",
  "United Kingdom": "🇬🇧",
  UK: "🇬🇧",
  Spain: "🇪🇸",
  España: "🇪🇸",
  Italy: "🇮🇹",
  Poland: "🇵🇱",
  "United Arab Emirates": "🇦🇪",
  UAE: "🇦🇪",
  Bulgaria: "🇧🇬",
  Curaçao: "🇨🇼",
  Greece: "🇬🇷",
  "United States": "🇺🇸",
  USA: "🇺🇸",
  Canada: "🇨🇦",
  Colombia: "🇨🇴",
  Australia: "🇦🇺",
  India: "🇮🇳",
  Brazil: "🇧🇷",
  Ireland: "🇮🇪",
  Portugal: "🇵🇹",
  Austria: "🇦🇹",
  Switzerland: "🇨🇭",
  Sweden: "🇸🇪",
  Norway: "🇳🇴",
  Denmark: "🇩🇰",
  Finland: "🇫🇮",
  Luxembourg: "🇱🇺",
  Pakistan: "🇵🇰",
  Philippines: "🇵🇭",
  Estonia: "🇪🇪",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
};

export function getCountryFlag(countryName: string): string {
  return COUNTRY_TO_FLAG[countryName] ?? "🌐";
}

export type CountryImpression = { country: string; percentage: string };

export function parseCountryData(
  countryData: unknown
): CountryImpression[] {
  if (!countryData || !Array.isArray(countryData)) return [];
  return countryData
    .filter(
      (item): item is CountryImpression =>
        item != null &&
        typeof item === "object" &&
        "country" in item &&
        typeof (item as CountryImpression).country === "string"
    )
    .slice(0, 3);
}
