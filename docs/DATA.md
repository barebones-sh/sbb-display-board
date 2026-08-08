# Data

## Endpoints in use

Both from the free, unauthenticated [transport.opendata.ch](https://transport.opendata.ch/) API:

- `GET https://transport.opendata.ch/v1/stationboard?station={name}&type={departure|arrival}&limit={n}`:
  the board itself. Called from [src/api/stationboard.ts](../src/api/stationboard.ts),
  polled by [useStationboard](../src/hooks/useStationboard.ts).
- `GET https://transport.opendata.ch/v1/locations?query={q}&type=station`:
  station name autocomplete for the Settings page "add station" field.
  Called from [src/api/locations.ts](../src/api/locations.ts).

Neither requires an API key. No backend of ours sits in front of them;
the browser calls them directly.

**The disruption banner is the one exception.** It's backed by
opentransportdata.swiss's SIRI-SX API, which needs a secret Bearer key and
has tight per-key rate limits, so the browser can't call it directly.
[server/](../server) is a small local proxy that holds the key and does the
rate-limited polling, exposing one keyless endpoint
(`GET /api/disruptions?stationId=`) for the frontend to poll freely. See
"Live disruption feed" below for the full design, and
[README.md](../README.md) for how to run it alongside `npm run dev`.

## Response shape assumptions

The official docs for this API are thin, so the shapes in
[src/types/stationboard.ts](../src/types/stationboard.ts) were verified by
hand against real requests during bootstrap (e.g. `station=Bern`), not
copied from documentation. A few things worth knowing if you're extending
`mapStationboard.ts`:

- **`stop.platform` is one string that can carry a boarding-sector suffix
  baked in**, observed live: `"7A-D"`. It is *not* two separate fields.
  [src/utils/platform.ts](../src/utils/platform.ts)'s `parsePlatform()`
  splits it back into a main track number and an optional sector, matching
  the small secondary badge seen next to the platform number in the DE
  reference image (Bern's "13 AB").
- **The entry's `name` field is an internal train number** (e.g.
  `"000749"`), not a rider-facing line code. The badge label
  (`DisplayRow.lineLabel`) is built from `category` + `number` instead
  (e.g. `IR` + `90` → "IR90"). `number` is occasionally letter-prefixed
  (observed: `"N1"`).
- **`/v1/locations` results carry an `icon` field identifying the stop's
  primary transport mode**, sampled live: `"train"`, `"tram"`, `"bus"`,
  `"ship"`, and `null` for non-station address results. Used by
  `SavedStation.icon` ([src/types/appState.ts](../src/types/appState.ts))
  to scope the `trainsOnly` filter to stations that are actually train
  stations, see `effectiveTrainsOnly` in
  [src/components/Board/Board.tsx](../src/components/Board/Board.tsx).

## Known gaps

### No `cancelled` field

No field for "this service is cancelled" appears anywhere in the public
docs or in any live response sampled during bootstrap.
[StopPoint.cancelled](../src/types/stationboard.ts) is declared optional
and read defensively (`stop.cancelled === true`) in
[mapStationboard.ts](../src/api/mapStationboard.ts), but this hasn't been
verified against a real cancelled service. If cancellation never shows up
in practice, this is the first place to check.

### Live disruption feed (SIRI-SX)

Solved. transport.opendata.ch itself has no disruption endpoint, but the
red banner at the top of the board is now backed by real data from
opentransportdata.swiss's `siri-sx` API (VDV736 incident model, XML) via
[server/](../server), a small local proxy required because `siri-sx`
needs a secret Bearer key and has tight per-key rate limits, unlike every
other endpoint this app calls.

**Two endpoints, two separate API keys.** `siri-sx` and `siri-sx-unplanned`
are different products in `api-manager.opentransportdata.swiss`, and each
needs its own key (confirmed by testing: a key that works against one gets
`403 Access to this API has been disallowed` against the other). `.env`
holds both: `OTD_API_KEY_SIRI_SX` and `OTD_API_KEY_SIRI_SX_UNPLANNED`. Auth
itself is a plain `Authorization: Bearer <key>` header; no other secret
from the portal (e.g. the "Token Hash" shown alongside the key) is needed.

They're polled differently, matching the platform's own guidance and this
project's original ask about polling one endpoint often and the other
rarely:

- `siri-sx-unplanned`: the live-incident source (the kind of text
  originally mocked: a power fault, a vehicle-on-the-tracks incident).
  Polled every 45s (rate limit: 2 req/min, 3,000/day). Confirmed live: of a
  1,463-situation snapshot from the *complete* feed, zero were
  `Planned=false`, so the complete feed alone essentially never shows
  genuine live incidents; only the unplanned one reliably does.
- `siri-sx` (complete): polled every 4 hours as a reconciliation pass
  (rate limit: 10 req/hour, 48/day), a superset that's mostly planned
  engineering-work notices, per the platform's own "not for frequent
  polling" guidance for this endpoint.

Both feeds are merged and deduplicated by `SituationNumber` when serving a
station (see `disruptionsForStation` in
[server/index.ts](../server/index.ts)); the same incident can legitimately
appear in both.

**Station matching needs a translation layer, confirmed by hand, not
assumed.** `SavedStation.id` is `LocationResult.id` from
`transport.opendata.ch/v1/locations`, a UIC/DIDOK number (Bern `8507000`).
Grepping a real `siri-sx` snapshot for several major stations' UIC codes
found **none** of them. Swiss stops in `siri-sx` are identified by `sloid`
(`ch:1:sloid:7000`) instead. (Bare numeric refs that *do* appear turned out
to be **foreign** UIC codes on cross-border lines: sloid is Switzerland-only,
so foreign stops fall back to UIC, e.g. `8011068` maps to Frankfurt Hbf.) The
fix is opentransportdata.swiss's **Service Point v2** dataset, a free,
keyless, daily CSV that maps sloid to UIC directly (its Bern row is literally
`sloid=ch:1:sloid:7000;number=8507000`).
[server/servicePoints.ts](../server/servicePoints.ts) loads it once at
startup and refreshes it roughly daily.

**Two different situation shapes in the real feed, also confirmed by
hand, and this one mattered a lot.** A first pass only handled the simpler
shape (top-level `Summary`/`Affects` directly on `PtSituationElement`,
used by SBB's own "EMS" source) and silently dropped **83% of real
situations**. The majority actually come from regional operators (e.g.
PostAuto AG) using a richer shape: stop refs nested under
`PublishingActions > PublishingAction > PublishAtScope > Affects`, and text
split across `TextualContent`'s `SummaryContent`/`ReasonContent`/
`ConsequenceContent`/`DurationContent` (each a `*Text` element per
language) instead of one `Summary`. [server/siriSx.ts](../server/siriSx.ts)
handles both by walking the whole situation for known tag names rather than
assuming one fixed path, which should stay robust if a third shape shows up
later too, as long as it reuses the same element names (a safe bet, since
these are standard SIRI/VDV736 element names, not one operator's invention).

`Summary`/`SummaryText` is required in all four UI languages for a
situation to be used at all (`DisruptionBanner` needs *some* text for
whatever language is selected); `Reason`/`Consequence`/`Duration` are
appended when present, closely matching the mocked text's own
reason-then-consequence-then-duration shape. Confirmed live: a real
Bern-affecting incident renders as *"Interrupted service: Gümligen -
Wichtrach Reason: accident involving a person Allow for delays and
cancellations Duration: Until 09.08.2026, approx. 01:00"*.

"No disturbance signaled for a station means don't show the banner" was
already how `DisruptionBanner` behaved
(`if (disruptions.length === 0) return null;` in
[DisruptionBanner.tsx](../src/components/DisruptionBanner/DisruptionBanner.tsx)),
confirmed against the live proxy: an unaffected station's
`/api/disruptions` call returns `[]`.

**Not pursued:** `gtfs-sa` (GTFS-RT Service Alerts, protobuf) was evaluated
early on and ruled out in favor of `siri-sx`. XML is simpler to parse than
protobuf, and `siri-sx`'s own two-endpoint split maps directly onto the
"poll one often, one rarely" requirement, where `gtfs-sa` only has one flat
rate limit.

**Known limitation, not a bug:** a busy interchange (Bern) can have dozens
of legitimately-relevant situations at once (many lines converge there),
so the banner's rotation can be long at such stations. This reflects real
network-wide advisory volume, not over-broad matching, and wasn't addressed
further since it wasn't part of the original ask.

**What's mocked (for now) alongside the real feed:**
[src/mock/disruptions.ts](../src/mock/disruptions.ts) stays in the repo as
a fixture/fallback for offline dev: sample banner text plus, separately,
sample per-row rerouting instructions (the yellow sub-row under a cancelled
service, see below). It's no longer the default wired into
`DisruptionBanner`.

### No per-row rerouting text field either

Independent of the banner gap above: there is also no field anywhere in
the stationboard response for the free-text rerouting instructions shown
under a cancelled/rerouted row (e.g. "Nach Fribourg/Freiburg: Tram 7…").
This is mocked in the same file, matched to a `DisplayRow` by a
case-insensitive substring match on destination name. A real source would
presumably key off a trip/journey id instead, which this app doesn't have
a mock analogue for.

**Next steps for whoever picks this up:** the real `siri-sx-unplanned`
payload (see above) does carry an `AffectedVehicleJourney` element (114
occurrences in one snapshot) nested under the same `Affects` subtree the
banner code already walks, a plausible per-journey key for this, unlike
anything `Summary`/`ReasonContent`/etc. offer. Not pursued in this pass
(the original ask was specifically the banner), and it's still unconfirmed
whether it carries separate rerouting-specific text or just identifies
*which* journey a situation affects. If it's the latter, the situation's
own `Summary`/`ConsequenceContent` text, already parsed by
[server/siriSx.ts](../server/siriSx.ts), might just need to be re-surfaced
per-row instead of only in the banner, with no new parsing needed. Worth
checking `AffectedVehicleJourney`'s actual sibling fields against a live
payload before building either way.
