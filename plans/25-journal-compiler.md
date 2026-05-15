# Plan 25 — Journal compiler

## Goal
Per-session, transform events into a Markdown narrative auto. Stored in `sessions/{sid}.journalCompiled`. DM can edit (becomes the canonical "final" version, events still source). Available at `/campaign/:id/session/:sid` Journal tab and aggregated at `/campaign/:id/journal`.

## Context
Read `docs/EVENT-LOG.md` (journal compilation section, templates).

## Prerequisites
Plans 22-24.

## Steps
- [ ] 1. `src/features/journal/templates/` — one template file per event kind. Exports `(event, context) => string` returning a markdown line in FR.
- [ ] 2. Templates handle plural/singular via `tPlural`. Use `localize` for entity names.
- [ ] 3. `src/features/journal/compiler.ts`:
    - Input: `campaignId`, `sessionId`
    - Query events for the session ordered by `createdAt ASC`
    - Group events: by encounter (encounters become `## Combat — {name}` sections), free-floating events fall into a `## Exploration` section
    - Apply templates per event
    - Output: Markdown string with H2 sections and event-derived prose
- [ ] 4. Triggered automatically on `session-end` event (Cloud Function listener or client-side at end-session UX).
- [ ] 5. Stored in `sessions/{sid}.journalCompiled`.
- [ ] 6. **Manual edit UI**: in the Journal tab, "Editer" toggle → Markdown editor. Saves to `journalCompiled`. Note: original events are still source of truth, the edit is an "author's pass".
- [ ] 7. "Re-compiler depuis les events" button (DM only) — rewrites `journalCompiled` from scratch (discards manual edits with confirmation).
- [ ] 8. **Aggregate view** at `/campaign/:id/journal` — list of all completed sessions with their journal entries, expandable, chronological. "Exporter" button → downloads as `.md` file.

### Tests
- [ ] 9. Unit: each template handles its event correctly.
- [ ] 10. Unit: compiler groups events correctly (encounters wrap their sub-events).
- [ ] 11. e2e: run a quick mock session with 5 events, end session, verify journal renders.

### Final
- [ ] 12. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 13. Commit: `feat(journal): auto-compiler from events (plan 25)`

## Definition of Done
- [ ] Journal compiles from events
- [ ] DM can edit and re-compile
- [ ] Aggregate view + export works
- [ ] Templates in FR for all S2-S3 event kinds

## Notes for next plan
- Plan 26 exposes the DM's editing authority more prominently.
