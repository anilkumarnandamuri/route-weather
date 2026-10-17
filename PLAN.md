# PLAN — route-weather

## Goal
Static web app: enter start/destination (and optional departure/arrival time) to see the driving route with the forecast for when you reach each point.

## Non-goals
- Paid APIs or keys
- Heavy traffic on free demo services (OSM tiles, OSRM, Nominatim) — respect their policies

## Milestones
- [x] **RW-0** Existing work as of 2026-10-15 13:41 PT: Initial static site (4ad754e); Leave now / Depart at / Arrive by time selector (41a38ac); Mobile draggable bottom sheet + resizable desktop panel (eac2653) — done (history) eac2653
- [x] **RW-1** Import laptop branch codex/weather-20261014 (b50c8d0) onto the box before new feature work — Anil/Chief of Staff only. Scope (2026-10-15): branch job/RW-1 = b50c8d0 + docs; fix the 2 Codex [P2]s (review text: artifacts/RW-1/laptop-codex-review.txt; original in /workspace/projects/reviews, outside the agent sandbox) (desktop scrubber scrolls itself out of view app.js:141; touch-action blocks vertical pan on the desktop timeline style.css:129) with a Playwright test + desktop/mobile screenshots in artifacts/RW-1/. Merge into main stays with Anil. — done 2026-10-15 17:30 PDT 2de7215
- [~] **RW-2** Add a Playwright pytest for URL-param parsing/serialization (from/to/mode/t, legacy depart) with screenshots in artifacts/RW-2/; offline-safe (mock network). — in-review 2026-10-17 10:53 PDT by codex/gpt-6.1-sol (job/RW-2 @ dc93c71)
- [ ] **RW-3** Harden the mobile bottom-sheet drag (pointer capture, touch-action, velocity snapping, safe-area) — may already be done on the laptop branch; check RW-1 first.
- [ ] **RW-4** Agent-first pass: llms.txt, robots.txt, sitemap, JSON-LD, /api/info.json, no-JS fallback — may already be on the laptop branch.

## Definition of done
Tests pass (python3 shoot.py (Playwright screenshots; needs a running server; edit the port inside). No assertion-based tests yet.); for web UI a Playwright test passes with screenshots in `artifacts/<task-id>/`; HANDOFF.md rewritten; DECISIONS.md appended for real choices; reviewed; committed on `job/<task-id>`; never pushed.
