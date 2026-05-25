# Coverage report — marathon nocturne 2026-05-25 (CHANTIER 10)

> **Méthodologie** : `pnpm vitest run --coverage` (provider `@vitest/coverage-v8@2.1.9`,
> ajouté à `devDependencies` dans le cadre de ce chantier). Inclut TOUT le repo
> (src + scripts + tests/helpers). 1215 tests passés. Aucune fix demandée —
> observation pure pour arbitrage matinal.

## Global

| Métrique | Score |
|---|---|
| Statements | **53,13 %** |
| Branches | 81,04 % |
| Functions | 60,84 % |
| Lines | 53,13 % |

Le 53 % global est trompeur car il inclut :
- `scripts/data/srd-*.ts` (modules de données, exécutés une seule fois par
  l'extracteur — 0 % attendu)
- `scripts/extract-srd-*.ts` (extracteurs one-shot, jamais importés par l'app
  — 0 % attendu)
- `scripts/build-public-content.ts`, `scripts/update-content-index.ts` (build
  pipeline — 0 % attendu)
- Fichiers de config (`tailwind.config.ts`, `playwright.config.ts`, etc. — 0 %
  attendu)

Le score « logique métier » réel (ce qui tourne en runtime côté utilisateur) est
**bien plus élevé** — voir détail par directory ci-dessous.

## Coverage par directory (logique métier)

| Dossier | Stmts | Statut |
|---|---|---|
| `src/shared/lib/rules` | **98,85 %** | ✅ excellent |
| `src/shared/types` | **98,3 %** | ✅ excellent |
| `src/shared/lib/dice` | **97,24 %** | ✅ excellent |
| `src/shared/components/form` | **95,95 %** | ✅ excellent |
| `src/features/wizard/reference-builds` | **94,83 %** | ✅ excellent |
| `src/features/wizard/steps/ancestry` | **90,64 %** | ✅ excellent |
| `src/features/wizard/steps/class` | **87,31 %** | ✅ excellent |
| `src/features/sheet/status` | **100 %** | ✅ parfait |
| `src/features/sheet/modes/magie` | **70,26 %** | 🟡 mid |
| `src/shared/lib` | **76,92 %** | 🟡 mid |
| `src/shared/hooks` | **71,42 %** | 🟡 mid |
| `src/features/wizard/help` | **73,75 %** | 🟡 mid |
| `src/shared/lib/slices` | **59,67 %** | 🟡 mid |
| `src/shared/components` | **53,94 %** | 🟡 mid |
| `src/features/sheet/modes/combat` | **31,15 %** | 🟠 sous-couverte |
| `src/features/wizard/steps` | **27,31 %** | 🟠 sous-couverte |
| `src/features/sheet/modes/essence` | **25,71 %** | 🟠 sous-couverte |
| `src/features/sheet/modes/avoir` | **4,30 %** | 🔴 faible |
| `src/shared/design` | **0 %** | ⚪ N/A (tokens constants, pas de logique) |

## Zones prioritaires à arbitrer (logique métier non couverte)

### 🔴 `src/features/sheet/modes/avoir` (4,30 %)

Le mode Avoir (inventaire) est le moins testé côté UI. Les règles pures sont
bien couvertes (`inventory-rules.ts` à 100 %, cf. 24 tests). Ce qui manque :

- `add-item-modal.tsx`, `custom-item-form.tsx`, `coins-section.tsx`,
  `inventory-list.tsx`, `item-detail-modal.tsx`, `weight-bar.tsx` — composants
  UI sans tests RTL dédiés.
- `use-inventory-derived.ts` — hook composé (CA dérivée + encombrement) couvert
  uniquement via `status-strip.test.tsx`.

**Recommandation** : si un bug Avoir surgit en UAT (équipement / poids / shop),
prioritiser un test RTL ciblé pour figer le comportement.

### 🟠 `src/features/sheet/modes/essence` (25,71 %)

Le mode Essence (caractéristiques, ordres divins, invocations occultes) est mid-
couvert. `divine-order-card.tsx`, `primal-order-card.tsx`, `invocations-card.tsx`
ont des tests RTL solides. Manquent surtout `hexagram.tsx` (rendu visuel SVG
des caractéristiques), `saves-row.tsx`, `skills-list.tsx`, `essence-header.tsx`.

**Recommandation** : `skills-list.tsx` mérite un test ciblé (composant central
qui rend la liste des compétences avec expertise / maîtrise / source).

### 🟠 `src/features/sheet/modes/combat` (31,15 %)

Plusieurs cartes Combat sans test : `battle-hud.tsx`, `hp-mega-card.tsx`,
`number-pad.tsx`, `party-strip.tsx`, `slots-compact.tsx`, `death-saves-modal.tsx`.
`attacks-list.tsx` est très bien couvert par `attacks-list-mastery-badge.test.tsx`
(118 tests sur le badge Maîtrise).

**Recommandation** : `death-saves-modal.tsx` est mécaniquement critique (3
fails → `status: 'dead'` → fiche read-only). Mérite un test ciblé.

### 🟠 `src/features/wizard/steps` (27,31 %)

Plusieurs steps de wizard non couverts unitairement — couverts par matrice
combinatoire + e2e. Les steps existants avec tests dédiés : `skills-step`,
`spells-step` (×3 fichiers de tests).

**Recommandation** : les steps non testés unitairement sont couverts par la
matrice combinatoire L1 (86 personas) + e2e wizard.spec.ts (`< 2 min Magicien`)
+ gating specs. La couverture stmts est faible mais le risque est mitigé.

### 🟡 `src/shared/lib/slices` (59,67 %)

`wizard-slice.ts` est le moins couvert (50 %) — slice Zustand énorme (~370
lignes) avec beaucoup de transitions d'état. La matrice combinatoire l'exerce
implicitement via `submit-from-wizard`. Une couverture unitaire par scénario
de transition apporterait peu vs le coût.

## Recommandations de priorisation

**Si on prend 1 chantier de test post-marathon** :
1. **Death saves modal** — mécaniquement critique, snapshot du statut Character.
2. **Add item modal + custom item form** — surface UI hot du mode Avoir, peu
   testée.
3. **Skills list mode Essence** — composant central, plusieurs sources de
   maîtrise à agréger correctement.

**Garder en l'état** :
- Tous les fichiers `scripts/data/srd-*.ts` (modules de données, validés par
  les compteurs `srd-counters.test.ts`).
- Tous les fichiers `scripts/extract-*.ts` (one-shot, validés par les compteurs
  et `content:check` idempotence).
- Tous les `*.config.ts` (build config, non testable).
- `src/shared/design/tokens.ts` (constantes, pas de logique).

## Détail (top 60 fichiers les plus bas en coverage, données brutes)

```text
Cf. sortie complète : pnpm vitest run --coverage (87 fichiers de test, 1215
tests passés, durée ~12 s).
```

> **Note méthodologique** : le rapport HTML est généré dans `coverage/` (gitignore
> à confirmer). Pour visualiser : ouvrir `coverage/index.html`.

## Ajout au repo

- `package.json` — nouvelle devDep `@vitest/coverage-v8@2.1.9`.
- Aucun script ajouté dans `package.json` — le flag `--coverage` se passe en
  ligne de commande (`pnpm vitest run --coverage`). Si un usage récurrent
  émerge, ajouter `"test:coverage": "vitest run --coverage"`.
