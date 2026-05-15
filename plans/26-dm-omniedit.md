# Plan 26 — DM omniedit

## Goal
When the DM opens a player's character sheet, every field is editable inline (per `docs/PERMISSIONS.md` — full authority except `personality.*`, `name`, `homeCampaignId`). A discrete "Édition MJ" indicator confirms the mode. Every DM edit logs a `dm-edit` event.

## Context
Read plan 16 (DM authority routing), `docs/PERMISSIONS.md`.

## Prerequisites
Plans 16, 22.

## Steps
- [ ] 1. `usePermissions(character)` returns `{ canEdit, isDMEdit, lockedFields: string[] }`.
- [ ] 2. Sheet wrappers: if `isDMEdit === true`, render the gold DM-indicator bar at top of sheet.
- [ ] 3. Every input/control in sheet modes that respects `canEdit` now ALSO checks if the field is in `lockedFields` and shows the lock icon if it is.
- [ ] 4. The Cloud Function `editPlayerCharacterAsDM` (from plan 16) is now used for ALL DM edits — confirm the wiring in `useUpdateCharacter` is correct.
- [ ] 5. After each DM edit, the Cloud Function logs a `dm-edit` event with `targetCharacterId`, `fieldsChanged`, before/after snapshots (for fields ≤ 5 — larger fields just log `fieldName` to avoid event bloat).
- [ ] 6. DM dashboard "Recent events" feed shows `dm-edit` events with hovercards summarizing what changed.
- [ ] 7. Audit-friendly: events tab in session view can filter to `kind: 'dm-edit'`.

### Tests
- [ ] 8. e2e: DM changes player's HP to 0, event logged, player's sheet reflects the change, event visible in journal.

### Final
- [ ] 9. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 10. Commit: `feat(dm-view): omniedit + audit trail (plan 26)`

## Definition of Done
- [ ] DM can edit any non-locked field on any character in the campaign
- [ ] Lock indicator shown for owner-locked fields when DM views
- [ ] Every DM edit logs an event
- [ ] Audit feed works

## Notes for next plan
- **End of Sprint 3** — tag v0.0.3
- Plan 27 starts Sprint 4 with PixiJS map foundation
