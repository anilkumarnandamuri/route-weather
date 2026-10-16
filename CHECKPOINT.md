# Route Weather MVP checkpoint

## Done

- Read README.md, index.html, app.js, and style.css on `codex/weather-20261014`. The working tree started clean.
- Existing app uses Leaflet and public runtime data services with no build step. URL initialization and serialization currently live separately in app.js.
- Found the mobile handoff defect: native `pan-y` can cancel the pointer stream before a full sheet can hand a downward gesture to the drag handler. Cancellation currently also uses stale fling velocity.
- Chosen data shapes: a trip is `{from, to, mode, time}`; persisted records add `{id, name, updatedAt}`. A scrub selection is elapsed route seconds plus a nearest weather sample. A sheet gesture has explicit pending, sheet, or scroll ownership.
- Workflow checklist: read poteto principles (done); frame and baseline; design seams; verify URL contract; harden mobile sheet; add timeline; add persisted trips; exercise whole app; review and hand back.
- Definition of done: URL contract tests pass; all three snaps and drag cancellation work; full-sheet content scrolls and hands off at its top; scrubbing synchronizes marker, weather and card; saved/recent trips survive reload and can rerun; no uncaught startup errors in fixture-driven app integration checks; browser/device verification reported separately.
- Decisions: keep plain scripts and a small dependency-free shared core for Node tests. Keep runtime network services, but use deterministic local fixtures for verification. Physical iOS/Android testing is unavailable here and must not be claimed.

- Added core.js and tests for byte-compatible URL parsing/serialization, gesture arithmetic, elapsed-route interpolation, and bounded recent history.
- Browser tooling limitation: Playwright is not installed; Firefox cannot start under the current sandbox (user-namespace creation denied). Network DNS is blocked for shell tools. No permission changes or sandbox workarounds attempted. Will use executable controller tests and leave a physical-device checklist.
- Node's default test subprocess fails in this sandbox; `--experimental-test-isolation=none` runs the same node:test suite in process.

- Local commit attempt failed at `git add` with `.git/index.lock: Read-only file system`. All changes will remain uncommitted; do not retry or work around this restriction.
- Design review compared native handle-only dragging with pointer-owned content scrolling. Chose pointer-owned vertical gestures for continuous top/full handoff, with a small content-only momentum animation. External model lanes unavailable (no configured model sheet, Bun, Claude, or Grok executables); one native design review completed.

- Hardened the mobile controller in sheet.js. Pointer capture follows axis detection; scrolling and sheet movement consume the same deltas; capture loss, multi-touch, resize, focus loss and cancellation discard fling velocity. Momentum is limited to content and never collapses the sheet.
- Removed the panel-wide touch-action restriction, retained horizontal native scrolling, contained overscroll, clamped all sheet motion, raised location input text to 16px to avoid iOS focus zoom, and accounted for visual viewport and safe areas.
- Added seven executable pointer-controller tests. All 14 checks passed before the timeline step.
- Added an elapsed-time range scrubber, continuous route marker, nearest forecast readout, and synchronized accessible cards/pins. Track annotations now scale to the route duration so arrival and route endpoint coincide.

- Added browser-local saved trips and recent searches. The library supports save, inline rename, delete and re-run. Successful searches create at most ten deduplicated recent entries; saved trips cap at thirty. Writes fail visibly and do not pretend persistence succeeded.
- Existing theme and panel-width preferences now tolerate blocked storage too. User text is rendered as text or escaped HTML. Search execution is serialized to prevent competing runs from mixing route results.

- Added fixture-driven integration tests that execute the actual page scripts and controls with a small DOM and Leaflet adapter. They cover startup, incoming URL retention including seconds, endpoint timing, scrub/card/pin synchronization, storage denial, saved-trip lifecycle and timed re-runs. All 19 tests passed.
- The fixture adapter checks application behavior but does not emulate browser layout, touch arbitration, Leaflet rendering, or iOS/Android. Those checks remain explicitly unverified.

## Next

1. Review gesture edge cases and the integrated UI; fix accepted findings.
2. Finish usage, gesture-design, and physical-device verification documentation.
3. Run all tests, JavaScript syntax checks and diff checks. Keep changes uncommitted because .git is read-only.

## How to resume

```sh
cd /home/grokbot/src/route-weather
git status --short
git branch --show-current
node --test --experimental-test-isolation=none
python3 -m http.server 8000 --bind 127.0.0.1
```

Preview http://127.0.0.1:8000. The Node suite includes offline app integration checks. No usable browser driver is available in this sandbox. No push, deployment, remote edits, secrets, or changes to main are authorized.
