# Plan 33 — Mode présentation / TV

## Goal
A full-screen presentation mode at `/campaign/:id/tv` designed for projecting on a TV during in-person sessions. Shows the active encounter (carte + tour de combat + état des participants) in big, glanceable visuals. **No interactive controls** — the DM continues to drive everything from their phone. Pure display.

## Context
Read prototype (Combat + Map sections), plan 32 (fog of war final state from S4 perspective).

## Prerequisites
Sprint 4 plans 29-32 complete. Plan 24 (encounters) for the data.

## Steps

### Route + activation
- [ ] 1. Route `/campaign/:id/tv` → `<TVPresentationScreen />`. Access: DM only.
- [ ] 2. Auto-fullscreen on entry (via Fullscreen API, after user gesture). Hide cursor after 3s idle.
- [ ] 3. Detect landscape large screen and apply TV layout. If accessed from phone/tablet, show a warning ("Ce mode est conçu pour un écran ≥ 16:9 / 1920×1080").

### Layout
- [ ] 4. Three zones:
    - **Top strip (10% height)**: campaign name + round/turn indicator big
    - **Left 70% width**: the map (PixiJS canvas, scaled to fit, fog of war applied as configured)
    - **Right 30% width**: vertical initiative tracker with all participants. Active turn highlighted (gold glow). Each row: portrait, name, HP bar large, conditions
- [ ] 5. Active turn: when init advances, the corresponding row animates (slide, pulse). Map view auto-centers on the active participant's token.

### Real-time sync
- [ ] 6. Subscribes to active encounter, active map, fog state — all via Firestore listeners.
- [ ] 7. Re-renders within < 1s of any change made from DM's phone.

### Visual style
- [ ] 8. Same aesthetic as the rest of the app — aurora background, glass panels, gold accents — but **scaled for distance viewing**. All text ≥ 24pt. High contrast. No emoji, no animations except critical alerts.
- [ ] 9. Critical alerts overlay (full-screen flash + caption): PJ tombe à 0 HP, crit, mort, fin de combat. 2s display.

### No-control safeguards
- [ ] 10. No clickable elements. No menu, no FAB, no settings. Exit-fullscreen via Esc. URL only accessible to DM (role check).
- [ ] 11. Activity timeout: if no Firestore update for 10 minutes, show "Session en pause" overlay.

### Accessibility / fallback
- [ ] 12. Keyboard shortcuts: `F` = toggle fullscreen, `Esc` = exit, `Space` = pause overlay manually (for breaks).

### Tests
- [ ] 13. e2e: DM opens /tv on a large viewport, sees map + init; DM moves a token from phone, TV reflects it.

### Final
- [ ] 14. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 15. Commit: `feat(tv): presentation mode (plan 33) — end Sprint 4`
- [ ] 16. Tag v0.0.4

## Definition of Done
- [ ] /tv renders correctly on 1920×1080
- [ ] All updates from DM phone propagate live
- [ ] No interactive controls visible
- [ ] Critical alerts trigger
- [ ] **End of Sprint 4** — tag v0.0.4

## Notes for next plan
- Plan 34 starts Sprint 5 (polish + launch + commercial bonuses).
- Post-v1: optional second TV mode for "exploration" (no combat — show map only, big descriptions, ambient music).
