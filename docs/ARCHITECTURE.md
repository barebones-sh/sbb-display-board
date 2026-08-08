# Architecture

How the pieces in `/src` fit together, and why a few things are built the
way they are.

## State flow

All app-wide state (`savedStations`, `currentStationIndex`, `viewMode`,
`language`, `refreshIntervalMs`) lives in one `useReducer` in
[src/context/AppStateContext.tsx](../src/context/AppStateContext.tsx),
exposed via two separate contexts (`useAppState()` for reads,
`useAppDispatch()` for the dispatch function) so a component that only
dispatches doesn't re-render every time unrelated state changes.

The whole `AppState` object is small and entirely user-config, so it's
persisted to `localStorage` under the key `sbb-board-state.v1` on every
change, and rehydrated on load (falling back to defaults if the stored
value is missing, unparsable, or from an incompatible `version`). Anything
*not* in that list — fetched stationboard rows, the live clock, disruption
banner pagination, loading/error flags — is ordinary component/hook state
and is never persisted, since it's either derived from a fetch or purely
ephemeral UI state.

Fetched stationboard data specifically lives in
[useStationboard](../src/hooks/useStationboard.ts), scoped to `Board`, not
in the global context — nothing else in the app needs it, and keeping it
out of the reducer keeps that reducer's job purely "user configuration."

## Why polling + diffing, not WebSockets

transport.opendata.ch is a plain REST API with no push/subscribe channel,
so there's no WebSocket to open even if we wanted one. `useStationboard`
polls on a `setInterval` (default 20s, user-configurable in Settings),
aborting any still-in-flight request before starting the next one so a
slow response can't land after a newer one.

"Diffing" here does **not** mean manual DOM patching — React already does
that. What actually gets skipped on an unrelated poll tick is a row's own
re-render *work*:

1. Each row's React `key` is a stable id (`category+number+departureTimestamp`,
   built in [mapStationboard.ts](../src/api/mapStationboard.ts)), so as long
   as the same physical service is still in the fetched window, React
   reconciliation reuses its existing component instance rather than
   unmounting/remounting it.
2. [DepartureRow](../src/components/DepartureRow/DepartureRow.tsx) is
   wrapped in `React.memo` with a comparator that checks only the fields
   that affect rendering (time, destination, platform, delay, cancelled,
   reroute text, via stops) — not the object's identity, since a fresh
   `DisplayRow` object is produced every poll tick even when nothing in it
   actually changed.

Net effect: a poll tick that returns an unchanged board does effectively no
render work past the top-level `Board` re-render; a tick with one delayed
train only re-renders that one row.

## The keydown-as-hardware-button pattern

Three future physical buttons (cycle station, toggle departure/arrival,
cycle language) are stood in for today by keyboard keys 1/2/3. The
contract lives in [src/input/InputSource.ts](../src/input/InputSource.ts):

```ts
export type ButtonId = "cycleStation" | "toggleViewMode" | "cycleLanguage";
export interface InputSource {
  subscribe(onPress: (button: ButtonId) => void): () => void;
}
```

[keyboardInputSource.ts](../src/input/keyboardInputSource.ts) is the only
implementation today, mapping `keydown` on "1"/"2"/"3" to those three
`ButtonId`s. [src/input/index.ts](../src/input/index.ts)'s `getInputSource()`
is the single factory/swap point — `AppStateContext` is the *only* code
that calls it, in one `useEffect`, translating each `ButtonId` into a
dispatch. No component or reducer logic ever touches `window`, `keydown`,
or hardware directly.

This means the hardware phase (see [ROADMAP.md](ROADMAP.md)) is a
one-file addition: a `gpioInputSource.ts` implementing the same
`InputSource` interface off real pin-edge events, wired in through
`getInputSource()`. Nothing else in the app needs to change.

## i18n approach

A plain object dictionary per language in
[src/i18n/translations.ts](../src/i18n/translations.ts) — no i18n library,
since the scope is deliberately small: seven UI chrome strings (column
headers, "via", the disruption label, the cancellation tag, and the delay
template). `t(key, language, vars?)` does simple `{n}`-style substitution
for the one templated string (the delay text). `useTranslation()` in
[useTranslation.ts](../src/i18n/useTranslation.ts) reads the current
language from `AppStateContext` so components don't have to thread it
through props.

Station and destination names are never run through this dictionary —
they come from the API and are rendered verbatim, in whatever language the
API itself returns them in.

## Responsive row-count logic

The board always fills the viewport, with no fixed canvas or scrollbars,
and the *number* of rows shown adapts to available height rather than the
row size shrinking to fit more in. Two things make that work together:

- **Sizing**: [src/styles/tokens.css](../src/styles/tokens.css) sets the
  root font-size to `clamp(10px, 1.8vmin, 56px)`. Every component
  dimension (badge size, row padding, gaps, type scale) is in `rem`/`em`
  against that, so resizing the window scales the whole board
  proportionally, like a photograph — never a fixed-resolution layout that
  reflows its content density.
- **Row count**: [useVisibleRowCount](../src/hooks/useVisibleRowCount.ts)
  measures real rendered DOM (header height, banner height when present,
  and a single row's actual height) rather than trying to parse the CSS
  `clamp()` math in JS. `Board` always renders one extra row off-screen
  (`.sizerWrapper`, positioned at `top:-9999px`) purely so there's always a
  real row to measure, decoupled from how many rows are currently shown.
  `rowCount = clamp(floor(availableHeight / rowHeight), 1, totalFetched)` —
  floored so a partial row is never rendered, and `Board` fetches more rows
  than it expects to display (`FETCH_LIMIT = 40`) so that cap rarely binds.
  A `ResizeObserver` on the board container (not `window`, so this still
  works if the board is ever embedded in a fixed-size kiosk container
  rather than filling the real browser viewport) plus an
  `orientationchange` listener recompute this, debounced ~150ms.

## Component structure

```
src/components/
  Board/            composes everything, owns the refs useVisibleRowCount measures
  HeaderBar/         clock + translated column headers
  DisruptionBanner/  mocked disruptions, auto-rotating with pagination dots
  DepartureRow/      one row + its cancelled/delayed/reroute states, memoized
  LineBadge/         category -> S-Bahn/RE/IC-IR-EC/default badge styling
  SettingsPage/       StationsManager, DefaultsSection, RefreshIntervalControl
```
