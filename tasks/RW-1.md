# RW-1: RW-1 (see PLAN.md RW-1 scope note and HANDOFF.md): this branch job/RW-1 = laptop

Status: built
Branch: job/RW-1 (base: codex/weather-20261014)
Model: agy/gemini-3.8-flash-high | Playbook: Bug fix | Cost: cheap
Created: 2026-10-15 16:48 PDT
Test command: python3 -m pytest tests/test_rw1_browser.py -q && node --test tests/*.test.js

## Task
RW-1 (see PLAN.md RW-1 scope note and HANDOFF.md): this branch job/RW-1 = laptop branch codex/weather-20261014 (b50c8d0) + the agent docs. Codex reviewed b50c8d0 vs main and found two [P2] regressions (full text copied into artifacts/RW-1/laptop-codex-review.txt; do not read anything under /workspace/projects/reviews). Fix both at the root, minimally:
1. [P2] app.js ~141 (selectElapsed with reveal:true from the #scrub 'input' listener): on desktop (innerWidth>=900) every scrubber input calls selected.scrollIntoView(), which scrolls the shared panel and moves the scrubber itself out of view mid-drag/keyboard. Fix: when the reveal comes from the scrubber on desktop, do not scroll the panel vertically (e.g. pass a flag from the scrub listener so desktop skips scrollIntoView, or only scroll the timeline container itself if it is its own scroll box); keep mobile's horizontal timeline centering, and keep card-click reveal (focusCard) behavior.
2. [P2] style.css ~129: `.timeline,.days{touch-action:pan-x pinch-zoom}` applies at all widths, but at >=900px the timeline is a vertical list, so touch users can't swipe-scroll the panel over the cards. Fix: scope the horizontal-only touch-action for .timeline to the mobile layout (@media (max-width:899px)) and allow vertical panning (pan-y / auto) on the desktop timeline. Leave .days and the scrubber input as they are unless needed.
Keep `node --test tests/*.test.js` green and add node tests for (1) where the fixture allows (tests/support/app-fixture.js).
Browser test: add tests/test_rw1_browser.py (Python Playwright + pytest; serve the repo root with python3 -m http.server on a free port in a fixture). The app calls external services (OSRM routing, Open-Meteo geocoding/forecast, Nominatim, RainViewer, OSM tiles, Google Fonts): intercept ALL non-127.0.0.1 requests with page.route and fulfill them with small deterministic fixtures (a route of a few coordinates, a forecast with a handful of hourly samples, a 1x1 PNG for tiles), so the test is fully offline. Open a URL like /?from=37,-122&to=35.5,-119 so it auto-plans. Assert at 1280x800: after driving the scrubber with the keyboard (focus #scrub, press End / ArrowLeft etc.) the #scrub element is still within the viewport/panel's visible area (boundingBox inside the scroll container's visible rect) and the selected card changed; assert the computed touch-action of .timeline is not 'pan-x pinch-zoom' at 1280px but is at 390px. Save screenshots to artifacts/RW-1/: rw1-desktop-1280-scrubbed.png and rw1-mobile-390.png (mobile with the sheet showing the timeline).
Test command for the task file: python3 -m pytest tests/test_rw1_browser.py -q && node --test tests/*.test.js
Do not change unrelated behavior, do not add network calls, no package installs. Record the choice in DECISIONS.md and update HANDOFF.md.

## Acceptance (definition of done, see .cursor/rules/done.mdc)
- [x] Checkpoint below filled and Status updated
- [x] Playwright browser test passes via the Test command
- [x] New screenshot in artifacts/RW-1/
- [ ] Codex review (artifacts/RW-1/review.md) has no [P0]-[P2] items

## Checkpoint
- What changed:
  - Fixed desktop scrubber regression: updated `app.js` `selectElapsed` to accept `fromScrub` parameter so desktop (`innerWidth >= 900`) skips `scrollIntoView()` on scrub input while maintaining mobile horizontal timeline centering and desktop card click/focus reveals.
  - Fixed timeline touch action: scoped `touch-action: pan-x pinch-zoom` for `.timeline` to `@media (max-width:899px)` in `style.css` and set `touch-action: auto` on desktop (`@media (min-width:900px)`), allowing vertical touch scrolling over the vertical cards list.
  - Added unit test in `tests/app.test.js` checking that desktop scrubber input skips `scrollIntoView()` while card clicks invoke `scrollIntoView()` and mobile scrubber centers horizontally.
  - Added deterministic offline Playwright browser test in `tests/test_rw1_browser.py` asserting desktop scrubber visibility after keyboard interaction, card selection change, and timeline touch-action at 1280px vs 390px.
  - Captured screenshots `artifacts/RW-1/rw1-desktop-1280-scrubbed.png` and `artifacts/RW-1/rw1-mobile-390.png`.
- Files: `app.js`, `style.css`, `tests/app.test.js`, `tests/test_rw1_browser.py`, `tests/support/leaflet.js`, `tests/support/leaflet.css`, `DECISIONS.md`, `HANDOFF.md`, `tasks/RW-1.md`.
- Verification evidence: `python3 -m pytest tests/test_rw1_browser.py -q && node --test tests/*.test.js` exits 0 (2 browser tests passed in ~1.6s, 28 node tests passed).
- Open items: Awaiting external Codex review.

## Log
- 2026-10-15 16:48 PDT run-job started
- 2026-10-15 16:49 PDT run-job resumed
- 2026-10-15 16:57 PDT Codex review: 0 must-fix item(s) open
