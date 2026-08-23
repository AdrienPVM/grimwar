# Plan 38 — Spell card sigil animations

## Goal
When a player casts a spell, an SVG sigil traces itself on the screen as a cast animation — gold lines drawn over the spell card and an aurora flare. Each spell has a unique sigil generated procedurally from its school + level + components, so all 320 SRD spells get a consistent yet varied visual identity without hand-design.

## Context
Prototype's Magie section shows the visual direction. This plan operationalizes it as a real-time animation.

## Prerequisites
Plans 09 (Magie mode), 12 (dice engine — used by spells with damage).

## Steps

### Procedural sigil generator
- [x] 1. `src/features/dice/sigils.ts` — `generateSigil({ spellId, school, level, components }) → SpellSigil`. La couleur d'école est dérivée en interne (`SCHOOL_COLORS`, tokens du DS) plutôt que passée en entrée.
- [x] 2. Geometry per school : abjuration → ward polygonal ; conjuration → étoile + cercle d'invocation ; divination → œil/lentille + cils ; enchantment → cercles entrelacés ; evocation → éclats triangulaires ; illusion → spirales ; necromancy → croissants en couronne (motif crâne jugé trop littéral → couronne de croissants) ; transmutation → ouroboros + flèche.
- [x] 3. Complexité par niveau : seuils ≥2/≥4/≥6 (et ≥3/≥5/≥7) ajoutent couches/points/ticks. Sort mineur = forme nue.
- [x] 4. Fioritures de composantes : V → 4 pétales cardinaux ; S → 4 runes en S diagonales ; M → cercle de liaison extérieur.
- [x] 5. Déterministe par spellId (PRNG mulberry32 amorcé par hash FNV-1a). `pathLength=1` sur chaque chemin → dasharray/offset en espace normalisé (pas de mesure runtime).

### Animation
- [x] 6. Tracé via `stroke-dashoffset` 1→0 (keyframe `traceSigil`, 1300 ms) + stagger par chemin (`animationDelay` inline, +90 ms/chemin).
- [x] 7. Cycle de vie de l'overlay : keyframe `sigilLife` opacité 0→1→0.85→0 sur 2600 ms, puis démontage (timer).
- [x] 8. Halo : groupe de chemins dupliqués, trait ×2.6, `blur(1.6px)`, opacité 0.5, école-coloré ; cœur doré net avec `drop-shadow` école-coloré.
- [x] 9. Éclat d'aurore derrière le sceau (keyframe `sigilFlare` scale+opacité), école-coloré — implémenté en `<div>` dédié plutôt qu'un composant `<AuroraFlare/>` séparé (un seul usage).

### Wiring
- [x] 10. Câblé dans `SpellDetailModal.handleCast` (le flux d'incantation réel du plan 09) — le radial FAB Sorts (plan 11) n'existe pas encore, on branche donc le cast existant. `triggerCastSigil()` déclenché à l'instant « cast engagé » (slot consommé/concentration posée/log émis), avant le jet de dégâts → l'anim recouvre la résolution. Overlay singleton monté dans `App.tsx` via le store `cast-fx-slice` (pattern toast-slice), `z-[85]` (sur la modale 80, sous jet physique 90 / gate 95 / toasts 100).

### Settings respect
- [x] 11. `prefers-reduced-motion: reduce` (via `window.matchMedia`) → aucun tracé/éclat animé, sceau complet statique ~0,7 s puis retrait. **Décision** : pas de champ `settings.reducedMotion` ajouté — ce serait une mutation du schéma user Firestore (cf. autonomy rules « Schema change »). On respecte uniquement la media query OS, suffisant et conforme.
- [x] 12. `settings.soundOn` — **N/A** : aucun système de son n'existe dans l'app (le plan 38 le supposait). Aucun son joué → rien à gater. À recâbler si/quand un système de son arrive (post-v1).

### Cache
- [x] 13. `Map` mémoire par clé `spellId|school|level|VSM` ; même clé → même référence d'objet (prouvé par test `toBe`). `_clearSigilCache()` exposé pour les tests.

### Tests
- [x] 14. Snapshots figés de 3 sceaux de référence (Boule de feu evo/L3/VSM, Trait du destin divi/L0/VS, Souhait conj/L9/V) — `sigils.test.ts`.
- [x] 15. Unit : déterminisme (indépendant du cache + référence cachée), couleurs distinctes par école (×8), géométrie distincte par école/id, complexité par niveau, comptage exact des fioritures V/S/M.
- [x] 16. e2e `spell-sigils-uat.spec.ts` : 5 écoles lancées en app + capture gelée du sceau + cas mouvement réduit. Overlay component test `spell-sigil-overlay.test.tsx` (rendu, identité couleur, aria-hidden/pointer-events, branche reduced, retrait auto).

### Final
- [x] 17. `pnpm typecheck && pnpm test && pnpm lint` verts (2908 unit + 182 matrix).
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
