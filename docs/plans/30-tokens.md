# Plan 28 — Tokens

## Goal
Tokens for players (auto-placed from party), monsters (DM places from active encounter), and objects (DM-placed). Drag to move (players move their own; DM moves any). Real-time position sync via Firestore. Token labels (initials or sprite if available).

## Context
Plan 27 (map foundation). `docs/DATA-MODEL.md` (encounters.participants has `position`).

## Prerequisites
Plans 24, 27.

## Steps
- [ ] 1. `<TokensLayer />` PixiJS container on top of the map.
- [ ] 2. Token data: derived from the active encounter's `participants[].position`. If no active encounter, use a separate `campaigns/{id}/tokens` flat collection (deferred to post-v1 if not needed).
- [ ] 3. Render: circle sprite per token, colored by type (PC = blue, NPC = green, monster = red, object = neutral). Label centered (initials).
- [ ] 4. Snap to grid: token positions snap to grid-center. Diagonal movement = 1.5 × distance (5e rule, optional toggle).
- [ ] 5. Drag interaction: pointer down on token → start drag; pointer move → update position locally; pointer up → write to Firestore (`updateDoc(encounter, { participants: ... })`).
- [ ] 6. Permission: player can drag only their own token; DM can drag any. Enforced client-side + Firestore rules.
- [ ] 7. Listener: `onSnapshot` on encounter doc → if positions change from server, re-render tokens. Animate transitions smoothly (Pixi tweens).
- [ ] 8. Distance ruler: hold a measure key (or long-press) to drag a ruler showing distance (5ft increments). DM-only? Or all members?
- [ ] 9. Avatar/portraits: if a participant has a portrait, use a circular cropped sprite. Else, letter avatar.

### Tests
- [ ] 10. e2e: 2-user, DM moves a goblin token, player sees it move within 2s.
- [ ] 11. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 12. Commit: `feat(map): tokens + drag + sync (plan 28)`

## Definition of Done
- [ ] Tokens render
- [ ] Players move own, DM moves all
- [ ] Real-time sync works
- [ ] Snap to grid + distance ruler work

## Notes for next plan
- Plan 29 adds dynamic lighting that interacts with token positions.
