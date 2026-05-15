# Plan 29 — Dynamic lighting + line of sight

## Goal
Light sources from the .dd2vtt + DM-placed lights illuminate the map. Each PC token has vision (darkvision range per ancestry). Walls block light. The map renders an overlay revealing only what each viewer's tokens can see.

## Context
.dd2vtt provides walls (segments) and lights (point sources with radius). 5e vision: darkvision (range, dim light), blindsight, truesight.

## Prerequisites
Plans 27-28.

## Steps
- [ ] 1. `src/features/map/los.ts` — line-of-sight calculator:
    - Input: viewer position, wall segments, lights, viewer's vision (range, darkvision range)
    - Output: visibility polygon (the area the viewer can see)
    - Algorithm: ray-casting + segment intersection (use a known algorithm — see Owlbear Rodeo or Mara's lighting implementations as reference)
- [ ] 2. PixiJS overlay: a black overlay with the visibility polygons cut out (use mask + graphics).
- [ ] 3. Per-viewer rendering:
    - DM sees everything (no LOS overlay)
    - Players see union of all their tokens' visibility polygons
- [ ] 4. Lights data:
    - From .dd2vtt: imported on map upload
    - DM can add/edit/remove lights via a "Manage lights" tool in the map view
    - Each light: position, color, radius (bright), dim radius
- [ ] 5. Token vision:
    - From character data: derived from ancestry darkvision + active spells (e.g. light spell adds a light source on the token)
- [ ] 6. Performance: throttle LOS recompute to 30fps max during drag. Use WebWorker for heavy maps (post-v1 optimization).

### Tests
- [ ] 7. Unit: LOS algorithm against fixture geometries.
- [ ] 8. e2e: player token can't see beyond a wall; DM sees everything.

### Final
- [ ] 9. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 10. Commit: `feat(map): dynamic lighting + LOS (plan 29)`

## Definition of Done
- [ ] Light sources illuminate
- [ ] Walls block vision
- [ ] DM sees all, players see only their tokens' fields of view
- [ ] Performance acceptable on a 50-token map

## Notes for next plan
- Plan 30 adds DM-controlled fog of war on top of LOS.
