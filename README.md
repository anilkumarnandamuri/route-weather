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
