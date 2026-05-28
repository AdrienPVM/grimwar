# D13d-followup-summary — gap 4→7 formes spéciales (Pact of the Chain)

## Constat

Le bundle `public/data/invocations.json > pact-of-the-chain.summary` liste **4 formes spéciales** (Démon mineur / Pseudodragon / Quasit / Sprite). Le SRD 5.2.1 officiel en mentionne **7** :

- **EN** (`SRD_CC_v5.2.1.pdf`) : Imp, Pseudodragon, Quasit, Skeleton, Sphinx of Wonder, Sprite, or Venomous Snake
- **FR** (`FR_SRD_CC_v5.2.1.pdf`) : Diablotin, esprit follet, pseudodragon, quasit, sphinx merveilleux, serpent venimeux ou squelette

## Drifts terminologie WotC FR détectés en passant

1. « Démon mineur » (inventé) → **« Diablotin »** (WotC FR officiel SRD 5.2.1 p. 142)
2. « Sprite » (anglicisme) → **« esprit follet »** (WotC FR officiel)

## Cause

Bundle figé depuis le tracer D13d (commit `bbdf3c0`, CHANTIER 4 nuit 2) avec **4 formes** par souci d'isolation du périmètre : la dette `D13d-followup-summary` a été ouverte explicitement à ce moment pour traquer le gap, et la liste a été préservée stricte pour éviter une divergence registre↔bundle. Le statblock Sphinx of Wonder existe déjà dans `summoned-creatures.json` (commit `e3e1c3f` plan D14) mais n'est pas référencé par le summary.

## Scope

1. `scripts/data/srd-invocations.ts > pact-of-the-chain.summary` (FR + EN) — 7 formes WotC FR officielles.
2. `public/data/invocations.json` — régénéré (path protégé).
3. `src/shared/lib/rules/eldritch-invocations.ts` — type `specialForms` + constante `INVOCATION_REGISTRY` ligne 222 (7 IDs EN-normalisés) + mise à jour du commentaire ligne 73-95.
4. `src/shared/lib/i18n.ts` — clé `sheet.essence.invocation.pactOfTheChain.specialForms` FR + EN.
5. `src/shared/lib/rules/__tests__/eldritch-invocations.test.ts` — assertion ligne 107-112 étendue à 7.
6. `tests/srd-counters.test.ts > describe('invocations.json')` — nouveau test garde-fou cat. 3 (identité summary contient les 7 formes officielles, FR + EN).

## Hors scope

- `PACT_OF_THE_CHAIN_STATBLOCK_IDS` reste à 4 entrées (reflète les statblocks RÉELLEMENT bundlés dans `summoned-creatures.json`). Les 3 formes ajoutées au summary (Imp, Skeleton, Venomous Snake) n'ont pas de statblock — c'est l'état de fait actuel, pas une régression introduite ici.
- Slug du registre `specialForms` : convention EN normalisée conservée (`imp`, `pseudodragon`, …, `venomous-snake`). Refactor EN→FR du registre = hors scope.

## Plan

- [ ] Brancher `fix/D13d-followup-summary` depuis `main@52ba317`.
- [ ] Ajouter test garde-fou bundle (cat. 3) — voir rouge avant fix.
- [ ] Modifier `eldritch-invocations.test.ts` (assertion 4→7) — voir rouge avant fix.
- [ ] Étendre type `PassiveInvocationEffect.specialForms` à 7 IDs.
- [ ] Mettre à jour `INVOCATION_REGISTRY` ligne 222 à 7 IDs.
- [ ] Mettre à jour commentaire ligne 73-95 (la dette est désormais résolue).
- [ ] Mettre à jour `scripts/data/srd-invocations.ts > pact-of-the-chain.summary` FR + EN.
- [ ] Régénérer `public/data/invocations.json` (extraction SRD-only).
- [ ] Mettre à jour i18n FR + EN.
- [ ] Quadruple gate Node 22 verte.
- [ ] PR draft → ready → CI 4/4 verts → merge merge-commit → post-merge guard vert → branche supprimée.
- [ ] Marquer la dette résolue dans `plans/DEBT.md`.
