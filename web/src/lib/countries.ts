/** Country name → ISO 3166-1 alpha-2 code */
const COUNTRY_CODES: Record<string, string> = {
  "Argentina": "AR",
  "Australia": "AU",
  "Austria": "AT",
  "Belgium": "BE",
  "Brazil": "BR",
  "Canada": "CA",
  "Chile": "CL",
  "China": "CN",
  "Colombia": "CO",
  "Czech Republic": "CZ",
  "Denmark": "DK",
  "Egypt": "EG",
  "Finland": "FI",
  "France": "FR",
  "Germany": "DE",
  "Greece": "GR",
  "Hungary": "HU",
  "India": "IN",
  "Indonesia": "ID",
  "Ireland": "IE",
  "Israel": "IL",
  "Italy": "IT",
  "Japan": "JP",
  "Mexico": "MX",
  "Netherlands": "NL",
  "New Zealand": "NZ",
  "Nigeria": "NG",
  "Norway": "NO",
  "Peru": "PE",
  "Philippines": "PH",
  "Poland": "PL",
  "Portugal": "PT",
  "Romania": "RO",
  "Russia": "RU",
  "South Africa": "ZA",
  "South Korea": "KR",
  "Spain": "ES",
  "Sweden": "SE",
  "Switzerland": "CH",
  "Thailand": "TH",
  "Turkey": "TR",
  "Ukraine": "UA",
  "United Kingdom": "GB",
  "United States": "US",
  "Vietnam": "VN",
};

/** Convert an ISO alpha-2 code to a flag emoji via regional indicator symbols. */
function codeToFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/** Get the flag emoji for a country name. Returns empty string if unknown. */
export function countryFlag(country: string): string {
  const code = COUNTRY_CODES[country];
  return code ? codeToFlag(code) : "";
}

/** All supported countries as { name, flag } pairs, sorted by name. */
export const COUNTRIES = Object.keys(COUNTRY_CODES)
  .sort()
  .map((name) => ({
    name,
    flag: codeToFlag(COUNTRY_CODES[name]),
  }));
