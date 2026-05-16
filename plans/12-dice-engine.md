# Plan 12 — Dice + roll engine (mode-aware : digital + physique)

## Goal

Moteur de dés custom **mode-aware**. Deux modes :

- **Digital** (actuel) : l'app lance pour le joueur (RNG `crypto.getRandomValues`).
- **Physique** : l'app indique quoi lancer IRL (« Lance 1d20 — Attaque à l'épée longue »), le joueur saisit la/les **face(s) brute(s)** ; l'app applique les modificateurs, détecte nat 20/1, gère avantage/désavantage, calcule le total. La saisie est **optionnelle** (le joueur peut « Passer » et fermer sans rien logger).

Un **`useDice()`** unique expose `rollD20Plus`, `rollExpression`, `rollAttackDamage`, etc., en branchant en interne sur le mode effectif. Tous les call sites de la fiche (Combat / Essence / Magie sortis de plans 07/08/09) migrent sur le pivot `rollWithFlags` (déjà async). Historique persisté Dexie. Toast feedback. Crit/fumble visuel. Hook `logRollIfCampaign` no-op pour S1, vrai dans plan 22.

## Context

- `prototype/grimwar.html` : dice tray + toast animation.
- `docs/DATA-MODEL.md` : section « Dice mode resolution » + `users.settings.{diceMode, followCampaignDiceMode}` + `campaigns.settings.diceMode` + Dexie `diceHistory` shape étendu.
- `docs/EVENT-LOG.md` : payload `roll` portera `mode + rawFaces + total` (effectif plan 22).

## Prerequisites

Plans 01-06. Plan 09 a introduit `src/features/sheet/modes/essence/roll-with-flags.ts` (pivot async) déjà utilisé par Essence + Magie. Plan 07 (Combat) appelle `dice.ts` directement (attacks-list, battle-hud, death-saves-modal) → ces sites migrent ici.

## Steps

### Helper de mode + settings

- [ ] 1. `src/shared/lib/rules/dice-mode.ts` :
    - `type DiceMode = 'digital' | 'physical'`.
    - `effectiveDiceMode(user, campaign|null)` — règle dans DATA-MODEL.md.
    - En S1, `campaign` est toujours `null` (aucune campagne) → retourne `user.settings.diceMode`.
    - Tests unitaires : 4 cas (pas de campagne / follow=true / follow=false / défaut).
- [ ] 2. Schéma user étendu : `users/{uid}.settings.diceMode: 'digital' | 'physical'` (défaut `'digital'`), `users/{uid}.settings.followCampaignDiceMode: boolean` (défaut `true`). Mettre à jour `src/shared/types/character.ts` ou le type user qui le porte (vérifier où vit `UserDoc`), bump `schemaVersion` user si présent, migration lazy `if missing → defaults`.
- [ ] 3. `src/shared/lib/slices/user-settings-slice.ts` (ou équivalent existant) : exposer `diceMode` lu depuis Firestore + setter `setDiceMode(next)` qui patch `users/{uid}.settings.diceMode`. Si le slice n'existe pas encore, intégrer dans le slice user/auth existant. **Décision tactique** = ton choix d'emplacement (documente-le inline).

### Parser

- [ ] 4. `src/shared/lib/dice/parser.ts` :
    - Supporte : `1d20`, `2d6+3`, `1d20+1d4-2`, `8d6` (boule de feu), `1d20kh1` (advantage), `1d20kl1` (disadvantage), `2d20kh1` (advantage), `2d20kl1` (disadvantage).
    - AST : `{ terms: DiceTerm[], modifier: number }` avec `{ count, sides, kh?: number, kl?: number }`.
- [ ] 5. Tests parser (20+ cas, dont edge cases : modificateur seul `+3`, espaces, casse).

### Roller (digital)

