# GrimWar — Claude Code context

> **Read this in full at the start of every session.** This is the master rulebook. The plans in `plans/` are the work queue. The docs in `docs/` are the architectural reference. The prototype at `prototype/grimwar.html` is the visual reference.

## Project overview

**GrimWar** is a D&D 5e campaign management PWA — mobile-first, cinematic, illuminated-manuscript aesthetic. It is **not** a fiche numérique : it's a full table-companion tool where a DM runs a campaign, invites players, and **every game event is auto-logged** to build a living session journal.

**Players** create their PJ via a guided wizard, manage inventory from a strict items DB (no free-string items), level up with assistance, and play with a roll-by-tap radial menu interface.

**The DM** runs encounters, controls maps (with .dd2vtt imports from Dungeon Alchemist), takes session notes, sees the auto-compiled campaign journal, and has **full authority** over every player's character sheet.

**Commercial intent**: this codebase is built to be potentially commercialized. No paywall yet, but the foundations (security rules, GDPR endpoints, subscription tier placeholder, EU data residency) are in place from day one.

**Primary user (and DM)**: Adrien. Brussels-based. French. The first campaign is in person with friends; the app must work in airplane mode on a phone in a cave.

## Stack (locked)

- **React 18** + **Vite** + **TypeScript strict** (no `any`)
- **Tailwind CSS** with custom design tokens — see `docs/DESIGN-SYSTEM.md`
- **Zustand** for global state (slices per feature)
- **Dexie** (IndexedDB) for local cache + offline reads of public content
- **Firebase**: Auth (anonymous + Google + email), Firestore (europe-west1 region for GDPR), Hosting, App Check (rate limiting)
- **PixiJS** — Sprint 4 only, for the VTT map
- **Vitest** + **Playwright** for tests
- **Workbox** for service worker / offline

## GSD workflow + autonomy rules

Plans in `plans/` are numbered, sequential, sprinted (`S1` table-ready MVP, `S2` campaigns, `S3` DM tools + journal, `S4` map, `S5` polish + launch). See `docs/ROADMAP.md`.

### Execution rules

1. **Pick the lowest-numbered unfinished plan.**
2. **Read it fully before any code.**
3. **Each step has a `[ ]` checkbox** — mark `[x]` only when verifiably done.
4. **Definition of Done** at the bottom must all pass. Run `pnpm typecheck && pnpm test && pnpm lint` at every DoD check.
5. **Commit** with conventional message at end of every plan.

### Autonomy — what Claude Code decides alone

Claude Code has authority to make tactical decisions without asking. Specifically:

- **File structure within a feature folder** — split into sub-files as makes sense
- **Variable, function, type names** (follow conventions below)
- **Library version bumps within a minor** (e.g. zustand 5.0.1 → 5.0.4 fine; 5 → 6 ask)
- **Minor UX adjustments** — exact button placement, hover-state styling, error message wording
- **Test composition** — which functions to unit-test, which flows to e2e
- **Internal refactors** that don't change public APIs
- **Adding small utility helpers** when a pattern repeats 3+ times
- **CSS class organization** within a Tailwind cluster
- **Skipping a documented optional step** if it doesn't apply (e.g. a class isn't a spellcaster, skip spell choice UI)

When making any of these decisions, **document it inline in the plan** (e.g. `- [x] 5. Used cva for button variants (over manual switch)`).

### Autonomy — what requires Adrien

Stop and ask Adrien if:

- **Architectural conflict** with an existing decision in this file or any `docs/*.md`
- **New external dependency** not in `package.json`
- **Scope creep** — a step reveals work that isn't in the plan's stated goal
- **Schema change** to Firestore data model (must update `docs/DATA-MODEL.md` + bump migration version)
- **Security rules change** beyond what the plan specifies
- **Commercial-readiness compromise** — anything that would weaken security, leak data, or break GDPR
- **Visual departure** from the prototype style guide — small refinements are fine, large changes require approval
- **A step is blocked by an external action** (e.g. "Adrien must create Firebase project" — pause and document)

**How to pause**: leave a clear comment in the plan file:

```md
- [!] 12. BLOCKED: AideDD HTML format unexpected for monsters — selectors find no .statblock. Need Adrien to provide one sample file or confirm the source format.
```

