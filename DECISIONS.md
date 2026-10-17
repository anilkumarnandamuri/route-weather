# DECISIONS — route-weather (append-only)

## D001 — Adopt AGENTS/PLAN/HANDOFF/DECISIONS handoff files (2026-10-15, Grok Bot for Anil)
- Decision: these repo files are the source of truth for agents; `/workspace/projects/BOARD.md` is only an index; claims via board.sh.
- Why: several agents (Codex, Cursor, agy) share this box and must not duplicate work.
- Alternatives rejected: one central board as source of truth.

## D002 — Desktop scrubber visibility and timeline touch handling (2026-10-15, agy/gemini-3.8-flash-high)
- Decision: (1) In app.js, pass `fromScrub: true` from the `#scrub` input listener into `selectElapsed` to skip `selected.scrollIntoView()` on desktop while keeping mobile horizontal scrolling and card-click reveals; (2) In style.css, scope `.timeline`'s `touch-action: pan-x pinch-zoom` to `@media (max-width:899px)` and set `touch-action: auto` on desktop (`@media (min-width:900px)`).
- Why: Fixes the two P2 regressions found in the laptop branch import without modifying layout structures or breaking touch/keyboard interactions.
- Alternatives rejected: Making the timeline its own nested scroll container on desktop (adds undesirable nested scrollbars); setting `touch-action: pan-y` instead of `auto` (over-constrains gestures on desktop touchscreens).


## D003 — Browser URL regression coverage reuses offline fixtures (2026-10-17, codex)
- Decision: RW-2 imports RW-1's local server fixture and external-request mock, exercises startup and form submissions at both 1280px and 390px, and pins the browser clock and timezone for picker dates. Reload checks cover serialized links, with screenshots after the arrive-mode round trip.
- Why: Tests cover integration of URL helpers with the real form and history updates while using the existing vendored Leaflet/API mocks without live services. Fixed time keeps Tomorrow and local-time expectations stable.
- Alternatives rejected: Calling only RouteCore from page.evaluate (duplicates Node coverage and misses UI wiring); copying RW-1's mock implementation (creates two versions to maintain).
