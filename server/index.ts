import { createServer, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
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
 *
 * In production (the Docker image, see Dockerfile) this process is also
 * the app's public entrypoint: it serves the built frontend from `dist/`
 * alongside the API above, on one port — see "Static frontend serving"
 * below. Locally, `dist/` doesn't exist unless you've run `npm run build`,
 * so that part of this file is inert during normal `npm run dev` work.
 */

// `PORT` is what the Docker image's `docker-compose.yml` sets (via `.env`);
// `DISRUPTIONS_PROXY_PORT` is kept as a fallback purely so local dev
// (`npm run server`, no `PORT` set) keeps listening on its historical 8787
// without any change to `.env`.
const PORT = Number(process.env.PORT ?? process.env.DISRUPTIONS_PROXY_PORT ?? 8787);

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

// ---------------------------------------------------------------------------
// Static frontend serving (production only)
//
// `dist/` only exists after `npm run build`. Checked once here at startup,
// not per-request: in local dev (`npm run dev` + `npm run server`), it's
// absent, so `hasDist` is false and every non-API request 404s exactly like
// before this section existed. In the Docker image, the build stage always
// produces `dist/` before the runtime stage copies it in (see Dockerfile),
// so this is what actually serves the app in production.
// ---------------------------------------------------------------------------

const DIST_DIR = resolve(import.meta.dirname, "..", "dist");
const DIST_INDEX_HTML = resolve(DIST_DIR, "index.html");
const hasDist = existsSync(DIST_DIR);

// Small, deliberately non-exhaustive MIME map — just what this build's
// `dist/` actually contains (vite's output: index.html, hashed
// assets/*.js and assets/*.css, favicon.svg) plus a couple of obvious
// extras. Anything unrecognized falls back to a generic binary content
// type, which is harmless for files this app doesn't actually serve.
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
};
const DEFAULT_MIME_TYPE = "application/octet-stream";

/**
 * Resolves a request path to a file under `DIST_DIR`, or `null` if it
 * would resolve outside it. `decodeURIComponent` runs first so an encoded
 * `..` (`%2e%2e`) can't slip past the containment check below by pretending
 * to be a harmless literal segment — then `resolve` collapses any
 * remaining `..`/`.` segments before that check runs, so normal path
 * segments can't bypass it either.
 */
function resolveWithinDist(pathname: string): string | null {
  const decoded = decodeURIComponent(pathname);
  const candidate = resolve(DIST_DIR, `.${decoded}`);
  const isInsideDist = candidate === DIST_DIR || candidate.startsWith(DIST_DIR + sep);
  return isInsideDist ? candidate : null;
}

function serveFile(res: ServerResponse, filePath: string): void {
  const contentType = MIME_TYPES[extname(filePath)] ?? DEFAULT_MIME_TYPE;
  // Synchronous read: traffic here is a single display board's own
  // polling, not public load, so this isn't worth streaming.
  res.writeHead(200, { "Content-Type": contentType }).end(readFileSync(filePath));
}

/**
 * Serves `dist/<pathname>` when it exists and is a real file; otherwise
 * falls back to `dist/index.html` — react-router-dom's `BrowserRouter`
 * needs this so a hard refresh on `/settings` doesn't 404: the server has
 * no route for `/settings`, only the client-side router does, so every
 * unmatched GET has to resolve to the same index.html and let the client
 * take over routing from there.
 */
function serveStaticOrSpaFallback(res: ServerResponse, pathname: string): void {
  const candidate = resolveWithinDist(pathname);
  const isRealFile =
    candidate !== null && candidate !== DIST_DIR && existsSync(candidate) && statSync(candidate).isFile();
  serveFile(res, isRealFile ? candidate : DIST_INDEX_HTML);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/api/disruptions") {
    const locationId = url.searchParams.get("locationId");
    if (!locationId) {
      res.writeHead(400, { "Content-Type": "application/json" }).end(
        JSON.stringify({ error: "locationId query param is required" }),
      );
      return;
    }
    const body = JSON.stringify(disruptionsForLocation(locationId));
    res.writeHead(200, { "Content-Type": "application/json" }).end(body);
    return;
  }

  // Any other `/api/*` path is an unknown endpoint — 404, and deliberately
  // never falls through to static serving below: returning the SPA's
  // index.html (200) for a typo'd or removed API route would hide what's
  // actually a client bug.
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(404).end();
    return;
  }

  // No `dist/` (local dev without a build) or a non-GET request: preserve
  // pre-static-serving behavior exactly — 404 everything that isn't the
  // API route above.
  if (!hasDist || req.method !== "GET") {
    res.writeHead(404).end();
    return;
  }

  serveStaticOrSpaFallback(res, url.pathname);
});

pollUnplanned();
pollComplete();
setInterval(pollUnplanned, UNPLANNED_POLL_MS);
setInterval(pollComplete, COMPLETE_POLL_MS);

server.listen(PORT, () => {
  console.log(`Disruptions proxy listening on http://localhost:${PORT}`);
});
