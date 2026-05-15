# Plan 21 — DM dashboard

## Goal
At `/campaign/:id/dm`, the DM gets a panoramic view: party roster with HPs/conditions/status, recent events feed, upcoming/active sessions, encounters in flight, quick-access to encounter creation and notes. DM-only route (rule + UI gate).

## Context
Read `docs/PERMISSIONS.md`, `docs/EVENT-LOG.md`.

## Prerequisites
Sprint 2 complete.

## Steps
- [ ] 1. Route `/campaign/:id/dm` → `<DMDashboard />`. Gated: redirect non-DM to `/campaign/:id`.
- [ ] 2. **Party roster panel** — grid of player cards (one per member with a character). Each card shows: portrait, name, class+level, HP bar, conditions chips, AC, equipped highlights, last-seen timestamp.
- [ ] 3. Click a card → opens that character's sheet in "DM view" (full edit authority).
- [ ] 4. **Recent events feed** — last 20 events in the campaign (visibility: all or dm). Tap an event for details. Filter by player.
- [ ] 5. **Sessions strip** — active session highlighted, next planned session pinned, "Start session" / "End session" buttons.
- [ ] 6. **Encounters strip** — list of active and planned encounters with status. "Create encounter" button → opens encounter creator (plan 24).
- [ ] 7. **Quick notes** — Markdown scratchpad stored in the active session's `notes` field (or campaign-level if no active session).
- [ ] 8. **Secret roll** button — DM rolls a hidden d20 + mod (logged as `dm-secret-roll`, visibility: 'dm').
- [ ] 9. Real-time: all panels subscribe via `onSnapshot` — party HP changes from players appear instantly in DM dashboard.
- [ ] 10. Mobile layout: horizontally scrollable carousels for each panel (party / events / sessions / encounters).
- [ ] 11. e2e: 2-user scenario, player changes HP, DM sees update in dashboard within 2s.
- [ ] 12. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 13. Commit: `feat(dm-view): dashboard (plan 21)`

## Definition of Done
- [ ] DM dashboard renders correctly for DMs
- [ ] Non-DM redirected
- [ ] Real-time party updates work
- [ ] Quick notes persist
- [ ] Secret roll logs DM-only event

## Notes for next plan
- Plan 22 implements the full event-logger — until then, "recent events" feed reads existing events (mostly empty).
