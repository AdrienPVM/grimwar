# Tests GrimWar — cadences

Trois cadences de tests Vitest, découpées par **fréquence d'exécution** (décision
de cadrage plan 13.12 commit 4 — Q2). Le découpage est une décision du plan
matrice ; le **câblage CI** (quelle cadence sur quel événement GitHub Actions)
relève du plan 13.13.

> Borne contractuelle : `pnpm test:fast` doit rester **< 30 s** pour ne pas
> freiner le développement local. Si un jour il dépasse, déplacer les invariants
> les plus lourds vers `test:matrix`.

## `pnpm test:fast` — par-commit (< 30 s)

Invariants algorithmiques **purs** : unités de règles, composants, hooks,
extracteurs de scripts, helpers content-truth. Ne charge **pas** la matrice
combinatoire ni les invariants cross-bundle lourds.

Périmètre (`vitest run src scripts tests/helpers`) :

- `src/**/*.test.{ts,tsx}` — tests colocalisés (règles 5e, composants, hooks, fiche, wizard).
- `scripts/__tests__/**` — extracteurs SRD, garde-fous de politique de contenu.
- `tests/helpers/content-truth/__tests__/**` — tests unitaires des helpers content-truth (cat. 2/4/6) + leurs sondes rouge-avant-vert.

## `pnpm test:matrix` — par-PR

La **matrice combinatoire L1** + les invariants de **vérité du contenu** lourds
(lecture des vrais bundles `public/data/*.json`, dérivation de personas via la
vraie fonction de prod `buildCharacterFromWizard`).

Périmètre (liste explicite) :

- `tests/wizard-matrix/**` — runner combinatoire L1 (personas par couverture) + garde-fou d'axe « matrice ≡ bundle ».
- `tests/content-referential-integrity.test.ts` — toute référence cross-bundle résout.
- `tests/content-no-english-in-fr.test.ts` — zéro anglicisme / terme non-officiel en FR.
- `tests/srd-counters.test.ts` — compteurs SRD figés (hardening bundle).
- `tests/srd-reference-entries.test.ts` — 20 entrées SRD de référence pinnées (cat. 3).

## `pnpm test:nightly` — câblage CI à venir (plan 13.13)

Entry point **déclaré mais non câblé en CI** aujourd'hui. Alias de `test:matrix`
pour l'instant. Le plan 13.13 le branchera dans GitHub Actions (run nocturne) et
pourra y ajouter des invariants plus coûteux (multi-niveaux, fuzz, etc.).

## Hors de ces cadences

- `tests/firestore-rules.test.ts` → `pnpm test:rules` (requiert l'émulateur Firebase / Java).
- `tests/e2e/**` → `pnpm test:e2e` (Playwright + émulateur).
- `pnpm test` reste le **run complet** (tout le périmètre Vitest, hors e2e), utilisé par la quadruple gate de livraison.
