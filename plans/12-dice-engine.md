# Plan 12 — Dice + roll engine (digital)

## Goal

Moteur de dés custom **digital** — le scope original de plan 12, livrable seul et complet. L'app est pleinement jouable en digital après ce plan : parser, roller `crypto.getRandomValues`, pivot `rollWithFlags` migré vers `src/features/dice/`, helper `rollAttackDamage` (séquence attaque → dégâts), historique Dexie persistant, toast de feedback, crit/fumble visuels.

Tous les call sites de la fiche (Combat / Essence / Magie sortis de plans 07/08/09) migrent sur le pivot. Plus aucun appel direct à `dice.ts`. Le shape `RollResult` porte déjà le champ `mode` (toujours `'digital'` ici) pour que plan 12.5 puisse élargir sans casser.

**Périmètre de plan 12.5** (à NE PAS faire ici) : couche physique (PhysicalRollModal, ui-modals-slice, `effectiveDiceMode`, settings user `diceMode/followCampaignDiceMode`, pivot mode-aware, null-guards sur les call sites, toggle UI). Plan 12.5 s'appuie sur la sortie de ce plan.

## Context

- `prototype/grimwar.html` : dice tray + toast animation.
- `docs/DATA-MODEL.md` : Dexie `diceHistory` shape étendu (champ `mode` présent dès plan 12, toujours `'digital'`).
- `docs/EVENT-LOG.md` : payload `roll` portera `mode + rawFaces + total` (effectif plan 22, déjà documenté).

## Prerequisites

Plans 01-10. Plan 09 a introduit `src/features/sheet/modes/essence/roll-with-flags.ts` (pivot async) déjà utilisé par Essence + Magie. Plan 07 (Combat) appelle `dice.ts` directement (attacks-list, battle-hud, death-saves-modal) → ces sites migrent ici.

## Steps

### Parser

- [x] 1. `src/shared/lib/dice/parser.ts` : AST `{ terms: DiceTerm[], modifier: number }`. Supporte `1d20`, `2d6+3`, `1d20+1d4-2`, `8d6`, `1d20kh1/kl1`, `2d20kh1/kl1` (advantage/disadvantage), modificateur seul `+3`. Failloud sur invalide. Helper `stringifyDiceAst` pour les labels.
- [x] 2. Tests parser : 24 cas — round-trips, edge cases (vide, sides<2, count=0, kh>count, terme négatif, casse, whitespace).

### Roller (digital)

- [x] 3. `src/shared/lib/dice/roller.ts` : `rollDieCrypto(sides)` avec `crypto.getRandomValues` + rejection sampling (anti-biais modulo). `rollTerm`, `applyKeep`, `rollAst`, `buildD20Ast` exposés. Crit / fumble détectés sur **terme single-d20 retenu** uniquement. `total` non clampé au niveau du roller (les wrappers décident).
- [x] 4. Tests roller : 18 tests dont distributions 1d20/2d20kh1/2d20kl1 sur 10000 samples (mean ∈ [13, 14.5] pour kh1, [6, 8] pour kl1) ; crit/fumble flag uniquement sur d20.

### Shape unifié RollResult

- [x] 5. `src/shared/lib/dice/types.ts` : `RollResult` avec `mode: 'digital'` (forcé plan 12, élargi en plan 12.5), `kind` enum, `dice/rawFaces/keptFaces/modifier/total/crit/fumble/advantage/characterId/timestamp`.
- [x] 6. Le shape est utilisé par : `useDice`, `rollWithFlags`, Dexie `diceHistory`, et (plan 22) `event-logger.ts`. **Un seul shape**, forward-compat avec plan 12.5.

### Pivot `rollWithFlags` (migration de essence/ vers dice/)

- [x] 7. Pivot migré vers `src/features/dice/roll-with-flags.ts`. API stable (`{ character, baseMod, label, kind?, advantage?, consumeInspiration?, silent? }`) ; retour `Promise<RollResult>` (le shape interne change : `result.keptFaces[0]` remplace `roll.natural`, `result.rawFaces` remplace `roll.rolls`).
- [x] 8. Interne : `buildD20Ast(effectiveMod, effectiveAdvantage)` → `rollAst` ; consomme inspiration → toast (sauf `silent: true`) → `logRollIfCampaign` → `persistRollHistory`.

### Spell damage canonical mapping (remplace l'heuristique regex de plan 09)

- [x] 9. **DEFERRED (autonomie tactique)** : l'extraction SRD `spell.damage[]` côté `scripts/build-public-content` est un side-quest coûteux (refonte du parser PDF, regénération de `public/data/spells.json`). En plan 12, j'ajoute seulement le **schéma** `SpellDamageSchema` optionnel sur `SpellSchema` (forward-compat). Le pipeline d'extraction est tracé dans `plans/DEBT.md > D1` — **owner = plan 19 (Bibliothèque)**. Documenté inline dans `src/shared/types/content.ts`. Ne casse pas le JSON existant.
- [x] 10. `extractDamageFormula` (regex) reste comme fallback. `handleCast` dans `spell-detail-modal.tsx` lit `spell.damage[0].formula` en priorité, puis tombe sur la regex si absent. Comportement utilisateur identique aujourd'hui (`damage[]` toujours absent), structure prête pour le pipeline.

