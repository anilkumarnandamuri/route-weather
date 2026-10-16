# Route Weather

Static web app. Enter a start and a destination (departure time is optional) and it shows the driving route with the forecast **for the time you reach each point**.

- Run locally: `python3 -m http.server 8000` → http://localhost:8000
- Deploy: push this folder to a GitHub Pages repo (no build step).
- Shareable links: `?from=San%20Jose,%20CA&to=Los%20Angeles,%20CA&mode=now|depart|arrive&t=2026-10-15T09:00` (`t` = local ISO time; `mode=arrive` computes departure = t − drive time and shows "Leave by"). Legacy `?depart=` still works.
- Screenshot test: `python3 shoot.py` (needs Playwright + a server; edit the port inside).

## Data sources (free, no keys) — please respect their terms
| Use | Service | Terms / limits |
|---|---|---|
| Map tiles | OpenStreetMap tile.openstreetmap.org | [Tile policy](https://operations.osmfoundation.org/policies/tiles/): light use only, attribution required, no heavy traffic. Switch to a different free or self-hosted tile provider if traffic grows. (CARTO basemaps now return "API KEY REQUIRED", so they are not used.) |
| Routing | OSRM public demo router.project-osrm.org | Demo server: no SLA, fair use (~1 req/s), may go down. The app retries and shows an error toast if it fails. |
| Geocoding | Open-Meteo Geocoding (autocomplete, debounced 350 ms) + Nominatim fallback on submit | Nominatim [policy](https://operations.osmfoundation.org/policies/nominatim/): max 1 req/s, no autocomplete. Here it is called only once per field, and only on submit. |
| Weather | Open-Meteo Forecast (all route points in one multi-location request, 16 days) | Free for non-commercial use, under 10k calls/day, CC BY 4.0 attribution. **Commercial use (e.g. with ads) needs their paid plan.** |
| Radar | RainViewer public API (latest past frame) | Free with attribution. The free API is limited (zoom ≤7 native, past frames only). |

The weather icons are original inline SVGs, so no third-party icon licence applies. Font: Inter (Google Fonts, OFL). Map library: Leaflet (BSD-2).

## URL parameters

| Parameter | Behavior |
|---|---|
| `from`, `to` | Place text or `latitude,longitude`. Both must be nonempty to auto-run. Text is decoded using URLSearchParams, including `+` as a space. The first occurrence of each parameter wins. |
| `mode` | `now` (default), `depart`, or `arrive`. A missing or empty mode with a time implies `depart`. Unknown modes behave as `now`. |
| `t` | Date/time accepted by the browser's Date parser. Share links write local `YYYY-MM-DDTHH:mm`, without an offset. A recipient interprets that local time in their own time zone. Explicit offsets in incoming links are converted to local time. |
| `depart` | Legacy time alias, used when `t` is absent or empty. A nonempty invalid `t` takes precedence over `depart`. |

Timed modes require a valid time. Invalid or missing times fall back to leave now. `mode=now` ignores times. `arrive` subtracts the route duration from the target arrival. Unknown parameters are ignored. A successful user search replaces the query with `from` and `to`, adding `mode` and `t` only for timed modes. Auto-running an incoming link leaves its URL unchanged. Share uses the current URL.

## Local checks

No build or package install is required. Run `node --test --experimental-test-isolation=none` (Node 22 or later). The isolation flag lets the suite run in restricted environments that cannot spawn Node subprocesses. Preview with `python3 -m http.server 8000 --bind 127.0.0.1` and open http://127.0.0.1:8000.


## Scrub a route and save a trip

After a forecast loads, expand the sheet and drag **Weather along your drive** from departure to arrival. The map dot and its label move along the route. The readout and selected card use the nearest forecast sample. Select a card or weather pin to jump to that sample. The range also supports arrow keys, Home, and End. Times in the readout use the selected sample's time zone.

Open **Saved trips & recent searches** and choose **Save this trip** after a successful search. Saved trips support **Run**, **Rename**, and **Delete**. Recent searches support **Run**, **Save**, and **Delete**. At most 30 saved trips and 10 recent searches are stored under `rw-trips-v1` in localStorage. Recent searches deduplicate by route and timing. Names and timing survive reloads. A saved **Leave now** trip uses the current time when re-run; timed trips retain their selected date and time, including past dates. Re-running fetches current service data. Storage is local to the browser and origin; clearing browser data removes it. Blocked or full storage produces a visible message and leaves route planning available.

## Mobile gestures

Drag the handle or trip summary to resize. A tap cycles peek, half, and full. A content drag first expands the sheet, then scrolls at full height. Dragging down consumes content scroll before collapsing the sheet in the same gesture. Content momentum stops at its boundary and never resizes the sheet. Horizontal card and day strips keep browser scrolling. Form inputs, links, and the scrubber keep their own gestures.

The handle supports Enter or Space to cycle, arrow keys to step, Home for full, and End for peek. Keyboard focus inside the panel and text-field focus expand it so controls remain visible. Pointer focus on the scrubber or buttons keeps the sheet stationary. Reduced-motion settings disable animated map transitions. The desktop panel retains its resize and collapse controls.

`sheet.js` owns pending, sheet, and scroll gesture states. `core.js` contains URL, snap, interpolation, and storage rules; `library.js` owns saved-trip controls. Vertical movement is handled by pointers while content allows `pan-x pinch-zoom`. Native vertical scrolling would take over the pointer stream, preventing continuous scroll-to-sheet handoff. Changing `touch-action` after a gesture starts cannot reclaim that stream. See [W3C Pointer Events section 8.2](https://www.w3.org/TR/pointerevents3/#determining-supported-direct-manipulation-behavior).

## Verification limits and device checks

The zero-dependency Node suite runs the production scripts with deterministic route/weather responses, a small DOM adapter, and a Leaflet adapter. It checks application state and control wiring without network access. It does not validate layout, browser touch arbitration, real Leaflet rendering, or mobile browser behavior. No real iOS Safari or Android Chrome run has been completed in this sandbox. The optional existing screenshot scripts require Playwright, browser binaries, runtime network access, and a server at their configured port.

Before accepting mobile behavior, preview on both real iOS Safari and Android Chrome and complete these checks:

1. Plan a long drive. Slowly drag and flick the handle in both directions through all three snaps. Pause before release and verify that old velocity does not cause a fling.
2. At full height, open the trip library and scroll down. Reverse toward the top and continue downward with the same finger. The sheet starts collapsing only after content reaches its top.
3. Drag upward from half until the sheet reaches full, then continue the same gesture to scroll content. Release and verify momentum stays inside the content. Drag upward on the handle at full; content must not scroll.
4. Pull beyond the peek/full and content-scroll limits. The page must not bounce, refresh, or move the map. Swipe the card and day strips sideways; the sheet must stay fixed.
5. Drag the scrubber end to end and use its keyboard controls. Verify the dot reaches both route endpoints, its conditions label changes, and exactly one matching card stays selected. Opening full must preserve the current map zoom.
6. Interrupt a drag with app switching or a system gesture, then tap a field or the scrubber. No capture or suppressed tap should remain. Tap with two fingers and verify a later single-finger drag still works.
7. Focus a location field, open and close the software keyboard, rotate, and expand/collapse browser chrome. The handle and focused input must remain reachable. Check notches and the home indicator in portrait and landscape.
8. Save, rename, reload, re-run, and delete a trip. Delete a recent search, and save another recent search. Verify **Leave now** re-runs at the current time. Repeat with localStorage blocked.
9. Open a shared timed link and a legacy `depart` link. Verify mode, local time, and route. Repeat in light and dark themes and with reduced motion enabled.
