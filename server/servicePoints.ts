/**
 * Loads opentransportdata.swiss's "Service Point v2" dataset — a free,
 * keyless, daily-updated static CSV — and builds a sloid -> UIC/DIDOK
 * number lookup.
 *
 * Why this exists: SIRI-SX identifies Swiss stops by `sloid` (e.g.
 * `ch:1:sloid:7000`), not by the UIC/DIDOK number (`8507000`) that
 * `SavedStation.id` uses (sourced from transport.opendata.ch's
 * `/v1/locations`). Confirmed by hand against a real siri-sx payload: none
 * of Bern/Genève/Lausanne/Zürich/Basel's UIC codes appeared anywhere in a
 * 1,484-unique-stop snapshot — only sloids (plus foreign UIC codes on
 * cross-border lines, which don't have a sloid at all). This dataset is
 * the join table between the two id systems — verified by hand too: its
 * Bern row is `sloid=ch:1:sloid:7000;number=8507000`, i.e. exactly
 * `SavedStation.id`. See docs/DATA.md for the full writeup.
 */

const SERVICE_POINTS_CSV_URL =
  "https://data.opentransportdata.swiss/dataset/39e5f264-257a-4f3f-bccc-5322c37058c5/resource/513d1f5f-8ec4-4d45-9e44-784bd367e68d/download/actual-date-swiss-service-point.csv";

// Refreshed roughly on the dataset's own daily update cadence — no rate
// limit to worry about, it's a plain static download.
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

let sloidToUic: Map<string, string> = new Map();
let lastLoadedAt = 0;

/** Splits one CSV line on `;`. The dataset's fields observed so far are all
 * plain (no embedded `;` or quoting) — a real quoted-CSV parser can replace
 * this if a future row breaks that assumption. */
function splitCsvLine(line: string): string[] {
  return line.split(";");
}

async function loadServicePoints(): Promise<Map<string, string>> {
  const response = await fetch(SERVICE_POINTS_CSV_URL);
  if (!response.ok) {
    throw new Error(
      `Service Point v2 download failed: ${response.status} ${response.statusText}`,
    );
  }
  const text = await response.text();
  // Strip a leading UTF-8 BOM (present in the real file) before splitting.
  const lines = text.replace(/^﻿/, "").split("\n");
  const header = splitCsvLine(lines[0]);
  const sloidIndex = header.indexOf("sloid");
  const numberIndex = header.indexOf("number");
  if (sloidIndex === -1 || numberIndex === -1) {
    throw new Error(
      "Service Point v2 CSV is missing the 'sloid' or 'number' column — dataset shape may have changed.",
    );
  }

  const map = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const fields = splitCsvLine(line);
    const sloid = fields[sloidIndex];
    const number = fields[numberIndex];
    if (sloid && number) map.set(sloid, number);
  }
  return map;
}

/** Returns the current sloid -> UIC/DIDOK lookup, loading it on first call
 * and transparently refreshing it roughly once a day. Never throws once a
 * successful load has happened — a failed refresh just keeps serving the
 * last-known-good map, matching this app's general "stale beats blank"
 * approach to background refreshes. */
export async function getServicePointLookup(): Promise<Map<string, string>> {
  const isStale = Date.now() - lastLoadedAt > REFRESH_INTERVAL_MS;
  if (sloidToUic.size === 0 || isStale) {
    try {
      const fresh = await loadServicePoints();
      sloidToUic = fresh;
      lastLoadedAt = Date.now();
    } catch (err) {
      if (sloidToUic.size === 0) throw err; // nothing to fall back to yet
      console.error("Service Point v2 refresh failed, keeping stale lookup:", err);
    }
  }
  return sloidToUic;
}
