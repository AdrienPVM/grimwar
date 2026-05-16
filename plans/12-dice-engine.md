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

- [ ] 1. `src/shared/lib/dice/parser.ts` :
    - Supporte : `1d20`, `2d6+3`, `1d20+1d4-2`, `8d6` (boule de feu), `1d20kh1` (advantage), `1d20kl1` (disadvantage), `2d20kh1` (advantage), `2d20kl1` (disadvantage).
    - AST : `{ terms: DiceTerm[], modifier: number }` avec `{ count, sides, kh?: number, kl?: number }`.
- [ ] 2. Tests parser (20+ cas, dont edge cases : modificateur seul `+3`, espaces, casse).

### Roller (digital)

- [ ] 3. `src/shared/lib/dice/roller.ts` :
    - `roll(ast, opts?)` → `{ rawFaces: number[], keptFaces: number[], perTerm: TermResult[], total: number, modifier: number, crit: boolean, fumble: boolean }`.
    - Crit / fumble détectés sur **terme single-d20** uniquement (nat 20 / nat 1 sur d20 retenu).
    - RNG : `crypto.getRandomValues` (jamais `Math.random`). Le stub `src/shared/lib/dice.ts` utilisait `Math.random` et est remplacé.
- [ ] 4. Tests roller : distribution `kh/kl` sur 10000 échantillons, somme correcte, crit/fumble flag uniquement sur d20.

### Shape unifié RollResult

- [ ] 5. `src/shared/lib/dice/types.ts` :
    ```ts
    interface RollResult {
      kind: 'attack' | 'damage' | 'check' | 'save' | 'init' | 'death-save' | 'cantrip-attack' | 'custom';
      label: string;
      mode: 'digital';                   // élargi en plan 12.5 → 'digital' | 'physical'
      dice: DiceTerm[];                  // spec demandée (1d20, 2d6, …)
      rawFaces: number[];                // faces rollées (digital)
      keptFaces: number[];               // sous-ensemble retenu (advantage/disadvantage)
      modifier: number;
      total: number;
      crit: boolean;
      fumble: boolean;
      advantage: 'normal' | 'advantage' | 'disadvantage';
      characterId: string;
      timestamp: number;
    }
    ```
- [ ] 6. Le shape est utilisé par : `useDice`, `rollWithFlags`, Dexie `diceHistory`, et (plan 22) `event-logger.ts`. **Un seul shape**, forward-compat avec plan 12.5 (qui passera `mode` à union).

### Pivot `rollWithFlags` (migration de essence/ vers dice/)

