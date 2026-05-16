# Plan 07 — Sheet Combat mode

## Goal
The Combat mode of the sheet: battle HUD with HP mega-card, initiative strip, conditions row, spell slot counts (compact), attacks list, party row (preparatory for S2 multi-player view), death saves modal. Adrien can manage Lyralei in a real fight from this screen.

## Context
Read `prototype/grimwar.html` (Combat section), `docs/DATA-MODEL.md` (character HP/conditions/attacks fields).

## Prerequisites
Plans 01-06 complete.

## Steps

### HP mega-card
- [x] 1. `src/features/sheet/modes/combat/hp-mega-card.tsx`. Décision tactique : la logique pure (damage absorption hp.temp→hp.current, heal clamp, massive death) est extraite dans `hp-combat.ts` pour unit-test isolé. Le pad numérique vit dans `number-pad.tsx` (modale glass centrée plutôt qu'overlay full-screen — moins agressif sur la fiche). Hook `useLongPress` partagé sous `src/shared/hooks/`.
- [x] 2. Modale auto-ouverte via `<DeathSavesModal />` qui lit `hp.current === 0` ou `status === 'dead'` — pas de callback de couplage entre HpMegaCard et la modale.

### Conditions row
- [x] 3. `conditions-row.tsx`: horizontal chips of current conditions (load condition names from public content). Tap to remove. "+" chip opens a picker with all conditions, search.

### Init + initiative
- [x] 4. L'initiative est dans `battle-hud.tsx` (et pas un fichier `init-chip.tsx` séparé) car elle partage le même rang que l'économie d'action dans le prototype — la séparer doublerait inutilement les composants. Le moteur de dés vit dans `src/shared/lib/dice.ts` (stub plan 12 — `rollD20(mod, advantage)`).
- [x] 5. Death saves vivent dans la modale dédiée, déclenchée à HP 0. Pas de section séparée.

### Spell slots compact
- [x] 6. `slots-compact.tsx`: row of slot-level chips, each showing `n/max` filled dots/runes. Tap to consume one slot. Long-press to restore.

### Attacks list
- [x] 7. `attacks-list.tsx`: dérive depuis `character.inventory.items` filtrés `equipped + category:'weapon'`. Class features attaques (ex: ranger/monk natural weapons) sont déferred plan 17 (level-up + class features) — S1 manual form ne supporte que des armes équipées.
- [x] 8. Tap = attaque + dégâts en séquence, toast combiné (att total + damage total + sub avec détail nat/mod/formule).
- [x] 9. Long-press → menu inline (Avantage / Désav. / Crit / ✕). `rollD20(mod, advantage)` + `rollDamage(formula, crit)` viennent de `src/shared/lib/dice.ts`. Le crit double les dés (pas le modificateur), SRD-conform.

### Party view (preparatory)
- [x] 10. `party-strip.tsx`: shows other PCs in the active campaign (S2-aware but no-op for S1). For S1, render an empty placeholder if no campaign joined yet.

### Death saves modal
- [x] 11. `death-saves-modal.tsx`: state machine pure dans `hp-combat.ts` → `applyDeathSaveOutcome(state, naturalRoll)`. La modale est juste un render layer qui patch Firestore selon le verdict.
- [x] 12. Stabilisation : deathSaves remis à 0. Mort : `status:'dead'` + read-only via attribut `data-readonly="true"` sur `<main>` + règle CSS qui désactive boutons/inputs/role=button sauf `[data-revive="true"]`. Pas de log `death` event ici — l'event-logger est plan 22, comme convenu.

### Revive (DM-only)
- [x] 12b. `isDM` exposé via `usePermissionContext()` (false en S1, plan 16 le câblera). Quand `status === 'dead'` et `isDM === true`, bouton "Ressusciter" porte `data-revive="true"` pour bypass le rideau read-only. Pas de log `revival` event — plan 22.

### Updaters
- [x] 13. Toutes les actions passent par `useUpdateCharacter()` (hook plan 06). Pas de try/catch supplémentaire — `useUpdateCharacter` capture déjà l'erreur, la pose dans son `error` state et la rethrow. Côté combat, on swallow le throw au `void applyDelta()` car le toast suffit en UX, l'erreur est visible dans la console + DevTools (queue offline gère le retry).

### Tests
- [x] 14. Unit: HP clamp + damage absorption (temp→current) + massive death.
- [x] 15. Unit: death save state machine (nat1/nat20/seuils/transitions).
- [ ] 16. e2e Playwright différé — Playwright n'est pas wired (plan 25 ou avant). 23 unit tests pures couvrent la state machine ; UAT manuel décrit dans le résumé final. Réouvrir si plan 25 ne le rattrape pas.

### Final
- [x] 17. `pnpm typecheck && pnpm test && pnpm lint`
- [x] 18. Commit: `feat(sheet): combat mode + HP mega-card + death saves (plan 07)`

## Definition of Done
- [x] HP modifiable, persists, visualization matches prototype
- [x] Conditions add/remove works
- [x] Spell slots consume/restore
- [x] Attack rolls work end-to-end
- [x] Death save modal works

## Notes for next plan
- Plan 12 (dice engine) doit remplacer le stub `src/shared/lib/dice.ts`. Surface actuelle : `rollD20(mod, advantage)`, `rollDamage(formula, crit)`. Tous les call sites passent par ces deux fonctions — pas de Math.random ailleurs. Le moteur custom plan 12 peut garder la même signature ou exposer un hook `useDice()` qui les wrappe.
- Plan 16 (memberships sync) câblera `isDM` dans `usePermissionContext()`. Aujourd'hui forcé à `false`. Le bouton "Ressusciter" est gardé `data-revive="true"` pour qu'il reste interactif sous `[data-readonly="true"]`. Owner-lock (`name`/`personality.*`/`homeCampaignId` non-éditables pour le MJ) reste au layer Cloud Function comme annoté dans plan 16.
- Plan 22 (event-logger) câblera : death event sur `applyDeathSaveOutcome === 'dead'`, revival event sur revive(). Aujourd'hui aucun event n'est loggé — uniquement les toasts UX. Les call sites sont concentrés dans `death-saves-modal.tsx` (~3 endroits).
- Toast system : `src/shared/lib/slices/toast-slice.ts` + `<ToastHost />` global. Surface stable : `showToast({ kind, title, big?, sub?, durationMs? })`. Si plan 22 veut convertir des toasts en events Firestore, c'est le seul point d'entrée à intercepter.
- Battle HUD est local-state pour l'économie d'action (pas Firestore). Si plan 23 (combat tracker DM) a besoin de la synchroniser avec le tour DM, lifter dans Firestore — sinon laisser local.
- ModePlaceholder a survécu pour Essence/Magie/Avoir/Âme. Plans 08/09/10/20 doivent remplacer le body du fichier mode correspondant (pas le placeholder partagé) ; les fichiers `essence-mode.tsx`, `magie-mode.tsx`, `avoir-mode.tsx`, `ame-mode.tsx` sont prêts à recevoir leur identité visuelle propre. La signature `(props: ModeProps) => JSX.Element` (avec `character: Character`) est déjà cohérente avec CombatMode.
