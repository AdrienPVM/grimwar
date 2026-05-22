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

## `pnpm test:nightly`

Alias de `test:matrix` aujourd'hui. Entry point réservé pour des invariants plus
coûteux (multi-niveaux, fuzz, etc.) qu'on pourra y rattacher sans toucher au
câblage CI. Pas encore branché sur un run nocturne — la matrice tourne déjà sur
chaque déclencheur via le job `matrix` (cf. ci-dessous), ce qui couvre le besoin
de protection ; le run nocturne ne s'ajoutera que si `test:matrix` devient trop
lourd pour chaque PR.

## Hors de ces cadences

- `tests/firestore-rules.test.ts` → `pnpm test:rules` (requiert l'émulateur Firebase / Java).
- `tests/e2e/**` → `pnpm test:e2e` (Playwright + émulateur).
- `pnpm test` reste le **run complet** (tout le périmètre Vitest, hors e2e), utilisé par la quadruple gate de livraison locale. **Non exécutable tel quel en CI** : il embarque `firestore-rules.test.ts`, qui se skippe silencieusement sans `FIRESTORE_EMULATOR_HOST` → couverture rules perdue sans bruit. La CI passe donc par le split `fast` + `matrix` + `rules` (cf. ci-dessous), qui couvre exactement tout le périmètre Vitest, chaque test une seule fois.

## Câblage CI (GitHub Actions — plan 13.13)

`.github/workflows/ci.yml` : **4 jobs parallèles, tous bloquants**, sur `push: main`
+ `pull_request`. `concurrency` + `cancel-in-progress` (un nouveau push remplace
le run en cours). Node 22 (`engines.node = ">=22 <26"`), pnpm via corepack
(`pnpm@9.12.3`).

| Job | Cadence | Émulateur / Java | Ce qu'un rouge signifie |
|---|---|---|---|
| `static` | `typecheck` + `lint` | non | Erreur de type ou de lint. |
| `unit` | `test:fast` | non | Bug **unitaire algorithmique** (règle, composant, hook, extracteur, helper). |
| `matrix` | `test:matrix` | non | **Dérive de couverture/contenu** : classe ou persona ajoutée au bundle sans couverture, référence cross-bundle cassée, anglicisme/terme non-officiel FR, compteur SRD modifié. C'est le garde-fou de 13.12. |
| `emulator` | `test:rules` puis `test:e2e` | oui | Régression de **sécurité Firestore** (rules) ou de **parcours utilisateur** (e2e). Statut par-step : GitHub distingue « rules a pété » de « e2e a pété ». |
| `protected-paths-guard` | `push: main` only | non | Un commit **direct non-merge** a touché un path protégé (`public/data/**`, `scripts/data/srd-*.ts`, `.github/workflows/**`). Filet de la couche (b) du flow mixte. |

`rules` + `e2e` sont groupés dans un seul job `emulator` pour payer le setup lourd
(Java + firebase-tools + chromium + jars) **une fois** ; la granularité Q1 est
préservée par les statuts par-step.

**Lire un échec :** ouvrir le run dans l'onglet Actions, repérer le job rouge.
Pour `emulator`, le report Playwright (traces + screenshots) est attaché en
artefact `playwright-report` (uniquement `if: failure()`, rétention 7 j).

**Politique de quarantaine (anti-flake — volet P4) :** `workers:1` + `retries:1`
en CI (`CI=true`) sont déjà actifs (cf. `playwright.config.ts`). Si un test e2e
pète **≥ 3 fois sur 10 runs CI**, on le met en **quarantaine** (`test.fixme` +
issue GitHub ouverte traçant le flake) — **jamais** en montant les retries pour
masquer le symptôme. Un test flaky non diagnostiqué est une dette, pas un détail
de réglage. Playwright n'a aucune mémoire cross-run : la quarantaine est une
décision **manuelle**, prise sur l'historique des runs, pas un outillage.

## Flow mixte — protection des paths critiques (Voie A, plan 13.13)

Direct-push sur `main` autorisé par défaut. Trois groupes de paths sont
**durcis** (`public/data/**`, `scripts/data/srd-*.ts`, `.github/workflows/**` —
bundles SRD + pipeline CI). GitHub ne sait pas conditionner une branch protection
à un path ; le mécanisme est donc du **code à 2 couches**, pattern partagé via
`scripts/ci/protected-paths.sh` (source unique) :

- **(a) Prévention locale** — `.githooks/pre-push` refuse un push direct sur
  `main` touchant ces paths. Auto-installé sans husky (`core.hooksPath .githooks`
  posé par le script `prepare`, lancé à chaque `pnpm install`). Pousser une
  **branche de feature** passe librement (la PR est la voie légitime).
- **(b) Détection CI** — job `protected-paths-guard` (`push: main` only) échoue
  si un commit **direct non-merge** (`git rev-list --first-parent --no-merges`)
  touche ces paths. Filet pour les `--no-verify` et les pushes hors-machine.

**Un merge de PR n'est jamais bloqué** (le merge commit est exclu par
`--first-parent --no-merges`). Pour modifier légitimement un path protégé :
ouvrir une PR (mergée avec un merge commit). Contournement direct conscient :
`git push --no-verify` — assumé, le job (b) le signale alors a posteriori.