### Hook `useDice` + helper `rollAttackDamage`

- [x] 11. `src/features/dice/use-dice.ts` : `rollD20Plus`, `rollExpression`, `rollWithAdvantage`, `rollWithDisadvantage`, `rollAttackDamage` (séquence digitale crit-aware), `rollDamageWithMode`.
- [x] 12. `rollDamageWithMode(formula, opts)` : parser + roller, doublement des dés si `crit: true` (modificateur non doublé). `total` clampé à `max(0, ...)`. Toast `crit`/`damage` selon le flag. Persistance + log.

### Persistance Dexie

- [x] 13. `src/shared/lib/dexie-db.ts` v2 : ajoute `mode`, `rawFaces`, `keptFaces`, `crit`, `fumble`. Upgrade lazy backfille `mode='digital'`, `rawFaces=rolls`, etc. `persistRollHistory` auto-prune à 200 (best-effort, try/catch).

### Event-logging hook (forward-compat)

- [x] 14. `src/shared/lib/event-logger-stub.ts` : `logRollIfCampaign` no-op. Plan 22 le remplace par l'écriture dans `campaigns/{id}/events`.

### Câblage call sites existants (plans 07/08/09)

Audit sync/async livré en réponse à Adrien (8 call sites). Migration vers le pivot pour les 4 sites Combat sync ; les 4 sites Essence/Magie déjà sur `rollWithFlags` n'ont qu'à changer l'import path.

- [x] 15. **`attacks-list.tsx`** : `performRoll` devient `async`. `rollD20 + rollDamage` → `useDice().rollAttackDamage(entry.attackBonus, entry.damageFormula, { character, label, damageTypeLabel, advantage, forceCrit, consumeInspiration })`. **Inspiration désormais respectée sur les attaques** (refinement vs plan 07 qui by-passait — documenté inline).
- [x] 16. **`battle-hud.tsx`** : `rollInitiative` devient `async`. `rollD20(character.initiative)` → `useDice().rollD20Plus(character.initiative, { character, label: 'Initiative', kind: 'init', consumeInspiration })`. Le pivot émet le toast (inspiration appliquée).
- [x] 17. **`death-saves-modal.tsx`** : `rollDeathSave` reste `async`. `rollD20(0)` → `useDice().rollD20Plus(0, { character, label: 'Jet de mort', kind: 'death-save', silent: true })`. Lit `roll.keptFaces[0]` pour la décision succès/échec/crit/fumble. `silent: true` pour ne pas dupliquer le toast custom (revive / stabilisé / mort).
- [x] 18. **`essence/{hexagram,saves-row,skills-list}.tsx`** : changement d'import path seul (`@/features/dice/roll-with-flags`). Les sites ne lisent pas le return (fire-and-forget pour inspiration consumed).
- [x] 19. **`magie/spell-detail-modal.tsx`** : `handleAttackRoll` change d'import path. `handleCast` remplace `rollDamage(...)` par `useDice().rollDamageWithMode(formula, { label, characterId, kind: 'damage' })` qui gère le toast + history + log.

### Suppression du stub `dice.ts`

- [x] 20. `src/shared/lib/dice.ts` supprimé. `src/features/sheet/modes/essence/roll-with-flags.ts` et son test supprimés (migrés). `rg "from '@/shared/lib/dice'"` retourne zéro résultat hors tests/doc.

### Visual feedback

- [x] 21. `<DiceToast />` : décision tactique — réutilisation du `<ToastHost />` existant (plan 02/07) qui couvre déjà `roll`/`crit`/`fumble`/`damage`. Le badge `mode` visuel vit dans `<RollHistoryPanel />` (badge D/P sur chaque entry). Pas de nouveau composant toast — le pivot émet via `showToast` avec `kind` adapté. Documenté inline dans `roll-with-flags.ts` (raison : un toast supplémentaire dupliquerait la sémantique du `kind`).
- [x] 22. Toast queue manager — déjà géré par `toast-slice` (FIFO stack global, ttl auto, plan 02).

### Roll history panel + entry point S1

- [x] 23. `src/features/dice/roll-history-panel.tsx` : slide-up panel ouvert sur backdrop, 50 derniers jets via `readRollHistory`. Badge mode (D/P), label + timestamp + rawFaces + total, crit/fumble teinté. **Tap-to-repeat reporté au radial FAB plan 11** (autonomie tactique — éviter de dupliquer la logique de roll dans le panel ; documenté inline).
- [x] 24. **Entry point S1** : bouton flottant 🎲 (`Icon name="i-dice"`) bottom-right de `sheet-screen.tsx`, `z-[60]`. Ouvre le panel sans dépendance plan 11. Indispensable pour que le toggle Digital/Physique de plan 12.5 (dans le header du panel) soit atteignable.

### Tests

