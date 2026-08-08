import { createServer } from "node:http";
import { fetchDisruptionsByStation, type NormalizedDisruption } from "./siriSx.ts";

/**
 * Small local proxy in front of opentransportdata.swiss's SIRI-SX API —
 * see docs/DATA.md for why this exists (secret Bearer keys + tight
 * per-key rate limits mean the browser can't call it directly the way it
 * calls transport.opendata.ch). Exposes one keyless endpoint,
 * `GET /api/disruptions?locationId=<uic>`, that the frontend polls on its
 * own cadence — the rate-limited upstream polling happens here instead,
 * decoupled from however often the frontend refreshes.
 *
 * `locationId` (not `stationId`) deliberately matches
 * `SavedStation.locationId`'s naming on the frontend — an earlier pass
 * called this `stationId` and the frontend passed `SavedStation.id` (a
 * locally-generated id, unrelated to any transport API), which meant
 * station matching silently never worked end-to-end. See docs/DATA.md.
 */

const PORT = Number(process.env.DISRUPTIONS_PROXY_PORT ?? 8787);

const UNPLANNED_POLL_MS = 45_000; // well under the 2 req/min cap
const COMPLETE_POLL_MS = 4 * 60 * 60 * 1000; // a few hours, per the platform's own guidance

const rawApiKeySiriSx = process.env.OTD_API_KEY_SIRI_SX;
const rawApiKeySiriSxUnplanned = process.env.OTD_API_KEY_SIRI_SX_UNPLANNED;
if (!rawApiKeySiriSx || !rawApiKeySiriSxUnplanned) {
  throw new Error(
    "Missing OTD_API_KEY_SIRI_SX and/or OTD_API_KEY_SIRI_SX_UNPLANNED — set both in .env " +
      "(they're separate API products in api-manager.opentransportdata.swiss, each with its own key).",
  );
}
// Rebound as plain `string` (not `string | undefined`) right after the
// guard above — the functions below are declared later and capture these
// by closure, which TypeScript won't narrow from a conditional several
// lines up, so the throw wouldn't otherwise be enough to satisfy them.
const apiKeySiriSx: string = rawApiKeySiriSx;
const apiKeySiriSxUnplanned: string = rawApiKeySiriSxUnplanned;

// Kept as two separate caches rather than one merged map: the unplanned
// feed is the live-incident source polled every ~45s, the complete feed is
// a much-slower reconciliation pass — merging them at write time would let
// whichever poll runs last silently discard the other's data.
let unplannedByStation = new Map<string, NormalizedDisruption[]>();
let completeByStation = new Map<string, NormalizedDisruption[]>();

async function pollUnplanned() {
  try {
    unplannedByStation = await fetchDisruptionsByStation("unplanned", apiKeySiriSxUnplanned);
  } catch (err) {
    // Stale-but-present beats blank — same approach as servicePoints.ts's
    // lookup refresh: log and keep serving the last-known-good cache.
    console.error("siri-sx-unplanned poll failed, keeping previous cache:", err);
  }
}

async function pollComplete() {
  try {
    completeByStation = await fetchDisruptionsByStation("complete", apiKeySiriSx);
  } catch (err) {
    console.error("siri-sx (complete) poll failed, keeping previous cache:", err);
  }
}

function disruptionsForLocation(locationId: string): NormalizedDisruption[] {
  const combined = [
    ...(unplannedByStation.get(locationId) ?? []),
    ...(completeByStation.get(locationId) ?? []),
  ];
  // The same situation can legitimately appear in both feeds (the complete
  // feed is a superset in principle) — dedupe by SituationNumber so the
  // banner doesn't show the same text twice.
  const seen = new Set<string>();
  return combined.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname !== "/api/disruptions") {
    res.writeHead(404).end();
    return;
  }
  const locationId = url.searchParams.get("locationId");
  if (!locationId) {
    res.writeHead(400, { "Content-Type": "application/json" }).end(
      JSON.stringify({ error: "locationId query param is required" }),
    );
    return;
  }
  const body = JSON.stringify(disruptionsForLocation(locationId));
  res.writeHead(200, { "Content-Type": "application/json" }).end(body);
});

pollUnplanned();
pollComplete();
setInterval(pollUnplanned, UNPLANNED_POLL_MS);
setInterval(pollComplete, COMPLETE_POLL_MS);

server.listen(PORT, () => {
  console.log(`Disruptions proxy listening on http://localhost:${PORT}`);
});
