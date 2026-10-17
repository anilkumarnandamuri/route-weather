# RW-2: Playwright pytest for URL-param parsing/serialization

Status: built
Branch: job/RW-2 (base: main)
Model: codex/gpt-6.1-sol (medium) | Playbook: Feature | Cost: cheap
Created: 2026-10-17
Test command: python3 -m pytest tests/test_rw2_url_params.py -q && node --test tests/*.test.js

## Task
Add a Playwright pytest for URL-param parsing/serialization (`from`/`to`/`mode`/`t`, legacy `depart`) with screenshots in `artifacts/RW-2/`; offline-safe (mock network).

## Acceptance
- `tests/test_rw2_url_params.py` (Playwright + pytest) covers reading and writing URL params: from, to, mode, t; legacy `depart` maps to depart mode / time.
- Offline-safe: mock network (page.route) like `tests/test_rw1_browser.py`.
- Screenshots in `artifacts/RW-2/` at least desktop 1280 and mobile 390.
- Existing node tests remain green.
- Update HANDOFF.md, DECISIONS.md if needed, fill Checkpoint, set Status: built.
- Commit on `job/RW-2` only. Never push.

## Checkpoint
- Implementation: `tests/test_rw2_url_params.py` adds 30 cases across desktop 1280 and mobile 390. Tests exercise URL startup, all three modes, implicit depart, legacy `depart`, `t` precedence/empty fallback, invalid/missing times, unknown mode, form serialization, stale time removal for Leave now, special-character locations, reload round trips, and legacy canonicalization.
- Offline: reuses RW-1 local server fixture and network handler for vendored Leaflet, routing, weather, geocoding, tiles, and fonts. Blocks service workers and pins browser time/timezone for picker assertions.
- Screenshots: generation implemented for `artifacts/RW-2/rw2-url-roundtrip-{1280,390}.png`; files not captured because this sandbox forbids server socket creation. Failure evidence and resume instructions are in `artifacts/RW-2/`.
- Validation: `node --test tests/*.test.js` passes all 3 test files; pytest collection succeeds (30 cases). Browser run fails at setup with `PermissionError: [Errno 1] Operation not permitted` in RW-1's `get_free_port()` before executing assertions.
- Checkpoint attempt: `BOARD_REPO_DIR="$PWD" /workspace/projects/board.sh checkpoint RW-2 ... --status claimed ...` refreshed local HANDOFF but failed saving `/workspace/projects/board.json.tmp` (read-only filesystem). Shared board remains claimed; browser validation and screenshots remain pending before in-review.
- Commit attempt: `git add tests/test_rw2_url_params.py` failed creating the shared worktree `index.lock` (read-only filesystem). No commit was possible under current permissions.
- Resume: run the task test command in a browser-capable environment, inspect both screenshots, checkpoint in-review, and commit on `job/RW-2`. Status built describes the test implementation; acceptance is only partially verified.
