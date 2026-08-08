# Roadmap

An honest list of what's deliberately deferred, and why — not an excuse
list, a plan.

## Hardware phase

Not started. The target is a small dedicated screen running this board in
kiosk mode:

- Raspberry Pi (or similar small board) driving a small screen, sized to
  echo the regional-station displays the `/docs` reference images show.
- Chromium in kiosk mode as the display surface — this is already a
  regular web app, so no rewrite needed, just a launcher/provisioning
  layer that doesn't exist yet.
- Real GPIO buttons replacing the keyboard-key stand-in (keys 1/2/3 today).
  The swap point already exists and is deliberately isolated for this: see
  [src/input/InputSource.ts](../src/input/InputSource.ts) and the
  "keydown-as-hardware-button pattern" section of
  [ARCHITECTURE.md](ARCHITECTURE.md) — a `gpioInputSource.ts` implementing
  the same `InputSource` interface is the whole job, no component changes.

## Real disruption data source

The disruption banner and per-row rerouting text are both mocked (see
[DATA.md](DATA.md) for the full writeup). transport.opendata.ch has no
field for either. opentransportdata.swiss's alerts feed is the leading
candidate but requires registration and hasn't been evaluated against the
real response shape yet. This blocks the disruption banner from ever being
real data until someone does that legwork.

## Line-badge accuracy pass

[LineBadge](../src/components/LineBadge/LineBadge.tsx) approximates the
real SBB/CFF/FFS slanted IC/IR/EC wordmark pictograms with plain CSS
(`skewX` + bold italic) rather than real logo assets — a reasonable
first-pass shape, not a claim of pixel fidelity. Worth a follow-up pass to
source or recreate the actual glyphs and verify colors/proportions against
real SBB branding guidelines rather than the pixel-sampled-from-photos
approximation this bootstrap used.

## Font

Currently `system-ui` bold as the fallback stack (see
[tokens.css](../src/styles/tokens.css)) — no license for the real SBB
typeface was sought for this bootstrap. A later swap to the real typeface
(if a license/webfont source is found) is a contained change, since every
component already inherits font weight/family from the shared root rather
than setting it locally.

## Known visual gaps vs. the `/docs` reference images

- **Via-stop overflow**: real boards with a long via-stop list (several
  intermediate stations) currently hard-clip at the row's right edge with
  no ellipsis or marquee — acceptable for a bootstrap, but real boards
  either fit everything or scroll. Worth a follow-up: either a fade-mask
  on overflow or a slow horizontal scroll for rows whose via list doesn't
  fit.
- **Cancellation/delay behavior only spot-checked with mocked API
  responses**, not observed live — the real API rarely has a
  currently-cancelled or currently-delayed train to test against on
  demand. The rendering logic is verified against a synthetic payload
  matching the documented (if unconfirmed) shape; worth re-checking
  against a real disrupted-service day once one's observed.
- **RE badges always show a route number** (e.g. "RE80") even though the
  FR/DE reference images show a bare "RE" for some services — a deliberate
  call made during bootstrap to keep badge rendering fully data-driven
  rather than special-casing one category; see the "RE badge format"
  decision in the bootstrap plan for the reasoning.