Then commit with `chore(plan-NN): blocked at step 12, see plan for context` and stop. Don't improvise on blocked steps.

### Continuity

Each plan ends with `## Notes for next plan` — read this when starting the next one. If you discover something useful while executing plan N, write it there so plan N+1 inherits the knowledge.

## Decision log

These are LOCKED. Override only with Adrien's explicit instruction.

| Area | Decision |
|---|---|
| Project name | `grimwar` |
| Repo path | `C:\Users\adrie\Documents\grimwar\` |
| Default language | French (FR). i18n shape from day 1, EN added in S5. |
| Auth providers | Anonymous + Google + Email/password (Apple Sign-In deferred) |
| Firestore region | **europe-west1** (GDPR / data residency) |
| Character ownership | **Player-owned, portable** between campaigns |
| Campaign invites | **Shareable link + 6-char invite code** (no email required) |
| DM permissions | **Full authority** — DM can edit any field on any character in their campaign |
| **Multi-classing** | **Supported from v1.** Character has `classes[]` array + `totalLevel` denormalized. 5e multi-class rules in `lib/rules/multiclass.ts`. |
| **Character status** | `'alive' \| 'dead'` field. On 3 death save fails → `dead` + sheet read-only. DM has a "Ressusciter" button that restores to alive at 1 HP. |
| **5e variants** | 4 per-campaign toggles in `settings.variants`: `featAtLevel1`, `flanking`, `slowHealing`, `grittyRealism`. All default `false`. Wizard + sheet + rest mechanics respect these toggles. |
| Subscription tier | Schema field `tier: 'free' \| 'pro'` on user (placeholder, no paywall yet) |
| Items in inventory | **Strict reference to items DB** — no free-string items |
| Content source priority | **PDFs are source of truth #1**. Mechanics come from the SRD 5.2.1 PDF (Creative Commons, EN edition `SRD_CC_v5.2.1.pdf`). FR overlay comes from the SRD 5.2.1 FR edition (`FR_SRD_CC_v5.2.1.pdf`) — same ruleset, two languages, 1:1 structural mapping. PDF wins in any conflict. |
| **Politique de contenu (LOCKED)** | **L'app et son dépôt ne contiennent et ne bundlent QUE le SRD 5.2.1 (EN + `SRD_CC_v5.2.1.pdf` + FR `FR_SRD_CC_v5.2.1.pdf`).** Le pipeline de build (`scripts/*`), les fichiers `public/data/*.json` versionnés, la CI et tout livrable de plan lisent **uniquement** les deux PDF SRD. `content-sources/aidedd/*` et les PDF non-SRD (PHB / DMG / MM / Xanathar / aventures / compilations AideDD pré-SRD) ne sont source d'**aucun** script versionné, d'**aucune** étape de build, d'**aucun** livrable de plan. Tout contenu au-delà du SRD passe exclusivement par le **système d'import de contenu custom** (plan 13.11), alimenté par des packs JSON fournis par l'utilisateur côté campagne. Acté 2026-05-17. |
| **Interdit temporaire — `pnpm content:build`** | **NE PAS exécuter `pnpm content:build` jusqu'à la livraison du plan 13.10** (Spells cleanup SRD 5.2.1). Le pipeline lit encore `content-sources/extracted/aidedd/spells.json` en violation de la politique de contenu lockée — toute exécution réhydraterait `public/data/spells.json` depuis une source interdite. La dette est tracée dans `plans/DEBT.md > D9` (owner = plan 13.10). Le bundle actuel sur disque est sain et garanti par `tests/srd-counters.test.ts > Hardening D`. Acté 2026-05-17 suite au diagnostic du bug "sorts vides UAT plan 13.7" (3e occurrence). |
| DMG / PHB / MM | Private only. Never bundled, never published. |
| Roll engine | Custom (~150 lines, prototyped). 3D dice deferred to S5. |
| Map / VTT | Sprint 4. PixiJS + .dd2vtt import. |
| Dice mode | Deux modes : **digital** (l'app lance) et **physique** (l'app indique quoi lancer IRL, le joueur saisit les faces brutes, l'app calcule). Réglage par utilisateur `users/{uid}.settings.diceMode` + `settings.followCampaignDiceMode`. Défaut de table = `campaigns/{id}.settings.diceMode` (effectif S2). Mode physique : saisie des faces brutes, l'app applique modificateurs + détecte nat 20/1 + avantage. Les dégâts remontent au MJ qui applique sur une créature cible (le MJ choisit la cible, jamais le joueur). |
| Real-time sync | Firestore `onSnapshot` listeners on active campaign + character + recent events |
| e2e environment | Tous les tests Playwright tournent contre la **Firebase Local Emulator Suite** (Firestore + Auth), **jamais** contre la base eu-west1 réelle. Vaut pour S1 (plan 13.5) et tous les sprints suivants (campaigns/memberships S2+ idem). Connexion émulateur conditionnée à `VITE_USE_FIREBASE_EMULATOR=true`, off par défaut (un build de prod qui pointerait sur localhost serait une catastrophe). `firestore.rules` chargées dans l'émulateur — les e2e s'exécutent contre les vraies security rules, jamais en open-bar. Acté 2026-05-16. |
| Event logging | Auto on every gameplay action. See `docs/EVENT-LOG.md`. |
| GDPR | Export endpoint + account deletion endpoint mandatory before public launch (S5) |
| Visual fidelity | Faithful to `prototype/grimwar.html` (mobile-first), small refinements OK |

Any decision NOT in this table is Claude Code's call. If it affects multiple plans, document it in the relevant `docs/*.md`.

## Folder structure

```
grimwar/
├── public/
│   ├── data/                    # bundled SRD/Free Rules JSON
│   ├── icons/                   # PWA icons
│   └── manifest.webmanifest
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── features/
│   │   ├── auth/                # sign-in, account upgrade
│   │   ├── library/             # character list + content browser
│   │   ├── wizard/              # character creation + level-up
│   │   ├── sheet/               # character sheet (5 modes)
│   │   ├── dice/                # roll engine + tray
│   │   ├── radial-menu/         # press-hold FAB
│   │   ├── campaigns/           # S2 — campaign list, settings, invites
│   │   ├── invitations/         # S2 — join flow
│   │   ├── dm-view/             # S3 — DM dashboard
│   │   ├── encounters/          # S3 — combat tracker
│   │   ├── sessions/            # S3 — session manager + notes
│   │   ├── journal/             # S3 — auto-compiled campaign journal
│   │   ├── map/                 # S4 — PixiJS VTT
│   │   ├── account/             # S5 — settings, GDPR, billing-ready
│   │   └── legal/               # S5 — privacy, ToS
│   ├── shared/
│   │   ├── components/          # GlassPanel, Card, Button, Chip, Icon, Aurora…
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── firebase.ts
│   │   │   ├── dexie-db.ts
│   │   │   ├── content-loader.ts
│   │   │   ├── event-logger.ts  # the single entry point for logging
│   │   │   ├── permissions.ts   # canEdit(user, character, campaign) etc.
│   │   │   ├── i18n.ts          # t(key) + entity name resolver
│   │   │   ├── rules/           # 5e rule helpers
│   │   │   └── slices/          # zustand slices
│   │   ├── types/
│   │   └── design/
│   └── styles/
├── docs/                        # architectural reference
├── plans/                       # GSD work queue
├── scripts/                     # content extraction
├── content-sources/             # raw PDFs + HTML (gitignored)
├── prototype/grimwar.html      # visual reference
└── tests/
```

## Coding conventions

- **File names**: `kebab-case.ts` / `kebab-case.tsx`. One component per file, file name = component name.
- **Component names**: `PascalCase`. Hooks: `useThing`. Zustand stores: `useThingStore`.
- **Imports**: `@/` alias for cross-feature. Relative imports only within a feature folder.
- **Comments**: French for prose, English for code identifiers. Comment the **why**.
- **No `any`**. Use `unknown` and narrow. `as` only after a guard.
- **No default exports** for components. Named exports only.
- **Functional components only.** No class components.
- **No `useEffect` for derived state.** Compute in render or `useMemo`.
- **State boundaries**: `useState` for local UI, feature Zustand slice for cross-component, root slice for app-wide.
- **Tailwind first.** Custom CSS only when Tailwind can't express it. Prefer CSS modules over global.
- **`cn()` helper** in `src/shared/lib/cn.ts` wrapping `clsx` + `tailwind-merge` for all conditional classes.
- **All UI strings via `t(key)`** from `src/shared/lib/i18n.ts`. FR default.
- **Transitions douces partout via les tokens du design system.** Toute apparition, disparition ou changement d'état visible (panneau d'aide, hover, ouverture de combobox, fade, slide, etc.) DOIT utiliser les tokens `ease-base` / `ease-spring` + une `duration-*` Tailwind explicite. Pas d'apparition instantanée brutale — c'est une exigence de qualité perçue, pas du polish optionnel. Acté 2026-05-16 suite au panneau d'aide « Historique » qui clignote au survol parce qu'il s'affiche sans transition.
- **Rédaction i18n : majuscule en début de phrase + ponctuation correcte + zéro anglicisme en FR.** Toute chaîne `t()` visible utilisateur (label, item de liste, intro, helper) commence par une majuscule. Pas d'argot anglais dans le contenu pédagogique FR (`fence` → `receleur`, etc.). Acté 2026-05-16 suite à la passe pédagogique du wizard.

## Forbidden patterns

- ❌ `eval`, `new Function`, `dangerouslySetInnerHTML` (unless sanitized — ask first)
- ❌ Class components
- ❌ Default exports for components
- ❌ Magic numbers in JSX (extract to consts or tokens)
- ❌ Inline styles for non-dynamic styling
- ❌ Hardcoded colors / fonts / sizes (use tokens)
- ❌ Hardcoded UI strings (use `t(key)`)
- ❌ **Free-string items in inventory** (must reference items DB)
- ❌ Mixing Firestore reads with presentation (data layer hooks only)
- ❌ Skipping security rules updates when adding new collections
- ❌ Skipping event logging when adding new gameplay actions

## Required at every commit

- `pnpm typecheck` clean
- `pnpm test` green
- `pnpm lint` clean
- **`pnpm dev` UAT navigateur obligatoire sur tout plan qui produit ou modifie de l'UI visible** (route, screen, mode de fiche, composant rendu). La triple gate ne prouve pas que l'app se rend ; jusqu'à plan 13.5 (Playwright), un humain doit ouvrir `http://localhost:5173/` et valider visuellement. Acté 2026-05-16 suite au bug "rien ne s'affiche" sur `/` détecté à la première UAT navigateur réelle du plan 12.5 — cf. `plans/DEBT.md > D2`.
- **`pnpm test:e2e` vert sur tout plan qui touche routes / screens / wizard / dice / Sheet.** Gate séparée de la triple gate unitaire (les e2e dépendent de l'émulateur Firebase + sont plus lents). À exécuter avant le commit qui se réclame "livré" sur ces périmètres. Pré-requis : `pnpm e2e:emulators` actif en parallèle (requiert Java/JRE 11+) + `pnpm e2e:install` une fois. Spec `wizard-modal.spec.ts` est UI-only et tourne sans émulateur — les autres specs se skippent proprement quand l'émulateur n'est pas joignable (pas de faux-vert silencieux). Acté 2026-05-17 plan 13.5 — cf. `plans/DEBT.md > D8`.
- **Firebase deploy discipline — toute modification de `firestore.rules` ou `firestore.indexes.json` DOIT être déployée AVANT la livraison du code applicatif qui la consomme** (`pnpm firebase:deploy:rules` ou `pnpm firebase:deploy:indexes`). C'est l'**esprit** de la règle : ne jamais livrer un code de prod qui requiert une rule ou un index pas encore en live — sinon le client crashe avec « Missing or insufficient permissions » ou query refusée (failed-precondition). Pas la **lettre** « avant le commit qui se réclame livré » (les indexes peuvent être en avance — déclarés sur disque pour la doc, déployés au plan consommateur — déployer un index vide est du bruit). Table de correspondance index → plan consommateur dans `plans/DEBT.md > D5`. Acté 2026-05-17 (reformulation suite à plan 13.5). Avant tout deploy de rules : `pnpm test:rules` (rules-unit-testing contre l'émulateur ; requiert Java/JRE 11+).
- **Principe « rouge avant vert » pour les tests anti-régression** — tout test censé prévenir un bug visuel ou comportemental DOIT être vu échouer sur le code cassé AVANT de passer après fix. Un test qui asserte juste la présence d'une classe CSS pendant que le bug est à l'écran est inutile. Acté 2026-05-16 suite à 2 occurrences du pattern « test vert / bug visible » (form-kit blanc-sur-blanc UAT plan 05 + Button text-ink évincé par tailwind-merge).
- **Tester le runtime, pas l'état disque (cache Dexie).** Le contenu public (`public/data/*.json`) est caché dans IndexedDB via Dexie (TTL 7j) et invalidé par `contentHash` dans `index.json` (cf. `plans/DEBT.md > D7`). Tout changement de `public/data/` régénère ce hash → flush automatique au prochain boot de session utilisateur. Conséquence pour les tests : **un test qui lit directement `public/data/*.json` ne reflète PAS l'état runtime servi à l'utilisateur** — pour tester un bug user-visible côté contenu, le test doit passer par le cache (ou au moins par `loadPublicContent`). Acté 2026-05-16 suite à la 2e occurrence du bug « sorts vides pour les lanceurs » que le test d'intégrité disque (`content-integrity.test.ts`) ne pouvait pas attraper.
- **Specs de parcours complet (smoke + wizard) à maintenir dans le plan qui ajoute un sous-choix obligatoire.** Tout plan qui ajoute ou rend obligatoire une étape, un chooser ou un sous-choix dans le wizard de création de personnage (étapes Identity → Recap, sous-choix d'ascendance, sous-choix de classe) DOIT mettre à jour `tests/e2e/smoke.spec.ts` ET `tests/e2e/wizard.spec.ts` DANS LE MÊME COMMIT : ces 2 specs encodent le parcours utilisateur réel de bout en bout. Si elles ne reflètent plus le wizard actuel, elles cassent silencieusement (skip émulateur) ou bruyamment (clic sur Suivant désactivé). Vérification : `pnpm test:e2e` doit passer ces 2 specs sans patch après le plan. Acté 2026-05-18 suite à l'obsolescence cumulée des 2 specs à travers plans 13.7/13.8/13.9 — les sous-choix d'ascendance (Humain Compétent) avaient cassé les specs sans qu'on s'en aperçoive, car les e2e étaient skippées faute de Java.
- **Couverture matricielle obligatoire par plan — l'UAT manuel d'Adrien est l'EXCEPTION, pas la norme.** Tout plan qui ajoute ou modifie une étape, un sous-choix, une classe, une ascendance, un background, une feat, un sort ou une règle au wizard / à la fiche DOIT, dans le même commit, étendre la matrice de tests de parcours (cf. `tests/wizard-matrix/*` une fois livrée) pour couvrir le nouveau cas. Un plan dont la couverture matricielle n'est pas étendue n'est PAS « done ». L'UAT navigateur reste obligatoire pour le ressenti visuel/animation, mais tout ce qui est mécaniquement vérifiable (« telle combinaison produit-elle un perso cohérent », « telle option est-elle sélectionnable », « telle donnée arrive-t-elle sur la fiche ») relève des tests, pas d'Adrien. Acté 2026-05-18 suite à 3 bugs trouvés en UAT manuel (sorts d'ascendance EN→FR, Barde 0 compétence, Roublard Expertise bloquée) — tous triviaux à automatiser, tous restés cachés faute de tests de parcours intégrés.
- **Intégrité référentielle des bundles SRD.** Toute référence croisée entre `public/data/*.json` (slug de sort, skill, item, feat, invocation, langue, etc.) DOIT résoudre dans son bundle de destination. Test garde-fou : `tests/content-referential-integrity.test.ts` — échoue dur sur la moindre référence cassée. Tout plan qui touche un bundle ou ajoute une référence cross-bundle DOIT vérifier que ce test reste vert. Acté 2026-05-18 suite au bug 1 « sorts d'ascendance EN→FR » que ce test attrape désormais.
- **Vérité du contenu — chaque test d'affichage vérifie l'IDENTITÉ du contenu, pas sa présence.** Acté 2026-05-19 suite au bug « Mastery · Écorchure » trouvé en UAT 4a (préfixe EN codé en dur sur le badge Combat) : un test qui asserterait juste « un badge est rendu » serait vert pendant que le bug est à l'écran. Règle transverse, applicable dès tout plan qui rend du contenu issu d'un bundle SRD. Six catégories d'invariants OBLIGATOIRES :
  1. **Cohérence référentielle étendue.** Tout slug référencé (sort, arme, feat, invocation, langue, classe) résout dans son bundle de destination ; détecter aussi les entrées orphelines. Étendre `tests/content-referential-integrity.test.ts` à chaque nouvelle référence cross-bundle.
  2. **Contenu affiché = contenu attendu (identité, pas présence).** Ouvrir la modale d'un élément X DOIT asserter titre/niveau/école/description correspondant EXACTEMENT à l'entrée X du bundle. Pas « contient le mot X » — « contient EXACTEMENT le champ `name.fr` / `description.fr` du slug X ».
  3. **Fidélité bundle — 15-20 entrées de référence figées.** Un test prend 15-20 entrées (sorts, armes, classes) dont les valeurs ont été vérifiées contre le SRD officiel UNE FOIS en amont, et asserte que le bundle contient ces valeurs exactes. Détecte une dérive du bundle. La vérification humaine contre le SRD s'effectue UNE seule fois à l'ajout — le test fige la vérité ensuite.
  4. **Calculs de règles — résultat chiffré contre la règle SRD.** CA, modificateurs, bonus de maîtrise, DD de sauvegarde, dégâts : asserter le NOMBRE attendu (« CA = 13 pour cuir clouté + Dex 12 » → `expect(ac).toBe(13)`, pas `expect(ac).toBeGreaterThan(0)`).
  5. **Cohérence inter-écrans (wizard → fiche).** Tout choix fait au wizard se retrouve À L'IDENTIQUE sur la fiche. Test : seed personnage avec `clericDivineOrder='protector'`, charger la fiche, asserter que la carte Ordre divin affiche EXACTEMENT « Protecteur » (et NON « Thaumaturge »).
  6. **Cas-limites de règles — intersections.** Expertise sur compétence DÉJÀ maîtrisée par la classe (×2 final, pas ×3) ; sort fourni par l'ascendance ET la classe (pas de duplication, source prioritaire claire) ; Weapon Mastery sur arme que la classe ne peut pas manier (interdit à la sélection). Pas seulement les cas « propres ».
  
  **Source de vérité = le bundle SRD** (`public/data/*.json`), dérivé du SRD 5.2.1 sous Creative Commons. Les PDF copyrightés de `content-sources/pdfs/` ne sont JAMAIS lus, parsés ni référencés par un test ou un script (gravé dans le decision log). La vérification humaine contre le SRD officiel se fait UNE FOIS par fait, en amont, pour poser les valeurs de référence du point 3 — ensuite le test garde la vérité figée. Objectif : zéro vérification humaine répétée. Plan 13.12 (matrice de tests de parcours, stub livré 2026-05-19) reçoit un volet structuré « vérité du contenu » qui systématise ces 6 catégories ; jusqu'à sa livraison, chaque plan UI applique les 6 catégories au périmètre qu'il touche.
- **Source d'autorité terminologique FR — traductions officielles D&D 5e UNIQUEMENT.** Acté 2026-05-20 suite à 3 occurrences cumulées d'approximations terminologiques (invocations occultistes inventées ; langues nommées de mémoire ; « cantrip » → « tour de magie » au lieu de « sort mineur » lors du hotfix 4c). La source de vérité terminologique FR du projet est la **traduction officielle D&D 5e** : glossaires VO/VF officiels, SRD FR (`FR_SRD_CC_v5.2.1.pdf`), PHB FR, livres officiels FR. PAS l'intuition. PAS la mémoire du modèle. PAS une traduction de jeu vidéo (Baldur's Gate 3, Solasta…). PAS un terme « qui sonne bien ». Pour tout NOUVEAU terme français introduit dans le projet (bundle, UI, panneau d'aide, test) qui désigne un concept D&D, la procédure est OBLIGATOIRE : (1) si le terme existe déjà dans le bundle SRD FR du projet, **réutilise-le tel quel** ; (2) sinon, **vérifie contre une source officielle** (glossaire VO/VF, SRD FR, PHB FR) AVANT d'écrire le terme, et **cite la source dans le commit message** ; (3) si la source officielle est ambiguë ou introuvable, **pose la question à Adrien** — il a les livres officiels FR sous la main et tranche. Tu n'inventes pas, tu ne devines pas. Un terme non-officiel détecté = bug bloquant à corriger comme un anglicisme. Garde-fou de régression : `FORBIDDEN_NON_OFFICIAL_FR_TERMS` dans `tests/helpers/i18n-guard.ts` (catégorie distincte de `FORBIDDEN_ENGLISH_IN_FR_UI`), scannée transversalement par `tests/content-no-english-in-fr.test.ts` sur l'ensemble de `public/data/*.json`. À chaque nouveau cas découvert, ajouter le terme à la liste avec sa source officielle en commentaire.
- **Livraison visuelle — dossier `uat-review/` unique par commit UI, captures TOUJOURS en pleine page.** À chaque commit qui touche l'UI, Claude rassemble dans `uat-review/` à la racine du projet (gitignored) UNIQUEMENT les captures-clés que l'utilisateur doit juger pour CE commit — pas la galerie e2e brute, pas les 20 PNG du run, seulement les écrans qui montrent ce qui a changé ou ce qui reste à valider sensoriellement. Nommage : `NN-description-courte.png` (préfixe numéroté à 2 chiffres + description en kebab-case français), dans l'ordre exact où l'utilisateur doit les regarder. **Toutes les captures sont en pleine page** (`fullPage: true` côté Playwright) — toute la hauteur scrollable du document, de haut en bas. Une capture viewport-only tronque le contenu hors écran et ne permet PAS une vraie validation. Exception : si un panneau interne a son propre `overflow` indépendant du scroll du document (rare), `fullPage` ne le capturera pas — dans ce cas Claude doit le signaler explicitement à l'utilisateur dans le rapport et compléter par un screenshot ciblé sur l'élément. Le rapport de livraison DOIT contenir : (a) le chemin absolu du dossier, (b) la liste ordonnée des fichiers avec UNE phrase par fichier disant ce qu'il faut vérifier dessus (« vérifier que les 2 sections sont visuellement distinctes », « vérifier le contraste du titre doré », etc.). Après validation (ou liste de corrections), `uat-review/` est vidé avant le commit suivant — au début de chaque commit UI, Claude commence par `rm -rf uat-review/*` puis re-remplit avec les captures pertinentes pour le nouveau commit. Pas d'accumulation cross-commit. Acté 2026-05-19 suite au commit 4c du plan 13.9 — les screenshots attachés au rapport Playwright HTML étaient éparpillés test par test et pénibles à parcourir ; le dossier dédié réduit le coût de l'UAT visuel à une seule galerie ordonnée. Mise à jour 2026-05-19 (même jour) suite à l'UAT 4c : les premières captures viewport-only ne montraient qu'un fragment de la fiche — `fullPage: true` devient obligatoire. Mise à jour 2026-05-20 (modales) : pour toute capture d'une **modale ouverte**, ajouter une **deuxième capture `viewport: true`** en plus de la pleine page — `fullPage` reprojette la modale dans le flux du document et masque le ressenti d'overlay (backdrop, ancrage `items-end` mobile, opacité, stacking) ; la viewport-only restitue l'overlay. Le contenu textuel exhaustif se lit sur la pleine page, le ressenti visuel sur la viewport. Le helper `tests/e2e/helpers/screenshot.ts` accepte une option `{ viewport: true }` pour la seconde capture.
- Conventional commit message: `feat(scope): summary` or `fix(scope): summary`

## References

- `docs/ARCHITECTURE.md` — folder structure, routing, data flow, PWA
- `docs/DATA-MODEL.md` — Firestore schema, types, indexes
- `docs/DESIGN-SYSTEM.md` — colors, type, motion, components
- `docs/PERMISSIONS.md` — DM/Player/Spectator matrix
- `docs/EVENT-LOG.md` — event types, structure, visibility
- `docs/I18N.md` — text shape, translation strategy
- `docs/VARIANTS.md` — 5e variants and where each is wired
- `docs/COMMERCIAL-READINESS.md` — security, GDPR, monetization placeholders
- `docs/ROADMAP.md` — 5-sprint plan
- `plans/00-overview.md` — full plan index

## When in doubt

1. Check this file's decision log.
2. Check `docs/*.md`.
3. Check the prototype HTML.
4. Check the relevant plan's `## Notes for next plan`.
5. **Only if none answer it: pause and ask Adrien** (see autonomy rules above).
