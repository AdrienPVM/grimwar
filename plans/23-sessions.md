# Plan 23 — Sessions manager

## Goal
DM can start/end sessions in a campaign. Attendance tracked. Each session has a number, title, planned date, notes (Markdown). `session-start` / `session-end` events logged. Sessions list at `/campaign/:id/sessions`, individual session at `/campaign/:id/session/:sid`.

## Context
Read `docs/DATA-MODEL.md` (sessions schema), `docs/EVENT-LOG.md` (session events).

## Prerequisites
Plans 14, 22.

## Steps
- [ ] 1. Route `/campaign/:id/sessions` → `<SessionsList />`: chronological list, DM-only "Planifier une session" button.
- [ ] 2. `<SessionCreateModal />`: title, planned date, optional description.
- [ ] 3. Auto-number sessions: query max `number`, +1.
- [ ] 4. Route `/campaign/:id/session/:sid` → `<SessionScreen />` with tabs: Notes / Attendance / Events / Journal (journal compiler in plan 25).
- [ ] 5. **Notes tab** — Markdown editor + preview (DM only). Auto-saves every 5s. Stored in `sessions/{sid}.notes`.
- [ ] 6. **Attendance tab** — check/uncheck members. Stored in `sessions/{sid}.attendance: string[]`.
- [ ] 7. **Events tab** — events scoped to this session (`events` where `sessionId == sid`), grouped by encounter / chronological.
- [ ] 8. **Start session** button (when status='planned'): sets `status='active'`, `startedAt=now`, logs `session-start` event. Active session sticky in DM dashboard top bar.
- [ ] 9. **End session** button (when status='active'): sets `status='completed'`, `endedAt=now`, logs `session-end` event. Triggers journal compilation (plan 25).
- [ ] 10. Only one session can be `'active'` at a time per campaign.
- [ ] 11. Active session ID flows through Zustand `useActiveSession()` → all events logged during the session get `sessionId` auto-populated by event-logger.

### Tests
- [ ] 12. e2e: DM creates session, starts, players join, end session, journal placeholder visible.
- [ ] 13. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 14. Commit: `feat(sessions): manager + active session + events scoped (plan 23)`

## Definition of Done
- [ ] Session creation, start, end flows work
- [ ] One active session at a time
- [ ] Events auto-tagged with sessionId
- [ ] Notes auto-save

## Notes for next plan
- Plan 25 reads sessions + events to compile journal.
