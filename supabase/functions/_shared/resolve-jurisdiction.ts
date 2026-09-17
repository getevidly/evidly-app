// ═══════════════════════════════════════════════════════════
// resolve-jurisdiction — ONE copy of the address → jurisdiction_id rule.
//
// Replaces the hand-authored 8-entry ZIP-prefix map that used to live inside
// hoodops-webhook. The real source is the `zip_jurisdictions` table
// (migration 20261117000000_zip_jurisdictions.sql): 2,443 California ZIPs
// from the HUD-USPS ZIP-COUNTY Crosswalk 2026Q1, allocated by BUS_RATIO
// (business addresses, not residential — the subject is commercial kitchens),
// covering all 58 counties.
//
// Resolution order:
//   1. City jurisdiction — Berkeley, Long Beach, Pasadena, Vernon,
//      San Francisco run their own health departments. Taken from the ZIP
//      row's city_jurisdiction, or from the county/city name when that names
//      one of them (San Francisco is a city-county; Vernon cannot be resolved
//      from a ZIP at all, so it is only ever matched on the supplied city).
//   2. ZIP → county → the county-level jurisdiction row (city IS NULL).
//   3. City + state, as a last resort and for non-California addresses.
//
// Never throws and never returns a partial failure: an unresolvable address
// yields null so the caller can still create the location. A seal must never
// die because a jurisdiction could not be named.
// ═══════════════════════════════════════════════════════════

interface QueryResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

/** Minimal structural shape of the supabase-js client this module needs. */
// deno-lint-ignore no-explicit-any
type DbClient = { from: (table: string) => any };

interface AddressInput {
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

/** Cities in California that operate their own health jurisdiction. */
const CITY_JURISDICTIONS = [
  "Berkeley",
  "Long Beach",
  "Pasadena",
  "Vernon",
  "San Francisco",
];

function matchCityJurisdiction(value: string | null | undefined): string | null {
  if (!value) return null;
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  return CITY_JURISDICTIONS.find((c) => c.toLowerCase() === needle) ?? null;
}

function isCalifornia(state: string | null | undefined): boolean {
  const s = (state || "").trim().toUpperCase();
  return s === "CA" || s === "CALIFORNIA";
}

/**
 * Resolve a jurisdiction_id for an address. Returns null when nothing matches;
 * every failure path is logged with the city, state and ZIP that produced it.
 */
export async function resolveJurisdictionId(
  supabase: DbClient,
  input: AddressInput,
): Promise<string | null> {
  const city = (input.city || "").trim();
  const state = (input.state || "").trim() || "CA";
  const zip = (input.zip || "").trim().slice(0, 5);
  const where = `city="${city}" state="${state}" zip="${zip}"`;

  try {
    let countyName: string | null = null;
    let cityJurisdiction = matchCityJurisdiction(city);

    // ── 1. ZIP lookup (California only — zip_jurisdictions is a CA table) ──
    if (zip && isCalifornia(state)) {
      const { data: zipRow, error: zipErr }: QueryResult<
        { county_name: string | null; city_jurisdiction: string | null }
      > = await supabase
        .from("zip_jurisdictions")
        .select("county_name, city_jurisdiction")
        .eq("zip", zip)
        .maybeSingle();

      if (zipErr) {
        console.error(
          `[resolve-jurisdiction] zip_jurisdictions lookup failed for ${where}: ${zipErr.message}`,
        );
      } else if (zipRow) {
        countyName = zipRow.county_name;
        cityJurisdiction = cityJurisdiction ??
          matchCityJurisdiction(zipRow.city_jurisdiction) ??
          matchCityJurisdiction(zipRow.county_name);
      } else {
        console.error(
          `[resolve-jurisdiction] no zip_jurisdictions row for ${where}`,
        );
      }
    }

    // ── 2. City jurisdiction wins over the county it sits in ──
    if (cityJurisdiction) {
      const { data: cityJ, error: cityErr }: QueryResult<{ id: string }> =
        await supabase
          .from("jurisdictions")
          .select("id")
          .eq("state", state)
          .ilike("city", cityJurisdiction)
          .limit(1)
          .maybeSingle();

      if (cityErr) {
        console.error(
          `[resolve-jurisdiction] city-jurisdiction lookup failed for ${where}: ${cityErr.message}`,
        );
      } else if (cityJ) {
        return cityJ.id;
      }
    }

    // ── 3. ZIP → county → the county-level row ──
    if (countyName) {
      const { data: countyJ, error: countyErr }: QueryResult<{ id: string }> =
        await supabase
          .from("jurisdictions")
          .select("id")
          .eq("state", state)
          .is("city", null)
          .ilike("county", countyName)
          .limit(1)
          .maybeSingle();

      if (countyErr) {
        console.error(
          `[resolve-jurisdiction] county lookup failed for ${where} county="${countyName}": ${countyErr.message}`,
        );
      } else if (countyJ) {
        return countyJ.id;
      } else {
        console.error(
          `[resolve-jurisdiction] no county-level jurisdiction row for county="${countyName}" (${where})`,
        );
      }
    }

    // ── 4. Last resort: plain city + state ──
    if (city) {
      const { data: plainCity, error: plainErr }: QueryResult<{ id: string }> =
        await supabase
          .from("jurisdictions")
          .select("id")
          .eq("state", state)
          .ilike("city", city)
          .limit(1)
          .maybeSingle();

      if (plainErr) {
        console.error(
          `[resolve-jurisdiction] city+state lookup failed for ${where}: ${plainErr.message}`,
        );
      } else if (plainCity) {
        return plainCity.id;
      }
    }

    console.error(`[resolve-jurisdiction] unresolved — ${where}`);
    return null;
  } catch (err) {
    console.error(
      `[resolve-jurisdiction] unexpected failure for ${where}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}
