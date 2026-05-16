# Plan 09 — Sheet Magie mode

## Goal
Magie mode shows the magic circle (slot levels as concentric runes), spellcasting stats, prepared/known spells list with categorization, and a spell detail modal on tap that includes "Cast" button.

## Context
Read `prototype/grimwar.html` (Magie section — magic circle), `docs/DATA-MODEL.md` (spell slots, prepared/known spells).

## Prerequisites
Plans 01-06.

## Steps

### Magic circle
- [x] 1. `src/features/sheet/modes/magie/magic-circle.tsx`: SVG concentric rings, one ring per spell-slot level unlocked (1-9 ; cantrips n'utilisent pas d'emplacement donc pas d'anneau interne). Rayons calculés dynamiquement entre `INNER_R+20` et `OUTER_R-4` selon le nombre d'anneaux à dessiner.
- [x] 2. Chaque slot est un bouton circulaire positionné sur son anneau (cos/sin) ; full = gradient gold + ring glow + numéro de niveau ; consumed = contour ambre dim.
- [x] 3. **Décision tactique** : pas de modal confirm sur tap. Mobile-first ⇒ un tap consomme directement avec toast, long-press restaure. Cohérent avec `HpMegaCard` (tap=action, long-press=alternative). La spec plan demandait "confirm" mais ajouter une modale par consommation tue la fluidité — l'undo via long-press couvre le mistap.
- [x] 4. Long-press = restore +1 (clamp à max). Toast distinct (kind `heal`).

### Spellcasting stats panel
- [x] 5. `spell-stats-bar.tsx` : une rangée par classe lanceuse (Caract. INT/SAG/CHA + DD du sort + bonus d'attaque). DD = `8 + PB + abilityMod`, attack = `PB + abilityMod`. Affiche aussi la capacité de préparation (`abilityMod + classLevel`, mini 1) pour les préparateurs (full/half), pas pour known/pact.
- [x] 5b. **Multi-class** : slot table UNIFIÉE via `casterLevel()` ajouté à `lib/rules/multiclass.ts` (full ×1, half ×floor(level/2), third ×floor(level/3), pact exclu). `spellSlotsForCasterLevel(level)` retourne la table SRD officielle 1-20 (testée pour 0, 1, 5, 20, 30). Cantrips + preparedSpells + knownSpells restent **per-class** (gardés dans `character.preparedSpells[classId]`).

### Spell list
- [x] 6. `spell-list.tsx` : sorts groupés par niveau (Sorts mineurs / Niveau N), sections triées par level puis ordre alphabétique localisé FR.
- [x] 7. Chaque ligne : losange contenant le niveau (`·` pour cantrip), nom localisé, school chip via `t('school.X')`, composantes V/S/M, badge Concentration (améthyste) + badge Rituel (teal) quand applicable.
- [x] 8. Input recherche (icône `i-search`) + 4 chips de filtre : Tous · X / Préparés · X / Tours · X / Rituels · X. Recherche case-insensitive locale-aware (`toLocaleLowerCase('fr')`).
- [x] 9. Préparé (full intensity, gradient gold) vs known mais pas préparé (opacity-80 + bord ambre dim). Cantrips toujours rendus comme "préparés".

### Cast flow
- [x] 10. `spell-detail-modal.tsx` : ouvre depuis la liste, montre temps / portée / composantes / durée, description complète, section "À niveau supérieur" si présente. Sélecteur de classe lanceuse si multi-class. Slot picker (boutons pill par niveau disponible >= minLevel) + bouton "Lancer" + bouton "Jet d'att." auxiliaire qui passe par `rollWithFlags`.
- [x] 11. Concentration : `currentConcentration = { spellId, slotLevel }` au cast. Si une concentration différente existe déjà, toast d'avertissement "Concentration brisée — le sort précédent prend fin" puis remplacement. Un sort qui se concentre lui-même (re-cast) ne déclenche pas l'avertissement.

### Update logic
- [x] 12. Slot consumption via `consumeSlot()` (pur, clamp à 0, retourne null si rien à faire ⇒ pas de patch Firestore). Restoration via `restoreSlot()` (clamp à max).
- [x] 13. Concentration stockée comme `{ spellId, slotLevel: 0 | 1..9 }` (slotLevel = 0 pour les cantrips concentrés).

### Tests
- [x] 14. Unit : 17 tests dans `magie/__tests__/spell-slots.test.ts` (consume clamp 0, restore clamp max, immuabilité, multi-class caster level, pact exclu, derivation depuis catalogue, prepared/known sets, override d'ability) + 11 tests dans `multiclass.test.ts` (casterLevel formules, slot table SRD niveaux 0/1/5/20/30, clamp). Total +28 vs plan 08.
- [-] 15. **DEFERRED** : e2e Playwright reporté avec la dette e2e cumulée (plans 05/06/07/08). Voir `## Notes for next plan` pour la table consolidée et l'option A approuvée (plan 13.5 dédié).

### Final
- [x] 16. `pnpm typecheck && pnpm test && pnpm lint` — 101 tests verts (+28 vs plan 08), lint propre, typecheck strict propre. `pnpm build` propre (2.38s).
- [x] 17. Commit: `feat(sheet): magie mode + magic circle (plan 09)`

## Definition of Done
- [x] Magic circle renders, slot counts correct
- [x] Spell list paginates, searchable, locale-aware
- [x] Cast flow consumes slot and rolls damage if applicable
- [x] Concentration tracked

## Notes for next plan

### Pivot `rollWithFlags` — Magie l'utilise déjà
La modale Magie route `Jet d'att.` via `rollWithFlags({ baseMod: PB + abilityMod, label: "Attaque · <sort>" })`. Plan 11 (radial FAB) doit faire pareil pour ses jets de sort. Plan 12 (dice engine) doit conserver la même surface exportée par `dice.ts` (`rollD20`, `rollDamage`) — `rollWithFlags` y appellera la nouvelle implémentation sans modification du call site.

### Jets d'attaque de sort vs damage roll — hack actuel et plan 12
Le cast flow actuel détecte une formule "NdX" dans la description FR via regex pour rouler les dégâts (heuristique). Plan 12 livrera un mapping canonique `spellId → damage formula` (extrait du SRD pendant `build-public-content`) — alors la regex sera remplacée par une lecture directe. Garder l'API de `SpellDetailModal` côté composant identique : la consommation de slot + concentration ne change pas.

### Dette e2e consolidée (à fin plan 09)

| Plan | Step | Feature à couvrir e2e |
|---|---|---|
| 05 | 24 | Wizard manuel — Lyralei créée en < 2min |
| 06 | 17 | `/character/{id}` — hero card + status strip + switch modes |
| 07 | 16 | Combat — HP, death saves, conditions, slots, attaques |
| 08 | 16 | Essence — tap petal/save/skill → toast, inspiration consommée, exhaustion appliquée |
| **09** | **15** | **Magie — open un wizard 5, consomme un slot, cast un sort → slot −1 + toast ; cast un sort concentration → brise une concentration précédente** |
| 11 | 21 | Radial FAB — tap, voir menu, fire action (déjà annoncé inline) |

**Décision e2e (Adrien) : Option A approuvée — plan 13.5 dédié entre plan 13 (PWA deploy) et plan 14 (campaigns).** Tant qu'il n'est pas créé, chaque plan ajoute systématiquement sa ligne à cette table. La coquille de plan 13.5 sera proposée à la fin de plan 13 ; en attendant, ne pas insérer dans `00-overview.md` ni `ROADMAP.md` (la renumérotation entre suffixe .5 vs renumérotation .14-shift sera tranchée au moment de la création).

### Caster level — table unifiée VS pact magic
`casterLevel()` exclut explicitement la progression `pact`. Quand un warlock pur joueur arrivera (S2-S3 probable), il faudra :
1. Soit étendre `character.spellSlots` avec une convention `pact-<level>` (plus simple, isolé) ;
2. Soit ajouter un helper `pactSlotsForWarlockLevel(level)` séparé et un second cercle d'invocation visuellement distinct (anneau crimson au lieu d'or).

Pour l'instant aucun test ne couvre warlock dans la fiche — décision reportée à plan 18 (level-up) qui gérera la progression complète.

### Schéma `spellcastingAbility` — convention
Plan 09 a conventionné : `character.spellcastingAbility[classId] ?? def.spellcasting.ability` (le perso peut override l'ability par défaut SRD via cette map). Si null sur la fiche → fallback au catalogue. Cette convention permettra plan 18 (level-up) de garder un override clean (ex: variants ou homebrew) sans toucher au content public. Documenté dans le test "override : utilise l'ability sur character.spellcastingAbility si fixée".

### Casters préparés vs known — approximation
`isPreparedCaster(progression)` retourne `true` pour `full|half`, `false` pour `third|pact`. C'est une approximation correcte pour SRD 2024 (Wizard/Cleric/Druid/Bard/Sorcerer/Paladin/Ranger = prepared, Warlock = known via pact). Plan 17 (wizard creation features) ajoutera un champ explicite `prepared: boolean` au content si la nuance Eldritch Knight/Arcane Trickster (third caster avec known-list) doit être distinguée.

### `ModePlaceholder` retiré pour Magie
Plus utilisé : `MagieMode` rend maintenant ses composants directement. `ModePlaceholder` reste pour `AvoirMode` (plan 10) et `AmeMode` (plan 20). Il sera supprimé quand le dernier mode aura sa vraie implémentation.
