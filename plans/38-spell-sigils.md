# Plan 38 — Spell card sigil animations

## Goal
When a player casts a spell, an SVG sigil traces itself on the screen as a cast animation — gold lines drawn over the spell card and an aurora flare. Each spell has a unique sigil generated procedurally from its school + level + components, so all 320 SRD spells get a consistent yet varied visual identity without hand-design.

## Context
Prototype's Magie section shows the visual direction. This plan operationalizes it as a real-time animation.

## Prerequisites
Plans 09 (Magie mode), 12 (dice engine — used by spells with damage).

## Steps

### Procedural sigil generator
- [ ] 1. `src/features/dice/sigils.ts`:
    - Input: `{ school, level, components, schoolColor }`
    - Output: SVG path string + animation params
- [ ] 2. Geometry per school (research a tasteful base):
    - Abjuration → hexagonal ward
    - Conjuration → multi-pointed star
    - Divination → eye/lens
    - Enchantment → interlocking circles
    - Evocation → radiating bursts (triangles)
    - Illusion → spirals
    - Necromancy → crescents + skull motif (stylized)
    - Transmutation → ouroboros + arrow loop
- [ ] 3. Complexity by level: cantrip = simple shape; 9th-level = layered, more ornate.
- [ ] 4. Component flourishes: V adds an aria petal; S adds curving hand-runes; M adds a circle binding the center.
- [ ] 5. Output deterministic per spell ID (seeded by hash of id) so the same spell always traces the same sigil.

### Animation
- [ ] 6. SVG `stroke-dasharray` + `stroke-dashoffset` trick: trace the path over ~1.5s.
- [ ] 7. Overlay opacity: 0 → 1 → 0.7 → 0 over 2.5s total.
- [ ] 8. Glow: SVG filter `feGaussianBlur` + duplicate path with wider stroke for halo.
- [ ] 9. Aurora flare: trigger an `<AuroraFlare />` component behind the sigil for 0.8s, school-colored.

### Wiring
- [ ] 10. In the spell-cast flow (plan 09 + radial FAB Sorts wedge), on cast trigger `castSpell(spellId)`:
    - Resolve spell content
    - Compute sigil
    - Show `<SpellSigilOverlay />` centered, animates in
    - Concurrently: roll damage (if any), play sound (if enabled), consume slot
    - After animation, dismiss overlay

### Settings respect
- [ ] 11. If `settings.reducedMotion === true` OR `prefers-reduced-motion: reduce`: skip animation, show static sigil 0.5s instead.
- [ ] 12. If `settings.soundOn === false`: skip sound.

### Cache
- [ ] 13. Sigil SVG strings cached in memory per spell ID (no recomputation in same session).

### Tests
- [ ] 14. Visual: snapshot a few key spells' SVGs (fireball, cure-wounds, eldritch-blast, wish).
- [ ] 15. Unit: deterministic generation (same input → same output).
- [ ] 16. e2e: cast fireball, see sigil animate.

### Final
- [ ] 17. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 18. Commit: `feat(magie): procedural spell sigil animations (plan 38)`

## Definition of Done
- [ ] Sigil generator produces visually distinct SVGs per spell
- [ ] Animation runs at 60fps on mid-range mobile
- [ ] reducedMotion respected
- [ ] No bundle weight increase > 15KB (sigil logic is procedural, no asset bloat)
- [ ] At least 3 manual reviews against different spells confirm "this feels right"

## Notes for next plan
- Plan 39 (public stats) uses sigils as visual signatures on the stats page (per spell most cast = its sigil prominently displayed).
- Post-v1: hand-designed signature sigils for iconic spells (fireball, wish, raise dead) overriding procedural defaults.