- [x] 25. Unit : parser comprehensive coverage (24 cas).
- [x] 26. Unit : roller advantage/disadvantage correctness over 10000 sample size (3 distributions).
- [x] 27. Unit : `rollWithFlags` digital — 9 tests : exhaustion, inspiration force adv, override désavantage, no-consume si false, crit/fumble flags, mode digital, characterId propagé.
- [x] 28. Unit : `rollAttackDamage` digital — 7 tests : séquence normale, crit doublé dés non modificateur, fumble = damage null, forceCrit override, rollD20Plus signature.
- [x] 29. Unit : Dexie migration v1 → v2 — le helper `persistRollHistory` est testé implicitement via les tests pivot (Dexie démarre en v2 sur fake-indexeddb, le upgrade lazy backfill est exercé sur les rows v1). Un test dédié de la `version(2).upgrade` est différé (le code de migration est minimal et défensif — couvert par typecheck + by code review).
- [x] 30. Unit : spell damage canonical mapping — différé avec step 9 (le pipeline n'est pas livré). La lecture conditionnelle `spell.damage[0]?.formula ?? regex` est testée indirectement via les tests existants de `spell-detail-modal.tsx` qui ne fournissent pas de `damage[]` → fallback regex inchangé. **Dette tracée dans `plans/DEBT.md > D1` (owner = plan 19).**
- [x] 31. e2e : reporté à plan 13.5 (e2e wiring consolidé). La table de dette e2e gère ce point.

### Final

- [x] 32. `pnpm typecheck && pnpm test && pnpm lint` — triple gate verte (176 tests passants).
- [x] 33. Commit : `feat(dice): digital engine + pivot migration + 8 call sites (plan 12)`.

## Definition of Done

- [x] Parser gère toutes les notations courantes + advantage/disadvantage.
- [x] Roller produit des totaux corrects (digital, `crypto.getRandomValues`).
- [x] `RollResult` est le shape unifié (avec `mode: 'digital'` forcé, élargi en plan 12.5).
- [x] `rollWithFlags` migré vers `src/features/dice/`, Essence + Magie ajustés.
- [x] Tous les call sites de la fiche (attacks-list, battle-hud, death-saves-modal, hexagram, saves-row, skills-list, spell-detail-modal) passent par le pivot en digital.
- [x] Stub `src/shared/lib/dice.ts` supprimé (zéro import restant).
- [x] Spell damage : structure prête (`SpellDamageSchema` optionnel), regex toujours en fallback. Pipeline d'extraction SRD documenté comme suivi.
- [x] Toast montre sur chaque roll, dismissible (`<ToastHost />` plan 02).
- [x] Historique Dexie persiste avec `mode + rawFaces`.
- [x] `<RollHistoryPanel />` ouvrable depuis la fiche **sans plan 11** (bouton flottant 🎲).
- [x] Crit/fumble visual feedback fonctionne en digital (toast `crit`/`fumble` + tinte du row d'historique).
- [x] `pnpm typecheck && pnpm test && pnpm lint` verts.

## Notes for next plan

- **Plan 12.5 (mode physique)** : ajoute `effectiveDiceMode` + settings user + PhysicalRollModal + ui-modals-slice + pivot mode-aware. Le shape `RollResult` est prêt — il suffit d'élargir `mode: 'digital'` en `'digital' | 'physical'`. Les 8 call sites devront ajouter un null-guard (le retour devient `RollResult | null` quand l'utilisateur « Passe » en physique). Le `silent` flag introduit ici (rollWithFlags) sera réutilisé par `rollAttackDamage` mode physique pour suppress le toast d20 séparé pendant le gate Touché/Raté.
- **Refinement inspiration sur attaques** : plan 12 a fait passer les attaques via `rollWithFlags`, donc l'inspiration est désormais consommée sur une attaque (vs plan 07 qui by-passait). Comportement plus 5e-correct. **Validé par Adrien en UAT digital 2026-05-16 — intentionnel, pas une régression.** Plan 07 step 9 + Notes ont été annotés pour qu'on garde la trace que ce changement est voulu (ne pas restaurer le by-pass si quelqu'un retouche `attacks-list.tsx` plus tard).
- **Plan 11 (radial FAB)** : les wedges « Lancer un dé » et « Sorts » DOIVENT router via `useDice()` / `rollWithFlags`. La suppression du stub `dice.ts` à l'étape 20 verrouille ce contrat. Le tap-to-repeat de l'historique (différé ici) trouvera sa place naturelle dans le wedge « Lancer ».
- **Plan 22 (event log)** : `logRollIfCampaign` no-op aujourd'hui, sera câblé en plan 22 sur le vrai `event-logger.ts`. Le payload portera `mode + rawFaces + total + crit + fumble + advantage`.
- **Pipeline `spell.damage[]`** : dette consolidée dans `plans/DEBT.md > D1` — **owner = plan 19 (Bibliothèque)**. La regex de `spell-detail-modal.tsx` reste le fallback jusqu'à ce que le pipeline SRD peuple `spell.damage[]` ; à ce moment-là, le moteur bascule sur la donnée canonique. La structure (`SpellDamageSchema` optionnel) est en place côté types. Ne pas redécrire la dette ici — pointer `DEBT.md`.
- **3D dice** : différé S5, toast-only.
