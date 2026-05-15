# Plan 27 — PixiJS foundation + .dd2vtt import

## Goal
A map view at `/campaign/:id/map` renders a Dungeon Alchemist `.dd2vtt` export with the right grid, walls preview, and pan/zoom/pinch viewport. No tokens, no lighting yet — just the canvas reading the map.

## Context
.dd2vtt format spec: JSON with base64 image + walls + lights + portals. PixiJS v8.

## Prerequisites
Sprint 3 complete.

## Steps
- [ ] 1. Install: `pnpm add pixi.js@^8`.
- [ ] 2. Route `/campaign/:id/map` → `<MapScreen />`. Lazy-loaded (separate chunk; PixiJS is ~300KB gzipped).
- [ ] 3. `<MapImport />` component: file input accepting `.dd2vtt`. Parses JSON, stores in Firestore under `campaigns/{id}/maps/{mapId}`.
- [ ] 4. Image data: decoded base64 → Blob → uploaded to Firebase Storage at `campaigns/{id}/maps/{mapId}/image.webp`. Reference URL stored in map doc.
- [ ] 5. `<MapCanvas />` mounts PixiJS Application, sized to container, with retina-aware resolution.
- [ ] 6. Base layer: render the map image as a Sprite, sized to pixels (use `pixelsPerGrid` × grid dims for world coords).
- [ ] 7. Viewport: pan with drag, zoom with wheel/pinch, clamp limits. Use `pixi-viewport` (add to deps).
- [ ] 8. Walls (preview only): render as faint red lines on a debug overlay. Real wall use comes in plan 29 (lighting).
- [ ] 9. Grid overlay: 1px grid lines, toggleable.
- [ ] 10. Resize handler: re-render on container size change.

### Tests
- [ ] 11. e2e: upload `.dd2vtt`, see map render, pan and zoom work.
- [ ] 12. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 13. Commit: `feat(map): PixiJS foundation + .dd2vtt import (plan 27)`

## Definition of Done
- [ ] Map renders correctly
- [ ] Pan/zoom works on desktop and mobile
- [ ] Walls visible in debug overlay
- [ ] Bundle separation verified (map chunk lazy)

## Notes for next plan
- Plan 28 adds tokens on top of this canvas.