- [ ] 7. Migrer `src/features/sheet/modes/essence/roll-with-flags.ts` vers `src/features/dice/roll-with-flags.ts` (le module n'appartient plus à Essence ; il devient le pivot global de la fiche). Ajuster les imports existants (Essence + Magie). Garder l'API actuelle (`{ character, baseMod, label, advantage?, consumeInspiration? }`) mais le retour devient `RollResult` (le shape unifié remplace `RollWithFlagsResult`). `roll.natural` / `roll.total` / `roll.rolls` deviennent `result.keptFaces[0]` / `result.total` / `result.rawFaces` — ajuster les call sites.
- [ ] 8. En interne, `rollWithFlags` :
    - Calcule `effectiveMod = baseMod − 2 × exhaustion` + `effectiveAdvantage = inspiration ? 'advantage' : advantage`.
    - Construit l'AST `1d20[+mod]` (ou `2d20kh1` / `2d20kl1` selon advantage) via le parser.
    - Roule via `roller.roll(ast)` → `RollResult`.
    - Consomme l'inspiration (patch Firestore) avant le retour.
    - Émet le toast `roll/crit/fumble`.
    - Appelle le stub `logRollIfCampaign(rollResult)` (no-op S1).
    - Retourne `Promise<RollResult>` (toujours non-null en plan 12 — plan 12.5 élargit à `| null`).

### Spell damage canonical mapping (remplace l'heuristique regex de plan 09)

- [ ] 9. Pendant `scripts/build-public-content`, extraire pour chaque sort une liste structurée de dégâts depuis le SRD : `damage: Array<{ formula: string, type: DamageType, atHigherLevels?: { perLevel: string } }>`. Persister dans `public/data/spells.json` à côté de la description.
- [ ] 10. Remplacer `extractDamageFormula` (regex sur description FR) dans `src/features/sheet/modes/magie/spell-detail-modal.tsx` par une lecture directe de `spell.damage[]`. Garder le toast actuel comme fallback si `damage` est absent (sorts utilitaires sans dégâts). Couvre les dés multiples, les dégâts par-niveau-supérieur, et les types de dégâts. Mettre à jour le test correspondant.

### Hook `useDice` + helper `rollAttackDamage`

- [ ] 11. `src/features/dice/use-dice.ts` :
    - `rollD20Plus(mod, opts)` — convenience d20 + mod plat (wrapper `rollWithFlags`).
    - `rollExpression(expr, opts)` — générique parser+roller, retourne `RollResult`.
    - `rollWithAdvantage(mod, opts)` / `rollWithDisadvantage(mod, opts)`.
    - `rollAttackDamage(attackBonus, damageExpr, opts)` — séquence digitale : jet d'attaque via `rollWithFlags` → si crit, applique `roller` avec dés de dégâts **doublés** (modificateur non doublé, conforme SRD 5e) ; sinon, dégâts normaux. Un seul toast combiné « Attaque X → Dégâts Y ». Retourne `{ attack: RollResult, damage: RollResult | undefined }` (undefined si fumble — pas de dégâts).
    - `useRollHistory()` — renvoie les 50 derniers jets de Dexie, filtre `characterId` optionnel.
- [ ] 12. Wrapper dégâts seuls `rollDamageWithMode(formula, opts)` (interne à `use-dice.ts` ou exporté) : digital → roule via `roller` directement. **Note plan 12.5** : ce wrapper deviendra mode-aware (physique → `<PhysicalRollModal />`).

### Persistance Dexie

- [ ] 13. Dexie `diceHistory` migration `version(2)` :
    - Ajoute `mode` (toujours `'digital'` en plan 12), `rawFaces`, `keptFaces`, `crit`, `fumble`.
    - Backfill des anciens enregistrements (s'il y en a — plan 12 est probablement le premier à écrire) : `mode='digital'`, `rawFaces=rolls`, `keptFaces=rolls`, `crit=false`, `fumble=false`.
    - Limite 200 jets, auto-prune à l'écriture.

### Event-logging hook (forward-compat)

- [ ] 14. `src/shared/lib/event-logger-stub.ts` :
    - `logRollIfCampaign(rollResult: RollResult): Promise<void>` — no-op S1.
    - Sera remplacé par la vraie implémentation plan 22 qui écrit dans `campaigns/{id}/events`.

### Câblage call sites existants (plans 07/08/09)

Audit sync/async livré en réponse à Adrien (8 call sites au total). Migration vers le pivot pour les 4 sites Combat sync ; les 4 sites Essence/Magie déjà sur `rollWithFlags` ajustent juste le shape de retour.

- [ ] 15. **`src/features/sheet/modes/combat/attacks-list.tsx`** :
    - `performRoll(entry, advantage, forceCrit)` devient `async`.
    - Remplace `rollD20(...) + rollDamage(...)` par `useDice().rollAttackDamage(entry.attackBonus, entry.damageFormula, { label, advantage, forceCrit })`.
    - Le handler `onPerform` du `<AttackRow />` accepte une promesse (déjà compatible côté React).
- [ ] 16. **`src/features/sheet/modes/combat/battle-hud.tsx`** :
    - `rollInitiative` devient `async`. Remplace `rollD20(character.initiative)` par `useDice().rollD20Plus(character.initiative, { label: 'Initiative', kind: 'init' })`.
- [ ] 17. **`src/features/sheet/modes/combat/death-saves-modal.tsx`** :
    - `rollDeathSave` est déjà `async`. Remplace `rollD20(0)` par `useDice().rollD20Plus(0, { label: 'Jet de mort', kind: 'death-save' })`. Lire `result.keptFaces[0]` au lieu de `roll.natural` pour la décision succès/échec/crit/fumble.
- [ ] 18. **`src/features/sheet/modes/essence/{hexagram,saves-row,skills-list}.tsx`** : déjà sur `rollWithFlags`. Le retour change : `result.roll.natural` devient `result.keptFaces[0]`, `result.roll.rolls` devient `result.rawFaces`, `result.roll.total` devient `result.total`. L'API publique `rollWithFlags({...})` reste stable, c'est le shape interne qui change.
- [ ] 19. **`src/features/sheet/modes/magie/spell-detail-modal.tsx`** :
    - `handleAttackRoll` : déjà sur `rollWithFlags`, ajuster le shape de retour comme étape 18.
    - `handleCast` : remplacer `rollDamage(damageFormula)` par `useDice().rollDamageWithMode(formula, { label: 'Dégâts · ' + spellName, kind: 'damage' })`.

### Suppression du stub `dice.ts`

- [ ] 20. Une fois les 8 call sites migrés, **supprimer** `src/shared/lib/dice.ts` (le stub plan 07). `rg "from '@/shared/lib/dice'"` doit retourner zéro résultat hors tests. Les anciens tests qui mockaient `rollD20` / `rollDamage` migrent vers `roller` ou `useDice`.

### Visual feedback

- [ ] 21. `<DiceToast />` component : top-center toast avec :
    - Label du jet.
    - Per-die animated value pop (animation `pop` sur chaque face).
    - Total avec modificateur.
    - Crit : flash doré + icône spéciale.
    - Fumble : flash rouge.
    - Indicateur `mode: digital` (badge **D**) — plan 12.5 ajoutera **P** pour physique.
    - Auto-dismiss 3s, persiste si hovered/tapped.
- [ ] 22. Toast queue manager — stack multiple rolls.

### Roll history panel + entry point S1

- [ ] 23. `<RollHistoryPanel />` slide-up panel from bottom, 50 derniers jets avec timestamps, character names. Filtre par character. Badge `mode` (D) à côté du label. Tap a roll → repeat.
- [ ] 24. **Entry point S1** : un petit bouton « 🎲 » (ou icon `dice-d20`) sur la fiche, accessible **sans dépendre de plan 11 (radial FAB)**. Emplacement = ton choix tactique. Plan 11 ajoutera le wedge dédié, mais le panel doit être ouvrable indépendamment dès plan 12 — sinon le toggle ajouté par plan 12.5 (dans le header du panel) est inatteignable. Documente l'emplacement inline.

### Tests

- [ ] 25. Unit : parser comprehensive coverage (étape 2).
- [ ] 26. Unit : roller advantage/disadvantage correctness over 10000 sample size (étape 4).
- [ ] 27. Unit : `rollWithFlags` digital — happy path + crit + fumble + inspiration consumée + exhaustion.
- [ ] 28. Unit : `rollAttackDamage` digital — attaque normale, attaque crit dés doublés (modificateur non doublé), attaque fumble (pas de dégâts).
- [ ] 29. Unit : Dexie migration v1 → v2 backfill correct.
- [ ] 30. Unit : spell damage canonical mapping — sort avec `spell.damage[]` lit la structure, sort sans `damage` fallback toast simple.
- [ ] 31. e2e : tap entry-point `<RollHistoryPanel />` → ouvre le panel ; tap d'un roll passé → repeat. (e2e du wedge radial reporté à plan 11.)

### Final

- [ ] 32. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 33. Commit : `feat(dice): digital engine + pivot migration + 8 call sites (plan 12)`

## Definition of Done

- [ ] Parser gère toutes les notations courantes + advantage/disadvantage.
- [ ] Roller produit des totaux corrects (digital, `crypto.getRandomValues`).
- [ ] `RollResult` est le shape unifié (avec `mode: 'digital'` forcé, élargi en plan 12.5).
- [ ] `rollWithFlags` migré vers `src/features/dice/`, Essence + Magie ajustés.
- [ ] Tous les call sites de la fiche (attacks-list, battle-hud, death-saves-modal, hexagram, saves-row, skills-list, spell-detail-modal) passent par le pivot en digital.
- [ ] Stub `src/shared/lib/dice.ts` supprimé (zéro import restant).
- [ ] Spell damage lu depuis `spell.damage[]` (regex retirée), fallback si absent.
- [ ] Toast montre sur chaque roll, dismissible, badge mode visible.
- [ ] Historique Dexie persiste avec `mode + rawFaces`.
- [ ] `<RollHistoryPanel />` ouvrable depuis la fiche **sans plan 11**.
- [ ] Crit/fumble visual feedback fonctionne en digital.
- [ ] `pnpm typecheck && pnpm test && pnpm lint` verts.

## Notes for next plan

- **Plan 12.5 (mode physique)** : ajoute `effectiveDiceMode` + settings user + PhysicalRollModal + ui-modals-slice + pivot mode-aware. Le shape `RollResult` est déjà prêt — il suffit d'élargir `mode: 'digital'` en `'digital' | 'physical'`. Les 8 call sites devront ajouter un null-guard (le retour devient `RollResult | null` quand l'utilisateur « Passe » en physique).
- **Plan 11 (radial FAB)** : les wedges « Lancer un dé » et « Sorts » DOIVENT router via `useDice()` / `rollWithFlags` — jamais appeler une lib de dés directement. La suppression du stub `dice.ts` à l'étape 20 verrouille ce contrat.
- **Plan 22 (event log)** : `logRollIfCampaign` no-op aujourd'hui, sera câblé en plan 22 sur le vrai `event-logger.ts`. Le payload portera `mode + rawFaces + total + crit + fumble`.
- **Plan 24 (encounters)** : hand-off MJ pour les dégâts physiques (S2/S3). Non concerné par plan 12.
- **3D dice** : différé S5, toast-only.
- **Damage type / atHigherLevels** : la structure `spell.damage[]` introduite ici sera consommée par combat tracker plan 24 et journal compiler plan 25.