- [ ] 6. `src/shared/lib/dice/roller.ts` :
    - `roll(ast, opts?)` → `{ rawFaces: number[], keptFaces: number[], perTerm: TermResult[], total: number, modifier: number, crit: boolean, fumble: boolean }`.
    - Crit / fumble détectés sur **terme single-d20** uniquement (nat 20 / nat 1 sur d20 retenu).
    - RNG : `crypto.getRandomValues` (jamais `Math.random`).
- [ ] 7. Tests roller : distribution `kh/kl` sur 10000 échantillons, somme correcte, crit/fumble flag uniquement sur d20.

### Shape unifié RollResult

- [ ] 8. `src/shared/lib/dice/types.ts` :
    ```ts
    interface RollResult {
      kind: 'attack' | 'damage' | 'check' | 'save' | 'init' | 'death-save' | 'cantrip-attack' | 'custom';
      label: string;
      mode: DiceMode;
      dice: DiceTerm[];                  // spec demandée (1d20, 2d6, …)
      rawFaces: number[];                // faces saisies (physique) ou rollées (digital)
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
- [ ] 9. Le shape est utilisé par : `useDice`, `rollWithFlags`, `<PhysicalRollModal />`, Dexie `diceHistory`, et (plan 22) `event-logger.ts`. Un seul shape pour les deux modes — c'est le pivot de cette refonte.

### Pivot `rollWithFlags` mode-aware

- [ ] 10. Migrer `src/features/sheet/modes/essence/roll-with-flags.ts` vers `src/features/dice/roll-with-flags.ts` (le module n'appartient plus à Essence ; il devient le pivot global de la fiche). Ajuster les imports existants (Essence + Magie). Garder l'API actuelle (`{ character, baseMod, label, advantage?, consumeInspiration? }`) mais le retour devient `RollResult` (extension rétrocompatible : `roll.total/natural/rolls` restent accessibles via le shape unifié).
- [ ] 11. En interne, `rollWithFlags` :
    - Calcule `effectiveMod = baseMod − 2 × exhaustion` + `effectiveAdvantage = inspiration ? 'advantage' : advantage`.
    - Lit le mode effectif via `effectiveDiceMode(user, campaign)` (S1 : `campaign=null`).
    - **Digital** : `roller.roll(...)` → `RollResult`.
    - **Physique** : ouvre `<PhysicalRollModal />` via le store UI dédié (cf. plan 10 décision tactique : store dédié partagé pour modales), attend la résolution :
      - Validation → calcule `RollResult` à partir des `rawFaces` saisies.
      - Annulation → retourne `null` (la promesse résout à `null`, aucun toast, aucun log, aucun patch).
    - Consomme l'inspiration (patch Firestore) **uniquement si la roll a abouti** (digital toujours, physique seulement si non-cancellée).
    - Émet le toast `roll/crit/fumble`.
    - Appelle le stub `logRollIfCampaign(rollResult)` (no-op S1).
- [ ] 12. Sortie de `rollWithFlags`: `Promise<RollResult | null>`. Tous les call sites traitent `null` = annulation propre (aucun side effect attendu).

### `<PhysicalRollModal />`

- [ ] 13. `src/features/dice/physical-roll-modal.tsx` :
    - Affiche en grand la formule à lancer (« Lance 1d20 », « Lance 2d6 + 3 »).
    - Un champ numérique par dé, labellé par type (`d20`, `d6`, `d6`, …).
    - Validation stricte de plage par dé (face ∈ `1..faces`) — fail loud (rouge + bouton Valider désactivé).
    - Avantage/désavantage : l'app demande 2d20, joueur saisit les deux, l'app garde la bonne et affiche les deux faces dans le résultat.
    - Total calculé en live à mesure de la saisie, crit (face d20 = 20) / échec critique (= 1) signalé visuellement.
    - **Bouton « Valider »** (saisie complète) ET **« Passer »** (ferme sans rien logger — c'est l'« optionnel »).
    - A11y : `role="dialog"`, focus initial sur le premier input, fermeture par Échap = Passer.
- [ ] 14. Store UI dédié `src/shared/lib/slices/ui-modals-slice.ts` : `requestPhysicalRoll(spec): Promise<{ rawFaces: number[] } | null>`. Pas d'event bus (décision plan 10) — store Zustand qui pose un `pendingPhysicalRoll` et expose un `resolve` interne. Un seul `<PhysicalRollModal />` monté au root (App.tsx) consomme `pendingPhysicalRoll`.

### Séquence attaque → dégâts (physique)

- [ ] 15. `useDice().rollAttackDamage(attackBonus, damageExpr, opts)` (helper qui chaîne les deux jets) :
    - Étape A : `rollWithFlags({ ..., label: 'Attaque' })` → si `null` (cancel), aborter la séquence sans gate.
    - Étape B (physique) : afficher un gate « Touché / Raté » :
      - Auto-`Touché` + crit si face d20 = 20.
      - Auto-`Raté` + fumble si face d20 = 1.
      - Sinon, le joueur choisit Touché ou Raté (le seuil CA arrive plan 14/24).
    - Étape C : si Touché → prompt de dégâts. En physique, le prompt affiche `damageExpr` **avec le nombre de dés doublé si crit** (1d8 → 2d8, modificateur **non doublé**, conforme SRD 5e).
    - Étape D : calcule + toast combiné « Attaque X → Dégâts Y ».
    - En digital, la séquence garde le comportement actuel (rolls automatiques enchaînés).

### Hook `useDice`

- [ ] 16. `src/features/dice/use-dice.ts` :
    - `rollD20Plus(mod, opts)` — convenience d20 + mod plat.
    - `rollExpression(expr, opts)` — générique parser+roller.
    - `rollWithAdvantage(mod, opts)` / `rollWithDisadvantage(mod, opts)`.
    - `rollAttackDamage(attackBonus, damageExpr, opts)` — séquence ci-dessus (étape 15).
    - `useRollHistory()` — renvoie les 50 derniers jets de Dexie, filtre `characterId` optionnel.
    - Toutes les méthodes branchent sur le mode effectif via `rollWithFlags` (pour les d20) ou un wrapper similaire pour les dégâts seuls (cf. étape 17).
- [ ] 17. Wrapper dégâts seuls `rollDamageWithMode(formula, opts)` (interne à `use-dice.ts` ou exporté) : digital → roule via `roller`, physique → ouvre `<PhysicalRollModal />`. Renvoie `RollResult | null`. Utilisé par `rollAttackDamage` à l'étape C et par les sorts (cf. étape 24).

### Persistance Dexie

- [ ] 18. Dexie `diceHistory` migration `version(2)` :
    - Ajoute `mode`, `rawFaces`, `keptFaces`, `crit`, `fumble`.
    - Backfill des anciens enregistrements : `mode='digital'`, `rawFaces=rolls`, `keptFaces=rolls`, `crit=false`, `fumble=false`.
    - Limite 200 jets, auto-prune à l'écriture.

### Event-logging hook (forward-compat)

- [ ] 19. `src/shared/lib/event-logger-stub.ts` :
    - `logRollIfCampaign(rollResult: RollResult): Promise<void>` — no-op S1.
    - Sera remplacé par la vraie implémentation plan 22 qui écrit dans `campaigns/{id}/events` avec payload `{ mode, rawFaces, keptFaces, total, crit, fumble, ... }`.

### Spell damage canonical mapping (remplace l'heuristique regex de plan 09)

- [ ] 20. Pendant `scripts/build-public-content`, extraire pour chaque sort une liste structurée de dégâts depuis le SRD : `damage: Array<{ formula: string, type: DamageType, atHigherLevels?: { perLevel: string } }>`. Persister dans `public/data/spells.json` à côté de la description.
- [ ] 21. Remplacer `extractDamageFormula` (regex sur description FR) dans `src/features/sheet/modes/magie/spell-detail-modal.tsx` par une lecture directe de `spell.damage[]`. Garder le toast actuel comme fallback si `damage` est absent (sorts utilitaires sans dégâts). Couvre les dés multiples, les dégâts par-niveau-supérieur, et les types de dégâts. Mettre à jour le test correspondant.

### Câblage call sites existants (plans 07/08/09)

Audit sync/async livré en réponse à Adrien (cf. message du turn 5). Migration nécessaire pour Combat, Essence + Magie utilisent déjà le pivot async.

- [ ] 22. **`src/features/sheet/modes/combat/attacks-list.tsx`** :
    - `performRoll(entry, advantage, forceCrit)` devient `async`.
    - Remplace `rollD20(...) + rollDamage(...)` par `useDice().rollAttackDamage(entry.attackBonus, entry.damageFormula, { label, advantage, forceCrit })`.
    - Si la séquence est annulée à n'importe quelle étape → pas de toast (le pivot s'en charge).
    - Le handler `onPerform` du `<AttackRow />` accepte une promesse (déjà compatible côté React).
- [ ] 23. **`src/features/sheet/modes/combat/battle-hud.tsx`** :
    - `rollInitiative` devient `async`. Remplace `rollD20(character.initiative)` par `useDice().rollD20Plus(character.initiative, { label: 'Initiative', kind: 'init' })`.
- [ ] 24. **`src/features/sheet/modes/combat/death-saves-modal.tsx`** :
    - `rollDeathSave` est déjà `async`. Remplace `rollD20(0)` par `useDice().rollD20Plus(0, { label: 'Jet de mort', kind: 'death-save' })`. Le pivot retourne `RollResult | null` ; si `null`, sortir sans patch (le joueur a annulé son physical roll).
- [ ] 25. **`src/features/sheet/modes/essence/{hexagram,saves-row,skills-list}.tsx`** : déjà sur `rollWithFlags`. Ajuster le type de retour `RollResult | null` (early return si `null`) + ajuster `roll.natural` → `roll.keptFaces[0]` et `roll.rolls` → `roll.rawFaces` pour rester compatible avec le shape unifié (l'API publique de `rollWithFlags` reste stable, c'est le shape interne qui change).
- [ ] 26. **`src/features/sheet/modes/magie/spell-detail-modal.tsx`** :
    - `handleAttackRoll` : déjà sur `rollWithFlags`, ajuster `null`-safety.
    - `handleCast` : remplacer `rollDamage(damageFormula)` par `useDice().rollDamageWithMode(formula, { label: 'Dégâts · ' + spellName, kind: 'damage' })`. Null-safe : si annulé en physique, le slot est déjà consommé (étape 1 du cast) ; on **NE** réémet **PAS** de toast de dégâts, mais on garde le slot consommé (le cast a eu lieu, le joueur a juste choisi de ne pas suivre le dommage). Documenter cette décision inline dans le call site.

### Toggle UI minimal S1 (plan 35 = full settings)

- [ ] 27. Exposer un toggle « Mode de dés : Digital / Physique » accessible depuis la fiche. **Décision tactique** = ton choix d'emplacement (header du `<RollHistoryPanel />`, ou petit accès réglages via une modale dédiée). Documente-le inline. Le full settings screen plan 35 reprendra ce toggle + `followCampaignDiceMode`.

### Visual feedback

- [ ] 28. `<DiceToast />` component : top-center toast avec :
    - Label du jet.
    - Per-die animated value pop (animation `pop` sur chaque face).
    - Total avec modificateur.
    - Crit : flash doré + icône spéciale.
    - Fumble : flash rouge.
    - Indicateur `mode: physical` (petite icône `d` barré ou « PHYS ») pour distinguer les jets physiques.
    - Auto-dismiss 3s, persiste si hovered/tapped.
- [ ] 29. Toast queue manager — stack multiple rolls.

### Roll history panel (overlay)

- [ ] 30. `<RollHistoryPanel />` slide-up panel from bottom, 50 derniers jets avec timestamps, character names. Filtre par character. Badge `mode` (D / P) à côté du label. Tap a roll → repeat (en respect du mode courant : un jet historique digital → re-roll digital, mais l'utilisateur peut toggler en physique au-dessus de l'historique).

### Tests

- [ ] 31. Unit : parser comprehensive coverage (étape 5).
- [ ] 32. Unit : roller advantage/disadvantage correctness over 10000 sample size (étape 7).
- [ ] 33. Unit : `effectiveDiceMode` (étape 1).
- [ ] 34. Unit : `rollWithFlags` mode-aware — mock `requestPhysicalRoll` :
    - Digital : roll happy path + crit + fumble + inspiration consumée + exhaustion.
    - Physique : validation des faces, calcul du total, gestion advantage (garde max), annulation = `null` + aucune consommation d'inspiration.
- [ ] 35. Unit : `rollAttackDamage` séquence physique — attaque crit → prompt dégâts avec dés doublés, modificateur non doublé.
- [ ] 36. Unit : Dexie migration v1 → v2 backfill correct.
- [ ] 37. e2e : tap radial « Lancer » wedge en digital → toast + entry dans history. (e2e physique : reporté à un suivi e2e dédié dans plan 13.5 si nécessaire — la modale s'ouvre, on saisit, on valide.)

### Final

- [ ] 38. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 39. Commit : `feat(dice): mode-aware engine (digital + physical) + history + toast (plan 12)`

## Definition of Done

- [ ] Parser gère toutes les notations courantes + advantage/disadvantage.
- [ ] Roller produit des totaux corrects (digital).
- [ ] `<PhysicalRollModal />` ouvre, valide la plage, calcule le total, gère le passage (cancel) sans side effects.
- [ ] Séquence attaque → dégâts en physique : gate Touché/Raté + crit doublant les dés (modificateur non doublé).
- [ ] Avantage/désavantage en physique : 2 saisies, garde la bonne.
- [ ] Toggle Digital/Physique accessible (emplacement S1 documenté).
- [ ] Tous les call sites de la fiche (attacks-list, battle-hud, death-saves-modal, hexagram, saves-row, skills-list, spell-detail-modal) passent par le pivot et fonctionnent dans les deux modes.
- [ ] Toast montre sur chaque roll, dismissible, badge mode visible.
- [ ] Historique Dexie persiste avec `mode + rawFaces`.
- [ ] Crit/fumble visual feedback fonctionne dans les deux modes.

## Notes for next plan

- **Hand-off MJ** (player → DM application des dégâts) : implémenté en plan 24 (encounters). En S1 le résultat physique reste local-only. Plan 24 : quand un joueur en campagne fait un jet de dégâts physique, le total remonte dans le tracker DM ; le MJ tape une créature pour appliquer ou édite ses PV à la main. Le joueur ne cible jamais.
- **Plan 11 (radial FAB)** : les wedges « Lancer un dé » et « Sorts » DOIVENT router via `useDice()` / `rollWithFlags` — jamais appeler `dice.ts` direct — pour hériter du mode physique transparent.
- **Plan 14 (campaigns model)** : ajoutera `campaigns/{id}.settings.diceMode` + contrôle « Mode de dés par défaut » dans le formulaire de création.
- **Plan 22 (event log)** : les jets physiques loggés avec `payload.mode + payload.rawFaces + payload.total`.
- **Plan 35 (account/settings S5)** : settings screen complet expose `diceMode` + `followCampaignDiceMode`.
- **3D dice (`@3d-dice/dice-box`)** : différé S5 — toast-only pour l'instant.
- **Damage type / atHigherLevels** : le mapping canonical des sorts (étape 20-21) introduit `spell.damage[]` ; les call sites en aval (combat tracker plan 24, journal compiler plan 25) doivent lire cette structure plutôt que la regex de plan 09.
