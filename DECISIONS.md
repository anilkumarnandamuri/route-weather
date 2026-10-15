# DECISIONS — route-weather (append-only)

## D001 — Adopt AGENTS/PLAN/HANDOFF/DECISIONS handoff files (2026-10-15, Grok Bot for Anil)
- Decision: these repo files are the source of truth for agents; `/workspace/projects/BOARD.md` is only an index; claims via board.sh.
- Why: several agents (Codex, Cursor, agy) share this box and must not duplicate work.
- Alternatives rejected: one central board as source of truth.
