# Data

## Endpoints in use

Both from the free, unauthenticated [transport.opendata.ch](https://transport.opendata.ch/) API:

- `GET https://transport.opendata.ch/v1/stationboard?station={name}&type={departure|arrival}&limit={n}`
  — the board itself. Called from [src/api/stationboard.ts](../src/api/stationboard.ts),
  polled by [useStationboard](../src/hooks/useStationboard.ts).
- `GET https://transport.opendata.ch/v1/locations?query={q}&type=station`
  — station name autocomplete for the Settings page "add station" field.
  Called from [src/api/locations.ts](../src/api/locations.ts).

Neither requires an API key. No backend of ours sits in front of them —
the browser calls them directly.

## Response shape assumptions

The official docs for this API are thin, so the shapes in
[src/types/stationboard.ts](../src/types/stationboard.ts) were verified by
hand against real requests during bootstrap (e.g. `station=Bern`), not
copied from documentation. Two things worth knowing if you're extending
`mapStationboard.ts`:

- **`stop.platform` is one string that can carry a boarding-sector suffix
  baked in** — observed live: `"7A-D"`. It is *not* two separate fields.
  [src/utils/platform.ts](../src/utils/platform.ts)'s `parsePlatform()`
  splits it back into a main track number and an optional sector, matching
  the small secondary badge seen next to the platform number in the DE
  reference image (Bern's "13 AB").
- **The entry's `name` field is an internal train number** (e.g.
  `"000749"`), not a rider-facing line code. The badge label
  (`DisplayRow.lineLabel`) is built from `category` + `number` instead
  (e.g. `IR` + `90` → "IR90"). `number` is occasionally letter-prefixed
  (observed: `"N1"`).

## Known gaps

### No `cancelled` field

No field for "this service is cancelled" appears anywhere in the public
docs or in any live response sampled during bootstrap.
[StopPoint.cancelled](../src/types/stationboard.ts) is declared optional
and read defensively (`stop.cancelled === true`) in
[mapStationboard.ts](../src/api/mapStationboard.ts), but this hasn't been
verified against a real cancelled service — if cancellation never shows up
in practice, this is the first place to check.

### No disruption/perturbation feed

The biggest gap. transport.opendata.ch has no endpoint for service
disruptions — the red banner at the top of the board (with its own label,
wrapped description, and pagination dots) has no live data source in this
API at all.

**What was tried/considered:**
- Searched the transport.opendata.ch docs and response shapes for anything
  disruption-adjacent — nothing found.
- The most promising lead not yet evaluated:
  [opentransportdata.swiss](https://opentransportdata.swiss/), the Swiss
  open transport data platform (run by the same body behind SBB's own
  systems), which is understood to publish a service-alerts/disruptions
  feed. It requires registration for an API key, which is why it wasn't
  wired up during this bootstrap — needs someone to register, inspect the
  real response shape, and confirm it actually covers the kind of
  regional-disruption text shown in the `/docs` reference images before
  building against it.

**What's mocked today:** [src/mock/disruptions.ts](../src/mock/disruptions.ts)
— sample banner text (adapted into all four UI languages from the real
wording visible in the reference images) plus, separately, sample per-row
rerouting instructions (the yellow sub-row under a cancelled service).

### No per-row rerouting text field either

Independent of the banner gap above: there is also no field anywhere in
the stationboard response for the free-text rerouting instructions shown
under a cancelled/rerouted row (e.g. "Nach Fribourg/Freiburg: Tram 7…").
This is mocked in the same file, matched to a `DisplayRow` by a
case-insensitive substring match on destination name — a real source would
presumably key off a trip/journey id instead, which this app doesn't have
a mock analogue for.

**Next steps for whoever picks this up:** register for
opentransportdata.swiss, check whether its alerts feed covers both the
banner-level and (separately) the per-train rerouting use case, and if it
covers only one of the two, document what still needs a different source
for the other.
