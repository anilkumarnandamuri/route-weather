# RW-2: Playwright pytest for URL-param parsing/serialization

Status: in-progress
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
(empty — builder fills)
