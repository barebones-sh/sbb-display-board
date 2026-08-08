# sbb-display-board

A web-based replica of the modern Swiss (SBB/CFF/FFS) train station departure
board — the dark navy LED/LCD-style board you see at regional stations today,
not the classic split-flap one. Built with Vite, React, and TypeScript,
fetching live departure/arrival data directly from the public
[transport.opendata.ch](https://transport.opendata.ch) API.

![Board showing live departures from Bern, fetched from transport.opendata.ch](docs/screenshot.png)

## Status

Software UI only. It runs in any browser today; there's no hardware yet.
The eventual target is a small dedicated screen (Raspberry Pi + Chromium
kiosk mode) with three physical buttons, but that phase hasn't started —
see [docs/ROADMAP.md](docs/ROADMAP.md). The three "buttons" (cycle station,
toggle departures/arrivals, cycle language) are simulated today with keys
1/2/3 on your keyboard.

## Quickstart

```bash
npm install
npm run dev
```

Then open the printed local URL. The board starts empty — go to
`/settings` to add a station by name (it autocompletes against the live
API), then head back to `/`.

## Changing the default station

There's no env-var/config-file default — the board reads whatever's saved
in `/settings`, persisted to your browser's `localStorage`. To ship a
different default out of the box, edit `DEFAULT_STATE` in
[src/context/AppStateContext.tsx](src/context/AppStateContext.tsx) and add
a station to `savedStations`.

## Learn more

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the pieces fit together
- [docs/DATA.md](docs/DATA.md) — the API endpoints in use, and the gaps (no
  confirmed live disruption feed yet)
- [docs/ROADMAP.md](docs/ROADMAP.md) — what's deliberately deferred, and why

## License

No license file yet — treat as all-rights-reserved until one is added.
