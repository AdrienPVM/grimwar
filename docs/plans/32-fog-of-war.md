# Plan 30 — Fog of war

## Goal
DM controls a persistent fog layer that hides unexplored areas of the map from players. DM can paint with brush/eraser to reveal/hide regions. Synced in real-time. End of Sprint 4.

## Context
Plans 27-29 (map + tokens + lighting).

## Prerequisites
Plans 27-29.

## Steps
- [ ] 1. Fog state stored as `campaigns/{id}/maps/{mapId}.fogState`: a bitmask (one bit per grid cell) or rasterized image (RLE-encoded). Pick rasterization for simplicity, store as base64 PNG.
- [ ] 2. PixiJS overlay above the map but below tokens/lighting: fog layer with `multiply` blend mode for the hidden cells.
- [ ] 3. DM toolbar (visible on map for DMs):
    - Brush/Eraser toggle
    - Brush size slider
    - "Tout révéler" / "Tout cacher" buttons
    - "Suivre les tokens" toggle: automatically reveals cells around player tokens as they move
- [ ] 4. Painting interaction: pointer drag on map (with brush tool) → reveal/hide cells. Debounced Firestore write (every 500ms or on pointer up).
- [ ] 5. Real-time sync: `onSnapshot` on map doc → fog layer re-renders for all participants.
- [ ] 6. Player view: areas under fog are completely hidden (black). DM view: areas under fog are dimmed but visible.
- [ ] 7. Auto-reveal: when "Suivre les tokens" is on, each token's position auto-reveals a small radius (typically 1-2 grid squares).

### Tests
- [ ] 8. e2e: DM reveals a room, player sees it; DM hides it, player sees the fog return.

### Final
- [ ] 9. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 10. Commit: `feat(map): fog of war (plan 30) — end Sprint 4`
- [ ] 11. Tag v0.0.4

## Definition of Done
- [ ] Fog renders correctly
- [ ] DM brush/eraser works
- [ ] Real-time sync within 2s
- [ ] Auto-reveal mode works
- [ ] Player view properly obscures fogged areas

## Notes for next plan
- End of Sprint 4. Map view feature-complete.
- Sprint 5 starts: polish + i18n + GDPR + launch.
