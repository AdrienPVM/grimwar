# Dette technique tracée

Registre dédié aux dettes qui traversent plusieurs plans. Une dette = un propriétaire explicite (`owner` = plan qui doit la lever). Toute mention dans un plan doit pointer ici, pas se dupliquer.

> **Règle** : si une note de plan dit « à régler plus tard », elle vit ici. Les `## Notes for next plan` des plans restent pour le contexte de continuité (passage du témoin entre plans adjacents), pas pour la dette long-cours.

## D1 — `spell.damage[]` canonique depuis le SRD (consolide plans 09 + 12)

- **Owner** : plan 19 (Bibliothèque) — premier surface où `spell.damage[]` structuré crée une valeur utilisateur visible (filter chips « sorts de dégâts X », affichage canonique « Dégâts : 8d6 feu » dans la fiche du sort).
- **Statut** : ouverte. Regex stopgap en place, comportement utilisateur correct sur les sorts courants.
- **Bloque** : rien en S1. Plan 22 (event-log), 24 (encounters), 25 (journal) consomment le **résultat roulé** (`rawFaces + total + label`), pas la formule canonique — la regex reste suffisante côté table.
- **Surface impactée** :
  - `src/features/sheet/modes/magie/spell-detail-modal.tsx:25` — extraction regex `/(\d+d\d+(?:[+-]\d+)?)/i` depuis `description.fr`.
  - `src/shared/types/content.ts` — `SpellDamageSchema` optionnel ajouté plan 12 step 9 (forward-compat), aujourd'hui jamais peuplé.
  - `scripts/build-public-content.ts` — pipeline d'extraction pas câblé.
  - `public/data/spells.json` — 330 entrées sans `damage[]`.
- **Problème** : la regex extrait UNE formule depuis la prose FR. Limites connues :
  - Dés multiples (`1d8 acide + 1d4 feu`) → ne prend que le premier.
  - Dégâts à niveau supérieur (`+1d6 par niveau au-dessus`) → ignoré.
  - Écritures en lettres → ignoré.
  - Pas de typage de dégâts (feu / acide / radiant…) → impossible côté UI/event.
- **Stopgap actuel** : `extractDamageFormula(description.fr)` retourne `null` si pas de match → `handleCast` passe en mode « cast sans toast de dégâts », pas de throw. Comportement silencieux non-bloquant. Validé en UAT plan 09.
- **Cible** : pipeline SRD 5.2.1 PDF → `spell.damage[]` peuplé avec `{ formula, type, atHigherLevels? }` (typage = SRD damage types). Lecture canonique en priorité, regex en fallback (toujours présente pour homebrew sans `damage[]`).
- **Critère de complétion** :
  1. `scripts/build-public-content.ts` peuple `spell.damage[]` pour les sorts SRD à dégâts identifiés.
  2. `spell-detail-modal.tsx > handleCast` lit `spell.damage[0].formula` en priorité ; regex en fallback strict.
  3. Bibliothèque (plan 19) ajoute un filter chip « Inflige des dégâts » + chip par type de dégâts.
  4. Tests : 3 sorts canoniques (Boule de feu 8d6 feu / Trait de feu cantrip / Projectile magique avec atHigherLevels) — formule + type correct.
  5. Cette entrée passe en statut « résolue » avec lien vers le commit.
- **Notes liées** :
  - plan 09 step `## Notes for next plan > Dette regex damage → mapping canonique (plan 12)` — pointe ici.
  - plan 12 step 9 + step 30 + `## Notes for next plan > Pipeline spell.damage[]` — pointent ici.
  - plan 12.5 `## Notes for next plan > Pipeline spell.damage[]` (si présent) — à harmoniser.

## D2 — Point d'entrée S1 manquant (LibraryScreen + nav shell)

- **Owner** : plan 13.6 (LibraryScreen + nav shell).
- **Statut** : **résolue** en commit `b522775` (`feat(library): library screen + nav shell (plan 13.6)`). Cette entrée reste ici pour la trace de cause-racine ; voir aussi section `## Résolu` ci-dessous.
- **Cause-racine** : le S1 a livré `SheetScreen` (plans 06-10) et le wizard `/create` (plan 05) sans jamais bâtir l'écran d'accueil ni un nav shell persistant. Aucun plan ne portait explicitement la responsabilité du point d'entrée. La route `/` montait un `<Home />` placeholder qui rendait un emblème HP hardcodé `<HeroEmblem hp={28} hpMax={32} letter="L" />` (Lyralei).
- **Détection** : première UAT navigateur réelle au plan 12.5 (commit `b45438e`). Avant ce point, les UAT s'étaient faits sans `pnpm dev` — triple gate verte ne prouve pas que l'app se rend.
- **Conséquence** : un utilisateur ouvre `/` → emblème hardcodé Lyralei, aucune navigation possible, impossible de créer ou d'ouvrir un perso existant sans taper l'URL à la main.
- **Surface impactée** :
  - `src/routes.tsx:18-24` — `function Home()` hardcodé.
  - `src/App.tsx` — pas de header persistant entre routes.
  - `src/features/library/` — répertoire vide (`.gitkeep` seulement) malgré ce que laissaient supposer les références « library » dans plusieurs plans.
  - `src/features/sheet/sheet-screen.tsx:54-57` + `:75-78` — `<Link to="/">` ad hoc dans les états d'erreur, palliatifs.
  - `src/features/sheet/modes/avoir/custom-item-form.tsx:151` — placeholder « Grimoire personnel de Lyralei » (autre relique hardcodée à éliminer).
- **Comblé en 13.6** : route `/` monte `<LibraryScreen />` réelle (query `users/{uid}/characters/`, grille de cards, empty state, CTA Créer), `<NavShell />` sticky persistant sur toutes les routes, élimination complète des références Lyralei dans le code de prod.
- **Leçon de process** : aucun plan S1 ne contenait l'étape DoD « `pnpm dev` → vérifier dans le navigateur ». Corrigé structurellement par l'ajout d'une ligne dans `CLAUDE.md` section commit checks (cf. plan 13.6 step 14 — élargi à TOUT plan qui produit ou modifie de l'UI visible, pas seulement routes/screens). Playwright (plan 13.5) ajouté juste après pour rendre ce filet automatique sur le parcours critique.
- **Critère de complétion** :
  1. `src/routes.tsx` ne contient plus `Home` hardcodé ; route `/` monte `<LibraryScreen />`.
  2. `<NavShell />` monté dans `App.tsx`, visible sur `/`, `/create`, `/character/:id`.
  3. Grep `Lyralei` + `letter="L"` + `hp={28}` + `hpMax={32}` dans `src/` (hors `__tests__/`) → zéro.
  4. UAT navigateur Adrien validé (375 + 414px).
  5. Cette entrée bascule en `## Résolu` avec le hash du commit final.

## D3 — Wizard de création abandonné + 3 bugs structurels exposés

- **Owner** : plan 05 (le nouveau, `plans/05-character-creation-wizard.md`).
- **Statut** : **résolue** en commit `023c451` (`feat(wizard): unified pedagogical character creation (plan 05)`). Cette entrée reste ici pour la trace de cause-racine ; voir aussi section `## Résolu` ci-dessous.
- **Cause-racine** : l'ancien plan 05 (`manual-character-screen.tsx`, formulaire monopage) a été UAT par Adrien en navigateur réel le 2026-05-16. 3 bugs structurels bloquants + 1 défaut de conception ont été constatés :
  1. **`setDoc(undefined)`** — `src/shared/lib/inventory.ts > addItemToInventory` écrit `contentSource: scopeId` où `scopeId === undefined` pour scope `'public'` (cas du wizard 100 % du temps). `src/shared/lib/firebase.ts > getDb` initialise Firestore en mode strict (`getFirestore()` sans `ignoreUndefinedProperties`). Zod `optional()` ne distingue pas « absent » de « undefined ». → Création crash pour tout perso.
  2. **Sorts non listés pour un lanceur** — `public/data/classes.json` a des IDs **EN** (`wizard`, `sorcerer`, …) ; `public/data/spells.json > spell.classes[]` a des IDs **FR** (`magicien`, `ensorceleur`, …). Le filtre `s.classes.includes('wizard')` matche `['magicien']` → 0 sort. Pipeline AideDD écrit du FR dans un champ qui doit être EN canonique (cf. CLAUDE.md « PDFs source of truth #1 »).
  3. **Texte blanc sur fond blanc** — `manual-character-screen.tsx` utilise massivement `text-text-primary` (17 occurrences) et `bg-bg-deep/40`. Or `tailwind.config.ts:31-36` palette `text` = `{DEFAULT, secondary, tertiary, faint}` (**pas de `primary`**) et `bg` = `{DEFAULT, 2, 3, elev}` (**pas de `deep`**). → Classes Tailwind inexistantes, aucune règle CSS générée, inputs héritent du UA défaut.
  4. **Conception** — formulaire monopage, layout desktop non exploité, zéro explication pédagogique, jargon partout. Inadapté à un débutant total.
- **Détection** : première UAT navigateur réelle du formulaire de création (post-13.6 qui a rendu l'app accessible via `/`). Le verrou « UAT navigateur obligatoire » ajouté à CLAUDE.md suite à D2 a **immédiatement payé** — il a détecté la dette dès la première session UAT effective.
- **Conséquence** : l'ancien plan 05 est **jeté entier**. Pas de patch sur du code qu'on remplace. Le plan 17 (wizard guidé S2) est **fusionné** dans le plan 05 pour ne pas maintenir deux parcours de création.
- **Surface impactée** :
  - `src/features/wizard/manual-character-screen.tsx` — supprimé.
  - `src/features/wizard/submit-character.ts` — réécrit (ou remplacé) pour servir le nouveau wizard.
  - `src/shared/lib/inventory.ts > addItemToInventory` — omission de `contentSource` quand undefined.
  - `src/shared/lib/firebase.ts > getDb` — `initializeFirestore({ignoreUndefinedProperties: true})`.
  - `scripts/build-public-content.ts` + `scripts/parse-aidedd.ts` — map `CLASS_ID_FR_TO_EN` appliquée sur `spell.classes[]`.
  - `public/data/spells.json` — re-généré.
  - `tailwind.config.ts` — palette inchangée (les classes inexistantes n'étaient pas le vrai problème — le wizard utilise désormais les tokens canoniques `text-text` + `bg-bg-3/40` via composants form partagés).
  - `src/shared/components/form/` — nouveau (composants accessibles, barrière structurelle contre le retour du bug #3).
  - `src/features/wizard/` — réécrit en wizard multi-step pédagogique.
  - `plans/17-wizard-creation.md` — réduit à un stub de redirection.
  - `plans/00-overview.md` + `docs/ROADMAP.md` — mis à jour (43 → 42 plans).
- **Leçons de process** :
  - **L'UAT navigateur obligatoire (CLAUDE.md, ajoutée suite à D2) fonctionne.** Elle a détecté la dette à la première vraie session UAT. Confirmation que la règle est rentable. Ne pas la lâcher.
  - **Triple gate verte ≠ produit qui marche.** TypeScript + tests unitaires + lint n'ont pas attrapé `setDoc(undefined)` (le path runtime n'était pas testé), ni le mismatch FR/EN (pas de test d'intégrité cross-bundle), ni les classes Tailwind inexistantes (PurgeCSS ne fail pas sur classes non-définies, il les ignore silencieusement). Le **test d'intégrité cross-bundle** (`content-integrity.test.ts`) ajouté par le nouveau plan 05 plug ce trou pour la classe « mismatch d'IDs entre bundles ».
- **Critère de complétion** :
  1. Nouveau plan 05 livré + commit `feat(wizard):` mergé.
  2. Les 3 bugs sont **structurellement absents** par construction du wizard, vérifiés en UAT bout-en-bout (Magicien + Barbare + multi-class sur 375/414/1024/1440px).
  3. Audits grep `text-text-primary|bg-bg-deep` + `<input |<select |<textarea ` dans `src/features/wizard/` = zéro.
  4. Test `content-integrity.test.ts` vert dans la triple gate.
  5. Cette entrée bascule en `## Résolu` avec le hash du commit `feat(wizard):`.

## D4 — Don au niveau 1 (`featAtLevel1`) à insérer dans le wizard quand la campagne l'active

- **Owner** : plan 14 (Campaigns model) — c'est le premier plan où `activeCampaign.settings.variants` existe dans l'app.
- **Statut** : ouverte. Hors scope S1 du nouveau plan 05 (le wizard S1 se fait **sans contexte de campagne actif** — les campagnes arrivent en S2 plan 14).
- **Pourquoi cette dette** : le variant 5e `featAtLevel1` est par décision lockée (CLAUDE.md) un toggle **par-campagne** (`campaigns/{id}.settings.variants.featAtLevel1: boolean`). Le wizard de création doit donc le respecter — mais en S1 il n'y a pas de notion de campagne, donc on ne peut pas (et il ne faut pas) le câbler dans le wizard avant que le modèle campagne existe.
- **Contrat attendu côté wizard quand plan 14 livré** :
  - Le wizard de création de PJ lit `activeCampaign.settings.variants.featAtLevel1` (depuis le contexte de campagne dans laquelle la création est lancée — la création hors-campagne reste possible et ignore le variant).
  - Si `featAtLevel1 === true` ET niveau ≤ 1, **insérer une étape Don** entre l'étape Caractéristiques et l'étape Historique.
  - L'étape Don liste tous les feats (filtrés par prerequisites). Le joueur en pick 1.
  - Le feat pické alimente `extraProficiencies` / `featureUsage` côté `Character` selon ses grants.
  - Bouton « Choisir pour moi » (build de référence) — feats par défaut par classe (ex. Magicien : Tough ou Magic Initiate).
  - Contenu pédagogique i18n `wizard.help.feat.<featId>.*` (tagline / whyChoose / inGame) à ajouter au même volume que les classes.
- **Surface impactée (au moment du fix par plan 14)** :
  - `src/features/wizard/steps/` — nouveau `feat-step.tsx`.
  - `src/features/wizard/reference-builds/<classId>.ts` — étendus avec un champ `recommendedFeat`.
  - `src/shared/lib/i18n.ts` — clés `wizard.help.feat.*` (~ 5 clés × N feats SRD).
  - `src/shared/lib/slices/wizard-slice.ts` — `currentStep` adapté pour insertion conditionnelle.
  - `docs/VARIANTS.md` — vérifier que la mention `featAtLevel1` y est canonique.
- **Critère de complétion** :
  1. Plan 14 livre les campagnes + leur `settings.variants`.
  2. Le wizard de création (depuis le contexte d'une campagne où `featAtLevel1 === true`) propose l'étape Don.
  3. Test e2e Playwright : créer un PJ dans une campagne `featAtLevel1: true` → l'étape Don apparaît, le feat est appliqué, la fiche finale a le grant.
  4. Test e2e Playwright : créer un PJ dans une campagne `featAtLevel1: false` (défaut) → l'étape Don est skippée.
  5. Cette entrée bascule en `## Résolu` avec le hash du commit.

## D5 — Discipline « rules + indexes : modif disque ⇒ deploy »

- **Owner** : ce document + `CLAUDE.md` (règle de process, pas une feature à livrer).
- **Statut** : **résolue de process** au commit qui ajoute la règle dans `CLAUDE.md` + `pnpm test:rules`. Reste ouverte tant qu'elle ne fait pas partie d'un check automatisable (pre-deploy hook ou CI gate).
- **Cause-racine** : `firestore.rules` a été corrigé en local au commit `89c7e09` (`fix(firestore): align character rules with multi-class schema`, 2026-05-16) sans `firebase deploy --only firestore:rules` à la suite. Pendant la session UAT plan 05 du 16 mai, la création de personnage en prod a échoué avec « Missing or insufficient permissions » alors que `characterShapeOK` côté disque acceptait le payload. La triple gate locale ne pouvait rien détecter — c'est un décalage **disque ↔ live**, pas un bug applicatif.
- **Conséquence** : 1 session de debug d'environ 1h, fausse piste « setDoc(undefined) bis » au début. Production cassée sur la fonctionnalité critique (création perso) tant que le deploy n'a pas eu lieu.
- **Règle de process (mise en place + reformulée 2026-05-17 plan 13.5)** :
  1. **Toute modification de `firestore.rules` ou `firestore.indexes.json` doit être déployée AVANT la livraison du code applicatif qui la consomme** — c'est l'esprit, pas la lettre « avant le commit qui se réclame livré ». Les indexes peuvent être déclarés sur disque en avance (doc anticipée pour S2/S3) ; déployer un index vide est du bruit. Ne jamais livrer un code de prod qui REQUIERT une rule ou un index pas encore live.
  2. Avant tout `firebase deploy --only firestore:rules`, **exécuter `pnpm test:rules`** (rules-unit-testing contre l'émulateur). Bloque les régressions structurelles sur le schéma de characters.
  3. Ajout d'un test rules-unit-testing dans `tests/firestore-rules.test.ts` qui vérifie : payload multi-class accepté, payload ancien schéma refusé, payload incomplet refusé, écriture cross-uid refusée, accès non-auth refusé.
  4. Le test skip propre quand l'émulateur Firestore n'est pas joignable (warning visible dans la sortie). Pour exécuter pour de vrai : `pnpm test:rules` (requiert Firebase CLI + Java/JRE 11+ pour la JVM de l'émulateur).
- **Table de correspondance index → plan consommateur** (pour mémoire des déploiements à faire au moment où chaque plan atterrit) :
  | Indexes déclarés | Plan consommateur (à déployer alors) |
  |---|---|
  | `campaigns` (composites) | Plan 14 — Campaigns model |
  | `memberships` (composites) | Plan 14 — Campaigns model (+ plan 16 Memberships permissions) |
  | `events` (composites) | Plan 22 — Event log |
  | `sessions` (composites) | Plan 23 — Sessions |
  | `encounters` (composites) | Plan 24 — Encounters |
  | `handouts` (composites) | Plan 27 — Handouts |
  | `npcs` (composites) | Plan 28 — NPCs |
  Aucune query S1 (plans 01-13.6) ne dépend d'un index composite — `users/{uid}/characters/` utilise un seul orderBy `updatedAt desc` qui est auto-créé par Firestore. Donc aucun deploy d'indexes n'est requis tant que les plans S2+ ne sont pas livrés.
- **Surface impactée** :
  - `CLAUDE.md` — section « Required at every commit » et nouveau bloc « Firebase deploy discipline » qui pointent ici.
  - `tests/firestore-rules.test.ts` — nouveau, charge `firestore.rules` dans l'émulateur via `@firebase/rules-unit-testing`.
  - `package.json` — script `test:rules`, dev-dep `@firebase/rules-unit-testing@^4`.
- **Reste ouvert** :
  - Pas de hook git ou de gate CI qui REFUSE le commit si `firestore.rules` change sans deploy. Pour S5 : ajouter un `pre-push` qui compare hash disque vs hash live (`firebase firestore:rules:get`), bloque si écart.
- **Critère de fermeture** :
  1. Règle dans `CLAUDE.md`. ✅
  2. Test rules-unit en place et exécutable via `pnpm test:rules`. ✅
  3. Hook/CI automatisant la détection du décalage. ⏳ S5.

## D6 — Fiche de personnage non responsive desktop

- **Owner** : **plan 13.14** (`plans/13.14-sheet-responsive-desktop.md`, cadrage acté 2026-05-19 — position roadmap indicative, peut être remontée par Adrien).
- **Statut** : ouverte. Détectée lors de l'UAT plan 05 du 16 mai 2026, à l'atterrissage sur la fiche après création de personnage. Owner précis posé 2026-05-19.
- **Cause-racine** : les 5 modes de la fiche (`combat` / `essence` / `magie` / `avoir` / `ame`, plans 06-12) ont été construits **mobile-first** sans pass desktop. À large viewport, le layout mobile s'étire (cards pleine largeur, padding sous-utilisé) au lieu d'exploiter l'espace disponible (2 cols, sticky sidebar, dense par endroit).
- **Conséquence** : la fiche est utilisable mais ergonomiquement sous-optimale sur écran large. Pas bloquant pour le MJ qui joue sur téléphone (cas nominal), gênant pour les usages annexes (préparation de session sur PC).
- **Surface impactée (à confirmer après audit)** :
  - `src/features/sheet/sheet-screen.tsx` — coquille.
  - `src/features/sheet/modes/*-mode.tsx` — chaque mode à reprendre.
  - `src/features/sheet/hero/`, `src/features/sheet/mode-tabs/`, `src/features/sheet/status/` — composants partagés.
- **Hors scope du wizard (plan 05)** : aucune correction de la fiche dans le lot wizard. La dette est seulement **tracée** ici pour que la mémoire de projet la garde.
- **Critère de complétion** :
  1. Audit mode-par-mode par Adrien (PC + grand écran).
  2. Plan dédié créé et numéroté. ✅ — plan 13.14 livré 2026-05-19 (cadrage).
  3. Chaque mode revu avec breakpoints `md:` + `lg:` (et `xl:` quand pertinent).
  4. UAT navigateur 1024 + 1440 + 1920 px validée par Adrien.
  5. Cette entrée bascule en `## Résolu` avec le hash du commit final.

## D7 — Cache Dexie du contenu public sans invalidation cross-build

- **Owner** : ce document + commit qui durcit le mécanisme (Bug 1 + Bug 2 + dev/prod + Hardening A-F).
- **Statut** : **RÉSOLUE 2026-05-17** post-UAT Adrien (`pnpm dev` + F5 simple, SANS wipe IndexedDB ni hard refresh — l'invalidation s'est faite toute seule, Magicien + Occultiste rendent leurs sorts). Le mécanisme `contentHash` de `9559b9b` était nécessaire mais pas suffisant : deux bugs structurels distincts ont été identifiés (cf. ci-dessous) puis fermés par le commit post-13.7 (Bug 1 + Bug 2 + Hardening A-F). Vigilance UAT post-déploiement maintenue côté équipe.
- **Mise à jour post-13.7 (3e occurrence)** : le diagnostic a mis au jour 2 bugs structurels dans le mécanisme initial :
  - **Bug 1 — SW Workbox SWR sur index.json (latent)** : `vite.config.ts` mettait `/data/*.json` y compris `index.json` en StaleWhileRevalidate. En prod PWA (SW enregistré), un index.json périmé pouvait être servi → comparaison contentHash entre deux instantanés cohérents périmés → aucune purge. Fix : règle dédiée `NetworkFirst` (timeout 3s) pour `index.json` placée AVANT le pattern SWR générique, fallback cache en offline. Test : `src/shared/lib/__tests__/sw-config.test.ts` (garde structurelle sur la config Workbox).
  - **Bug 2 — mémoïsation absorbant les échecs comme succès (présent, vicieux)** : `let publicCacheFreshnessPromise: Promise<void> | null = null` était assigné à une promesse qui se résolvait avec `undefined` sur 4 chemins de fail (fetch throw, HTTP ≠ 2xx, JSON parse error, contentHash absent). Tous les appels suivants court-circuitaient sans rejouer. Symptôme observé Adrien 2026-05-17 : index.json fetché pendant le rebuild 13.7 → JSON parse error → mémoïsation figée → cache stale servi jusqu'au hard refresh + wipe IndexedDB. Fix : sémantique **succès uniquement**, la mémoïsation est remise à `null` sur échec pour que le prochain appel re-tente.
  - **Fail silencieux dev vs prod** : `console.warn` discret en dev est dangereux (on re-vit un cache figé invisible). Fix : `signalFreshnessFailure` distingue `import.meta.env.DEV` (console.error + throw, bruyant) de prod (console.warn + cache fallback, légitime offline). Le throw est rattrapé par `ensurePublicCacheFreshness` → pas de régression UX, le cache existant reste servi.
  - **Cache-busting URL-level sur index.json** : `?v=<timestamp>` ajouté à la fetch comme ceinture-bretelles côté client si jamais un SW ancien traîne sur un navigateur installé avant le fix Bug 1.
- **Durcissement A-F (post-13.7)** :
  - **A — Bannière visible si liste de sorts vide** : `src/features/wizard/steps/spells-step.tsx > CasterSection` rend un `<div role="alert">` `wizard.spells.bundleEmpty` quand `cantripList.length === 0 && level1List.length === 0`. Plus jamais d'écran muet sur un bug de contenu.
  - **B — Test d'intégration disque → runtime sans stub de fetch** : `src/shared/lib/__tests__/content-runtime-spells.test.ts` charge le vrai bundle via `loadPublicContent` (avec stub fetch redirigeant vers `fs.readFile`), assert ≥1 sort par classe lanceuse SRD. Couvre toute la chaîne disque → Zod → loader → cache → filtre runtime.
  - **C — Garde généralisée aux 8 classes lanceuses** : `src/features/wizard/steps/__tests__/spells-step-empty-banner.test.tsx` itère sur bard/cleric/druid/paladin/ranger/sorcerer/warlock/wizard. Couvert par construction côté UI puisque la bannière est rendue par `CasterSection` (1 instance par classe lanceuse).
  - **D — Compteurs spells par classe dans srd-counters** : `tests/srd-counters.test.ts > spells.json — couverture par classe lanceuse` ; seuils min par classe (bard 117 / cleric 105 / druid 107 / paladin 31 / ranger 38 / sorcerer 126 / warlock 70 / wizard 210) — détecte une régression silencieuse à la baisse.
  - **E — Debt AideDD→spells tracé** : voir `plans/DEBT.md > D9` (owner = plan 13.10) ; interdit `pnpm content:build` ajouté à `CLAUDE.md` jusqu'à 13.10.
  - **F — Test du mécanisme d'invalidation de bout en bout** : `src/shared/lib/__tests__/content-loader-freshness.test.ts` couvre Bug 2 (fetch throw / HTTP 500 / JSON corrompu / hash absent → la mémoïsation NE fige PAS, le prochain appel re-tente) + succès mémoïsé une fois. `src/shared/lib/__tests__/sw-config.test.ts` couvre Bug 1 (config Workbox structurelle).
- **Cause-racine** : `src/shared/lib/content-loader.ts > loadPublicContent` cache les bundles `public/data/*.json` dans Dexie avec un TTL **7 jours** sans aucun mécanisme d'invalidation par version. Quand un build régénère un bundle (ex. `spells.json` migré FR→EN au commit `70f7a4d`), le cache Dexie d'une session ouverte avant ce build garde l'ancienne version pendant 7j. Symptôme observé en UAT plan 05 (2026-05-16) : Magicien + Occultiste avec liste de cantrips **vide à l'écran** alors que `public/data/spells.json` sur disque contenait 16 cantrips wizard. Le test d'intégrité ajouté à `70f7a4d` (`content-integrity.test.ts:70-75`) **lisait le fichier disque directement** et ne traversait pas le cache Dexie → faussement vert.
- **Conséquence** : 1 session de debug sur la deuxième occurrence du bug « sorts vides ». Pire, le test correctif initial était aveugle au mode runtime — la classe de bug pouvait re-frapper à chaque build de contenu.
- **Fix** :
  1. `scripts/build-public-content.ts` écrit un `contentHash` (sha-256 stable sur le contenu sérialisé de tous les bundles, types triés) dans `public/data/index.json`. Pas un timestamp — un hash change ssi le contenu change, et détecte aussi les rollbacks.
  2. `content-loader.ts > ensurePublicCacheFreshness` : au premier `loadPublicContent` d'une session, fetch `index.json`, compare au hash stocké dans `dexie.settings['public:contentHash']`. Si différent → `clearAllPublicContent()` (purge **toutes** les rows publiques, tous types confondus) + écrit le nouveau hash.
  3. Mémoïsation par module → 1 round-trip réseau par session, partagé entre tous les callers concurrents.
  4. Offline-safe : si `fetch('/data/index.json')` échoue (réseau coupé), on sert le cache existant sans crasher — c'est une PWA, le boot doit fonctionner en mode airplane.
  5. Test rouge-puis-vert dans `src/features/wizard/steps/__tests__/spells-step-cache.test.tsx` : pré-pollue Dexie avec un spells.json FR + un contentHash périmé, mock le fetch sur le nouveau hash + le bundle EN canonique, rend `<SpellsStep />` pour un Magicien niveau 1, attend que la liste contienne au moins « Rayon de givre ». **Vu rouge** sur le code pré-fix (liste vide), **vu vert** après le fix.
- **Surface impactée** :
  - `scripts/build-public-content.ts` — calcul + écriture du `contentHash`.
  - `src/shared/lib/content-loader.ts` — `ensurePublicCacheFreshness` + appel depuis `loadPublicContent`.
  - `public/data/index.json` — nouveau champ `contentHash` (optionnel pour compat builds antérieurs).
  - `src/features/wizard/steps/__tests__/spells-step-cache.test.tsx` — test correctif d'intégration.
  - `CLAUDE.md` — règle « tester le comportement runtime, pas l'état disque » ajoutée à la section testing.
- **Leçon de process** :
  - **Un test qui lit `public/data/*.json` directement NE reflète PAS l'état runtime servi à l'utilisateur.** Le contenu visible passe par le cache Dexie. Pour tester un bug user-visible côté contenu, il faut passer par le cache (ou au moins par le loader). Cette leçon est consignée dans `CLAUDE.md` pour ne pas reproduire le pattern « test d'intégrité disque faussement vert pendant que l'écran est cassé ».
  - **Hash, pas timestamp.** Un timestamp change à chaque build même si le contenu est identique (flushes inutiles) et ne détecte pas un rollback (timestamp plus ancien mais contenu différent → comparaison « strictement plus récent » rate le retour en arrière). Un hash stable change ssi le contenu change.
- **Critère de fermeture** :
  1. Mécanisme `contentHash` + invalidation en place. ✅
  2. Test rouge-puis-vert vert dans la triple gate. ✅
  3. **Bug 1 — SW NetworkFirst sur index.json + test structurel garde Workbox.** ✅ (post-13.7)
  4. **Bug 2 — mémoïsation succès-uniquement + tests des 4 chemins de fail.** ✅ (post-13.7)
  5. **Fail bruyant en dev, silent fallback en prod offline.** ✅ (post-13.7)
  6. **Hardening A-F livrés.** ✅ (post-13.7)
  7. **UAT navigateur Adrien sans wipe IndexedDB ni hard refresh.** ✅ 2026-05-17 — `pnpm dev` + F5 simple, Magicien + Occultiste rendent leurs sorts directement, aucune bannière vide.
  8. Une session UAT post-déploiement confirme l'auto-flush sur build régénéré. ✅ 2026-05-17 — l'auto-flush a fonctionné sur le rebuild plan 13.7 (`spells.json` régénéré, contentHash bumpé, Dexie purgée à l'ouverture sans intervention).

## D8 — Suite e2e Playwright S1 — filet livré + purge partielle (3/7), résiduel ownerisé plan 20.5

- **Owner** : **plan 20.5** (`plans/20.5-e2e-expansion-s2-close.md`) — date de péremption explicite avant la livraison du plan 21 (DM dashboard, premier plan S3).
- **Statut** : **purge partielle** (3/7 livrés). Le filet golden-path est en place (smoke + modal + library) ET le fixture `seedCharacter` (Admin SDK contre l'émulateur) débloque structurellement la dette résiduelle. 3 specs ont été livrées immédiatement par le complément 13.5 (2026-05-17) en utilisant ce fixture. Les 4 specs restantes ne sont plus structurellement bloquées — elles attendent leur plan owner pour être livrées.
- **Cause-racine** : les plans 05 à 12.5 ont successivement différé leurs tests e2e en attendant un wiring Playwright dédié (option A — plan 13.5). Le wizard plan 05 nous a fait chasser à la main des bugs structurels (modale dans le flux du parent, white-on-white form-kit) qu'un e2e navigateur aurait attrapés avant l'UAT humain. Le filet automatique manquait.
- **Conséquence** : tant que Playwright n'était pas câblé, chaque plan UI rejouait le rôle « UAT navigateur humain obligatoire » côté Adrien.
- **Surface livrée par plan 13.5** :
  - `playwright.config.ts` — Chromium émulation Pixel 7, webServer `pnpm dev` avec `VITE_USE_FIREBASE_EMULATOR=true`, retain trace + screenshot + video on failure.
  - `tests/e2e/fixtures.ts` — `expectModalInViewport(page)` (la primitive qui aurait attrapé le bug modale du wizard), `expectBodyScrollRestored`, `isEmulatorReachable`, `waitForAppReady`, helpers wizard.
  - `tests/e2e/smoke.spec.ts` — smoke central : `/ rend LibraryScreen + CTA → /create wizard → submit Magicien → /character/:id rend → retour /`. **Étape 9 du plan : sanity-check « si LibraryScreen redevient placeholder, smoke casse » vérifié à la livraison.**
  - `tests/e2e/wizard-modal.spec.ts` — invariant viewport/scroll de la `DetailModal` au tap `?` sur une carte de classe. **Tourne SANS émulateur** (la spec n'écrit pas en Firestore) → seul spec exécutable sans Java/JRE chez Adrien.
  - `tests/e2e/wizard.spec.ts` — création < 2min (dette plan 05 step 24).
  - `tests/e2e/deferred-debt.spec.ts` — `test.fixme()` placeholders pour les 6 areas plus profondes (sheet/combat/essence/magie/avoir/dice-digital/dice-physical), apparaissent comme TODO dans le rapport Playwright pour que rien ne se perde silencieusement.
  - Émulateur wiring : `src/shared/lib/firebase.ts` connecte `connectAuthEmulator` + `connectFirestoreEmulator` quand `VITE_USE_FIREBASE_EMULATOR=true`. App Check désactivé en mode émulateur (sinon les requêtes échouent).
  - `firebase.json` : bloc `emulators` (auth 9099, firestore 8080, ui 4000).
  - Scripts : `pnpm test:e2e`, `pnpm e2e:install`, `pnpm e2e:emulators`.
  - `CLAUDE.md` : nouveau gate « `pnpm test:e2e` vert sur tout plan UI » + reformulation D5 (esprit vs lettre).
- **Surface livrée par le complément 13.5 (2026-05-17)** — purge partielle 3/7 :
  - `tests/e2e/seed-character.ts` — fixture central. Crée un perso pré-peuplé dans Firestore via Admin SDK (bypass rules) à `users/{uid}/characters/{charId}`, où `uid` est l'anon UID de la page courante exposé sur `window.__e2eAuthUid` par `auth-provider.tsx` quand `VITE_USE_FIREBASE_EMULATOR=true` (hook strictement test-only, jamais en prod). Exporte 2 presets : `fighterL3` (Guerrier dague équipée, cas Combat + dice physique) et `wizardL3` (Magicien 4 sorts connus, cas Magie). Extensible par ajout de presets.
  - `tests/e2e/combat.spec.ts` — golden path Combat : seed → /character/:id → tab Combat → tap −1 PV → tap +1 PV. Vérifie le cycle Firestore round-trip HpMegaCard.
  - `tests/e2e/magie.spec.ts` — golden path Magie : seed Magicien L3 → tab Magie → barre stats + au moins 2 sorts de la liste known visibles. Valide le câblage cache Dexie spells.json + Firestore knownSpells + rendu UI.
  - `tests/e2e/dice-physical.spec.ts` — invariant clé du mode physique : seed Guerrier mode physique → tap attaque → `PhysicalRollModal` → face d20=12 (neutre) → Valider → `HitMissGateModal` apparaît → tap Raté → tout se ferme. Vérifie que la chain digital-style n'a pas été réintroduite par erreur.
  - `src/features/auth/auth-provider.tsx` — hook `window.__e2eAuthUid` ajouté, gated par `env.useFirebaseEmulator` (jamais alimenté en prod).
  - `tests/e2e/deferred-debt.spec.ts` — re-écrit : ne contient plus que les 4 placeholders résiduels (sheet/essence/avoir/dice-digital), tous re-targetés sur plan 20.5.
  - `plans/20.5-e2e-expansion-s2-close.md` — stub de plan créé. Owner explicite des 4 specs restantes ; date de péremption = avant plan 21.
  - `plans/00-overview.md` — ligne plan 20.5 ajoutée à la liste S2.
- **Java/JRE requis** : OUI pour la majorité de la suite — l'émulateur Firebase tourne sur JVM. Sans Java :
  - `wizard-modal.spec.ts` → **tourne** (UI-only, lit `public/data/*.json`, ne fait pas d'écriture Firestore).
  - `smoke.spec.ts`, `wizard.spec.ts` → **skip propre** avec message visible (« Firestore emulator unreachable on 127.0.0.1:8080 »). Pas de faux-vert.
  - `deferred-debt.spec.ts` → TODO, n'échoue pas, n'a pas besoin de Java.
- **Reste ouvert (4 specs, ownerisées plan 20.5)** :
  - **Sheet foundation** (plan 06 step 17) — `/character/:id` rend hero card + status strip + 5 mode tabs + switch effectif entre modes. Pure lecture du doc Firestore après seed.
  - **Essence mode** (plan 08 step 16) — tap petal/save/skill déclenche un toast roll + une entrée dans l'historique ; toggle inspiration persiste.
  - **Avoir mode** (plan 10 step 14) — ajout d'item depuis la DB + équiper/retirer ; assertion structurale : aucun TextInput libre pour le slug item dans la modale d'ajout (refus free-string by construction).
  - **Dice digital** (plan 12 step 31) — cycle attaque + dégâts SANS modale physique (invariant clé du mode digital) ; entrée historique avec badge `D`.
  - Owner précis : **plan 20.5** (`plans/20.5-e2e-expansion-s2-close.md`). Date de péremption : avant la livraison du plan 21 (DM dashboard, premier plan S3) — si plan 21 atterrit sans ces 4 specs, la dette aura migré dans S3 et il faudra ré-ownerer.
  - Tests unitaires des mêmes mécaniques (`hp-combat.test.ts`, `roll-with-flags.test.ts`, `spell-slots.test.ts`, `inventory-rules.test.ts`, `use-dice.test.ts`) couvrent déjà la logique pure ; ce qui manque, c'est le câblage UI + Firestore round-trip que seul un e2e prouve.
- **Reste ouvert (transverse, non-bloquant pour la purge)** :
  - CI GH Actions pour automatiser les e2e à chaque PR : plan 40 (production deploy + perf).
  - Visual regression / snapshots : non inclus en S1 (Percy/Argos en option S5).
- **Critère de fermeture** :
  1. Suite Playwright livrée et fonctionnelle. ✅
  2. Step 9 sanity-check vérifié (LibraryScreen cassé → library-render.spec.ts FAILED ; reverté → vert). ✅
  3. Modal invariant vert même sans émulateur. ✅
  4. Fixture `seedCharacter` livré et utilisable. ✅ — complément 13.5.
  5. Combat / Magie / Dice physique purgés. ✅ — complément 13.5.
  6. Sheet / Essence / Avoir / Dice digital purgés. ⏳ — plan 20.5.
  7. Cette entrée bascule en « ## Résolu » quand 6 ✅. À ne PAS faire avant — actuellement la purge est partielle et la dette doit rester visible.

## D9 — `pnpm content:build` réhydrate `spells.json` depuis AideDD (violation politique de contenu)

- **Owner** : **plan 13.10** (Spells cleanup SRD 5.2.1).
- **Statut** : **RÉSOLUE (cause sorts) 2026-05-20** au commit 3 du plan 13.10 — voir `## Résolu`. La cause-racine (sorts `public/data/spells.json` d'origine AideDD) est éliminée : le bundle est régénéré strict SRD 5.2.1 bilingue (339, 0 `en=null`) par `extract-srd-spells.ts`, et la source AideDD est retirée du chemin sorts de `build-public-content.ts`. ⚠️ **L'interdit `pnpm content:build` reste néanmoins en force** — non plus à cause des sorts, mais parce que `build-public-content.ts` est globalement obsolète (vide classes/ancestries/feats/invocations s'il est lancé). Cette nouvelle cause est tracée séparément en **D17** (le critère #5 ci-dessous est donc *superseded by D17*, pas honoré). Tracée 2026-05-17 lors du diagnostic du bug "sorts vides UAT plan 13.7" (3e occurrence).
- **Cause-racine** : `scripts/build-public-content.ts` lit `content-sources/extracted/aidedd/spells.json` (et magic-items, items partiels…) en plus du SRD pour fabriquer `public/data/spells.json`. La politique de contenu **lockée 2026-05-17** (cf. CLAUDE.md > Decision log > Politique de contenu) interdit toute source au-delà de **SRD 5.2.1 EN + FR**. Le pipeline actuel viole cette règle de fait sur les sorts — c'est un héritage du jalon S1 où AideDD couvrait des trous SRD non encore extraits.
- **Conséquence** : tant que la dette est ouverte, **toute exécution de `pnpm content:build` régénère `spells.json` à partir d'une source interdite**. Le fichier sur disque peut donc bouger silencieusement (FR-pollué, sorts hors-SRD, schemas non canoniques) et déclencher des bugs UI à chaque rebuild. Le bug "sorts vides UAT plan 13.7" en est une instance latente : le contenu peut être correct sur disque à un instant T mais le mécanisme amont est fragile.
- **Interdit temporaire (jusqu'à 13.10 livré)** : **NE PAS exécuter `pnpm content:build`** tant que la dette est ouverte. Le bundle actuel sur disque est sain (confirmé par les compteurs `tests/srd-counters.test.ts > Hardening D` et l'intégration runtime `src/shared/lib/__tests__/content-runtime-spells.test.ts`) — le rejouer ne ferait que ré-introduire la source AideDD. Cet interdit est aussi notifié dans `CLAUDE.md` pour qu'aucun plan ne le franchisse par inadvertance.
- **Surface impactée** :
  - `scripts/build-public-content.ts:36-46` — `normalizeSpellEntity` accepte les `spell.classes[]` AideDD et les normalise FR→EN. Le belt-and-braces masque la cause-racine : la source AideDD ne devrait simplement plus exister dans le pipeline.
  - `scripts/build-public-content.ts:48-49` — `SRD_DIR` + `AIDEDD_DIR` co-lus.
  - `scripts/parse-aidedd.ts` — extraction sorts depuis HTML AideDD.
  - `content-sources/aidedd/` — sources interdites par la politique (rappel CLAUDE.md).
  - `public/data/spells.json` — 330 entrées dont une partie hors-SRD (~18 spells à retirer, +21 SRD manquants — chiffres du plan 13.10).
- **Critère de complétion (plan 13.10)** :
  1. Extraction `scripts/extract-srd-spells.ts` qui parse `content-sources/pdfs/SRD_CC_v5.2.1.pdf` (+ FR overlay `FR_SRD_CC_v5.2.1.pdf`) — pas d'AideDD.
  2. `scripts/build-public-content.ts` ne lit PLUS `content-sources/extracted/aidedd/spells.json`. La source AideDD pour sorts est physiquement retirée du pipeline (la fonction `normalizeSpellEntity` peut être supprimée — son existence trahit la dette).
  3. `public/data/spells.json` ré-extrait : 18 non-SRD purgés, 21 SRD manquants ajoutés, 44 renames SRD 5.2.1 appliqués.
  4. Compteurs `Hardening D` (`tests/srd-counters.test.ts`) ré-alignés sur les volumes SRD canoniques (vraisemblablement différents de la table 117/105/107/31/38/126/70/210 héritée d'AideDD).
  5. ~~Interdit `pnpm content:build` levé dans CLAUDE.md.~~ **SUPERSEDED BY D17** (2026-05-20) : l'interdit ne pouvait PAS être levé honnêtement par un fix sorts-only — `build-public-content.ts` est destructif sur 5 types de contenu (dry-run vérifié au commit 3). L'interdit reste, requalifié dans CLAUDE.md avec la vraie cause.
  6. Cette entrée bascule en `## Résolu` avec le hash du commit.
- **Notes liées** :
  - plan 13.10 `## Notes for next plan` — cible explicite de la dette.
  - CLAUDE.md > « Required at every commit » — pointe ici via l'interdit temporaire.

## D10 — `character.skills` incomplet sur les persos créés AVANT le fix UAT 13.8 du 2026-05-18

- **Owner** : aucun plan dédié — pas de migration prévue. Cette entrée est purement mémorielle.
- **Statut** : ouverte au sens « les persos existants sont touchés », mais **sans plan d'action** (décision Adrien 2026-05-18 : les fiches v1/v2 antérieures à ce fix seront supprimées et recréées à neuf plutôt que migrées).
- **Cause-racine** : avant le fix, `submit-from-wizard.ts > buildCharacterFromWizard` n'écrivait dans `character.skills` que les `draft.pickedSkills`. Deux sources de maîtrise étaient silencieusement perdues :
  1. **Background** (Acolyte → Insight + Religion, etc.) — bug latent, jamais remonté en UAT parce qu'aucune surface ne montrait la lacune (l'étape Compétences cochait visuellement les skills background mais ne les écrivait pas au submit).
  2. **Ancestry** (Humain Compétent → 1 skill, Elfe Sens Aiguisés → 1 skill) — détecté en UAT plan 13.8 : la skill choisie au step ascendance n'apparaissait nulle part sur la fiche.
- **Conséquence sur la base existante** : toute fiche créée avant le commit de fix porte un `character.skills` lacunaire. Concrètement, sur un Acolyte/Magicien créé avant 2026-05-18 : `character.skills` ne contient PAS `insight` ni `religion` ; sur un Humain Compétent : `character.skills` ne contient PAS la skill choisie en ancestry.
- **Décision (Adrien 2026-05-18)** : pas de migration. Les rares persos de test pré-fix seront supprimés/recréés à neuf. Cette dette est **non-bloquante** parce qu'aucune fiche en prod ne dépend de l'exactitude de `character.skills` côté DM/joueur réel (premier jeu de table prévu post-S2).
- **Surface impactée (résolue côté code)** :
  - `src/features/wizard/submit-from-wizard.ts:174-185` — `buildSkillProficiencies({ backgroundSkills, ancestrySubChoices, pickedSkills, expertiseSkills })` remplace le `for (sid of pickedSkills) skills[sid] = 1` lacunaire.
  - `src/features/wizard/steps/skills-step.tsx` — affiche les skills granted (background+ancestry) cochées+verrouillées avec tag de source ; le pool de picks de classe est réduit visuellement, le `count` reste inchangé.
  - `src/shared/lib/rules/skill-proficiencies.ts` (nouveau) — agrégateur central pur. **Une seule source de vérité** consommée par wizard step + submit. Quand le plan 13.9 ajoutera Expertise du Roublard, un seul endroit à brancher.
  - Tests anti-régression : `src/shared/lib/rules/__tests__/skill-proficiencies.test.ts` (23 tests table-driven), `src/features/wizard/steps/__tests__/skills-step.test.tsx` (4 tests rendu), `src/features/wizard/__tests__/submit-from-wizard-ancestry.test.ts` (4 tests submit étendus).
- **Critère de complétion** : aucun — cette dette ne sera pas levée par migration. Bascule en `## Résolu` quand Adrien confirme la suppression des persos de test pré-fix.
- **Leçon de process** : un test d'agrégation par source de maîtrise (background, ancestry, classe, expertise) doit être présent **dès la livraison initiale** de chaque step qui touche `character.skills`. C'est la garde qui aurait attrapé le bug background-latent dès plan 05. Le plan 13.9 hérite désormais explicitement de cette exigence (cf. plan 13.9 > « Exigences héritées de 13.8 »).

## D11 — Bugs UAT 2026-05-18 : sorts d'ascendance EN→FR + Barde non créable

- **Owner** : commit fix du jour (entrée mémorielle, pas de plan dédié).
- **Statut** : **résolue 2026-05-18** par le même commit qui ajoute les tests d'intégrité référentielle et le fix Bug 1 + Bug 2. Les 2 sorts SRD 5.2.1 manquant encore du bundle (`rayon-de-maladie`, `feinte-vie`) restent **sous D9** (plan 13.10 = spells cleanup).
- **Cause-racine commune** : aucune garde structurelle ne validait l'intégrité référentielle entre `public/data/*.json` ni que le pool de skill-picks d'une classe soit ≥ count. Deux régressions silencieuses sont passées à travers la triple gate :
  1. **Bug 1 — slugs EN dans `ancestries.json` vs slugs FR dans `spells.json`.** `scripts/data/srd-ancestries-l1.ts` hardcodait `dancing-lights`, `fire-bolt`, `minor-illusion`, … alors que `spells.json` n'expose que `lumieres-dansantes`, `trait-de-feu`, `illusion-mineure`, … Le runtime `AncestrySpellsCard > resolveAncestrySpellEntries` skippait silencieusement → **la carte des sorts d'héritage/lignage NE S'AFFICHAIT PAS** sur la fiche pour Elfe + Gnome + Tieffelin.
  2. **Bug 2 — `classes.json > bard.skillChoices.from = []`.** Le parser PDF SRD a raté le motif « Choose any 3 skills (see "Playing the Game") » du Barde 2024. Pool de picks vide → toutes les checkboxes désactivées → bouton Suivant verrouillé → **Barde impossible à créer**.
- **Détection** : UAT manuel Adrien après que la suite e2e ait été débloquée (plan 13.5 Java/JDK 25 + plan 13.9 fix wrap `firebase emulators:exec`). Les 3 specs ancestry e2e ont commencé à passer en `test.fixme()` avec pointeur clair, ce qui a déclenché le diagnostic. Le Barde a été signalé par Adrien suite à un essai manuel.
- **Conséquence** : 3 occurrences cumulées de bugs « contenu mécaniquement testable trouvé par UAT humain ». Trigger pour la **politique de couverture matricielle obligatoire** ajoutée à `CLAUDE.md` (cf. règle « UAT manuel = EXCEPTION »). Le plan matriciel dédié à la couverture par parcours intégré est en cours de spécification (post-bug-fix de ce commit).
- **Surface impactée (livrée)** :
  - `scripts/data/srd-ancestries-l1.ts` — 17 slugs EN → FR (Tieffelin × 3, Elfe × 3, Gnome × 2). 2 slugs (`rayon-de-maladie`, `feinte-vie`) commentés en `DEBT D9 — absent du bundle FR jusqu'à 13.10`.
  - `scripts/data/srd-classes-l1.ts` — nouveau `SRD_CLASS_SKILL_CHOICES_OVERRIDE` matérialisant le « Choose any N » du Barde en 18 skills EN.
  - `scripts/extract-srd-classes.ts` — applique l'override + log du nombre de skillChoices override(s) appliqués.
  - `public/data/ancestries.json` + `public/data/classes.json` — régénérés par les 2 scripts SRD-only.
  - `tests/content-referential-integrity.test.ts` — nouveau ; 4 tests vu rouge avant le fix, vu vert après. Tripwire D9 explicite (cassera quand 13.10 ajoute les 2 sorts).
  - `CLAUDE.md > Required at every commit` — 2 nouvelles règles : « Couverture matricielle obligatoire par plan » + « Intégrité référentielle des bundles SRD ».
- **Leçons de process** :
  - **Un test d'intégrité référentielle cross-bundle est la garde minimale absolue.** Tout slug ID dans un bundle doit résoudre dans son bundle de destination. Sans ce garde, n'importe quel rebuild peut casser le runtime silencieusement.
  - **Un pool de picks vide est un état inacceptable** — la garde « pool ≥ count » doit exister par construction. Cette classe de bug est triviale à détecter, sa détection par UAT humain est un signal d'absence de garde.
  - **L'UAT humain est l'EXCEPTION.** Tout ce qui est mécaniquement vérifiable doit l'être par un test automatique. La politique acte 2026-05-18 dans `CLAUDE.md`.
- **Critère de fermeture** : tous remplis ; entrée mémorielle prête à basculer en `## Résolu` au prochain housekeeping.

## D12 — Mécanique de lancement des sorts d'ascendance (slots / once-per-day / featureUsage L3+L5 Tieffelin)

- **Owner** : plan dédié à créer post-13.11. Piste : `13.8c` (lot dédié court) ou intégration au plan futur « Long Rest + Daily Resources » qui matérialisera le compteur `featureUsage` (lecture/écriture par PJ + reset à la fin du long rest).
- **Statut** : ouverte. Tracée 2026-05-19 à la livraison du plan 13.8b.
- **Cause-racine** : le plan 13.8b a livré la **consultation** des sorts d'ascendance (cliquables, modale détail, présence dans la `SpellList` générale avec chip source distinct, sans classe lanceuse requise — cf. commits `d89086f` / `d4d0de8` / `38c5cae`). Il a explicitement laissé hors périmètre la **mécanique de cast** côté ascendance — d'où le bouton « Lancer » désactivé avec hint `t('sheet.magie.cantNotImplementedAncestry')` quand la classe-source résolue est `'ancestry'` (et seulement dans ce cas — un cantrip d'ascendance qui se trouve aussi côté classe lanceuse reste castable via la source classe, cf. cas collision couvert par `spell-list.test.tsx`).
- **Conséquence** : l'utilisateur peut consulter ses sorts d'héritage / lignage sur la fiche, mais ne peut pas (encore) les lancer depuis l'app. Pour le moment l'utilisateur tire son dé et applique la résolution à la main — non-bloquant pour le jeu de table (la fiche documente le sort), mais incomplet vis-à-vis de la promesse « tap-to-roll ».
- **Scope attendu de la résolution** :
  1. **Consommation de slot pour les cantrips Tieffelin / Elfe / Gnome** : les cantrips d'ascendance ne consomment **pas** de slot (cantrip = at-will dans le SRD 5.2.1) — la mécanique ici est juste « lancer le dé d'attaque ou de save + appliquer dégâts/effet ». À câbler comme un cast normal mais sans déduction de slot.
  2. **Compteur 1×/jour pour les sorts L3 + L5 Tieffelin** (`Fiendish Legacy` : `level3SpellId` + `level5SpellId`). Stockage : `character.featureUsage[<featureKey>]: { used: number, max: number, period: 'long-rest' }`. Reset à la fin du long rest. Surface UI : modale détail montre « 1/1 utilisation/jour », passe désactivé quand `used >= max`.
  3. **Propagation des dégâts d'ascendance via le moteur de dés au MJ** pour application sur cible (chemin générique du dice mode — déjà en place côté classes lanceuses, à étendre à la source `'ancestry'`).
  4. **Cas Elfe Haut-elfe « swap cantrip à chaque Long Rest »** : UI long rest qui propose de choisir un autre cantrip Wizard. À cadrer comme partie du même plan ou tenant séparé.
- **Surface impactée (au moment du fix)** :
  - `src/features/sheet/modes/magie/spell-detail-modal.tsx` — bouton « Lancer » réactivé pour `'ancestry'`, branchement sur le moteur de dés.
  - `src/shared/lib/i18n.ts` — la clé `sheet.magie.cantNotImplementedAncestry` perd son utilité (tag pour suppression).
  - `src/shared/types/character.ts` (ou équivalent) — extension `featureUsage` si pas encore canonique pour les sorts d'ascendance (déjà prévue pour `Goliath > Giant Ancestry`, cf. `docs/AUDIT-SRD-COMPLETUDE.md` ligne 56).
  - `src/features/sheet/modes/magie/__tests__/spell-detail-modal-cast-ancestry.test.tsx` (nouveau) — cast cantrip d'ascendance + slot non consommé + roll publié.
  - `src/features/sheet/modes/magie/__tests__/spell-detail-modal-cast-fiendish-l3.test.tsx` (nouveau) — cast L3 Tieffelin + featureUsage incrémenté + bouton désactivé après usage.
- **Critère de complétion** :
  1. Bouton « Lancer » actif sur les sorts d'ascendance (cantrips + L3/L5 Tieffelin).
  2. Cantrips d'ascendance : cast publie un toast + entrée historique, n'écrit pas de slot.
  3. L3/L5 Tieffelin : `featureUsage` incrémenté, désactivation après usage, reset au long rest.
  4. Tests rouge-puis-vert pour chaque branche.
  5. Long rest UI propose le swap cantrip Haut-elfe (ou plan séparé explicite).
  6. Hint « Pas encore implémenté pour les sorts d'ascendance » retiré ; clé i18n associée supprimée.
  7. Cette entrée bascule en `## Résolu` avec le hash du commit.
- **Notes liées** :
  - plan 13.8b > Goal — pointe ici.
  - `docs/AUDIT-SRD-COMPLETUDE.md` — lignes Elf / Gnome / Tiefling annotées « rendu sheet OK (13.8b), cast → D12 ».

## D13 — Manifestations occultes (Warlock) : carte rendue affichage-seul, moteur pact-of-the-tome / pact-of-the-chain différé

- **Owner** : plan dédié à créer post-13.11. Piste : intégration au plan futur « Long Rest + Daily Resources » + au plan « Pact Magic » (slots Warlock courts à recharge short-rest). À ownerer explicitement avant la livraison du premier plan S3 qui touche au moteur de sorts.
- **Statut** : ouverte. Tracée 2026-05-20 à la livraison du plan 13.9 commit 4e.
- **Cause-racine** : le plan 13.9 commit 4e a livré la **consultation** des Manifestations occultes (Eldritch Invocations) — `InvocationsCard` en mode Essence, chaque invocation cliquable ouvrant `OrderDetailModal` (nom + summary du bundle). Il a explicitement laissé hors périmètre toute **mécanique active** côté invocation, car l'app L1 ne câble encore aucun moteur d'action/rituel sur ces capacités. Les 3 Pacts (Blade / Chain / Tome) sont ceux qui débloqueront du contenu mécanique — afficher un bouton « Lancer » / « Invoquer » dessus aujourd'hui ferait un faux signal d'interaction.
- **Conséquence** : l'utilisateur consulte ses invocations sur la fiche (mode Essence) mais ne peut pas (encore) en déclencher les effets mécaniques depuis l'app. Non-bloquant pour le jeu de table à L1 (les 5 invocations L1 sont majoritairement passives/permanentes) ; incomplet vis-à-vis de la promesse « tap-to-roll » dès que les pacts ouvrent du contenu actif.
- **Détail par invocation L1** (les 5 sans prérequis de niveau, cf. `docs/AUDIT-SRD-COMPLETUDE.md > C.3`) :
  1. **Armure d'ombres** (`armor-of-shadows`) — *Mage Armor* à volonté sur soi. Passif (CA dérivée) → à câbler côté calcul de CA quand le moteur le portera, pas un cast ponctuel.
  2. **Esprit occulte** (`eldritch-mind`) — avantage aux jets de Constitution pour maintenir la concentration. Passif → modificateur de règle, pas d'action.
  3. **Pacte de la lame** (`pact-of-the-blade`) — invoque une arme de pacte (Cha à l'attaque/dégâts, type de dégâts au choix). **Moteur d'arme à câbler** : créer une entrée d'attaque virtuelle en mode Combat, stat d'incantation = Cha. Différé.
  4. **Pacte de la chaîne** (`pact-of-the-chain`) — familier amélioré (4 formes spéciales). **Carte « Familier » + compteur à câbler.** Différé. (cf. plan 13.9 step 30.)
  5. **Pacte du grimoire** (`pact-of-the-tome`) — ajoute 3 cantrips + 2 sorts L1 rituels au répertoire. **Granting de sorts à câbler** : peupler `knownSpells['warlock-tome']` au moment du choix (wizard ou level-up), rendus en mode Magie avec source distincte. Différé. (cf. plan 13.9 step 30.)
- **Surface impactée (au moment du fix)** :
  - `src/features/sheet/modes/essence/invocations-card.tsx` — bornage actuel (consultation seule), pointe ici.
  - `src/features/wizard/submit-from-wizard.ts` (ou level-up) — granting `pact-of-the-tome` → `knownSpells`.
  - `src/features/sheet/modes/combat/` — entrée d'attaque virtuelle « arme de pacte » pour `pact-of-the-blade`.
  - `src/features/sheet/modes/combat/` — carte « Familier » + compteur pour `pact-of-the-chain`.
  - `src/shared/lib/rules/` — CA dérivée *Mage Armor* (`armor-of-shadows`), avantage concentration (`eldritch-mind`).
- **Critère de complétion** :
  1. `pact-of-the-tome` peuple `knownSpells` (3 cantrips + 2 rituels L1), rendus en mode Magie avec source distincte.
  2. `pact-of-the-blade` rend une entrée d'attaque en mode Combat (stat = Cha, type de dégâts au choix).
  3. `pact-of-the-chain` rend une carte « Familier » avec compteur d'usage le cas échéant.
  4. `armor-of-shadows` impacte la CA dérivée ; `eldritch-mind` impacte l'avantage concentration.
  5. Tests rouge-puis-vert pour chaque branche câblée.
  6. Cette entrée bascule en `## Résolu` avec le hash du commit.
- **Notes liées** :
  - `src/features/sheet/modes/essence/invocations-card.tsx` — commentaire de bornage pointe ici (corrigé 2026-05-20 : pointait par erreur sur D12, qui est la dette cast d'ascendance — sans rapport).
  - `docs/AUDIT-SRD-COMPLETUDE.md > C.3` — annotée « rendu sheet OK (13.9 commit 4e, Essence), moteur → D13 ».
  - Distincte de **D12** (mécanique cast des sorts **d'ascendance**) : structure parallèle (consultation livrée / moteur différé), périmètres disjoints (ascendance vs classe Warlock).

## D14 — Profils de créatures invoquées (statblocks) à intégrer comme type de contenu distinct

- **Owner** : plan dédié à créer (piste : plan « Invocations / créatures convoquées » en S3+, à ownerer avant le premier plan qui câble le combat des créatures invoquées). Lié à D13 (Pacte de la chaîne = familier) et D1 (`spell.damage[]`).
- **Statut** : ouverte. Tracée 2026-05-20 à la livraison du plan 13.10 commit 1.
- **Cause-racine** : 4 sorts SRD 5.2.1 embarquent dans leur description/montée en niveau un **profil de créature complet** (statblock : CA, PV, vitesse, caractéristiques, actions) destiné à être joué par le MJ : `appel-de-destrier` (Find Steed → Monture d'outre-monde), `animation-des-objets` (Animate Objects → Objet animé), `insecte-geant` (Giant Insect → Insecte géant), `convocation-de-dragon` (Summon Dragon → Esprit draconique). L'extraction texte SRD aplatit ces statblocks en prose illisible (colonnes `MODSAVEMODSAVEMODSAVE`, `For 18+4 +4Dex…`) et, pour 2 d'entre eux, les a fait fuir vers des sorts voisins (cf. commit 1 : scramble Animate Objects / Antilife Shell / Antipathy ; contamination Fireball par la Monture d'outre-monde). Le schéma `Spell` n'a aucun champ structuré pour un statblock embarqué.
- **Décision commit 1 (plan 13.10)** : **trim + marqueur visible**. Le statblock aplati est retiré de `description`/`atHigherLevels` et remplacé par un marqueur user-visible (`[Profil de la créature invoquée non inclus ici — voir le profil du SRD 5.2.1 ; suivi en dette D14.]` côté FR, équivalent EN). Le bundle ne porte donc PAS le profil de la créature — l'utilisateur lit le sort proprement mais doit se référer au SRD pour le statblock de la créature convoquée. Choix assumé : mieux vaut un marqueur honnête qu'un statblock illisible inline.
- **Conséquence** : à L1 non-bloquant (aucune de ces invocations n'est lançable par un PJ niveau 1 du premier jalon ; ce sont des sorts de niveau 2 à 5). Incomplet vis-à-vis du jeu de table dès qu'un PJ atteint le niveau de ces sorts et veut jouer la créature convoquée depuis l'app.
- **Surface impactée** :
  - `scripts/data/srd-spells.ts` — les 4 entrées portent le marqueur (rechercher `dette D14`).
  - `src/shared/types/content.ts` — `SpellSchema` à étendre (champ optionnel `summonedStatBlock` ou type de contenu `creature`/`statblock` séparé, référencé par slug).
  - Pipeline de bootstrap (`scripts/bootstrap-srd-spells.ts`) — réextraire les statblocks proprement (probablement saisie manuelle vérifiée contre le SRD, vu l'aplatissement).
- **Critère de complétion** :
  1. Un type de contenu « profil de créature invoquée » existe (schéma + bundle ou champ structuré), peuplé pour les 4 sorts.
  2. Les marqueurs `dette D14` sont retirés des 4 entrées `srd-spells.ts` au profit de la donnée structurée.
  3. Le mode Combat (ou un écran dédié) rend le statblock de la créature convoquée.
  4. Tests d'identité du contenu (les 6 catégories) sur les 4 statblocks.
  5. Cette entrée bascule en `## Résolu` avec le hash du commit.

## D15 — Artefacts de letter-spacing résiduels en corps de texte du bundle `spells`

- **Owner** : mini-plan dédié post-13.10 (ou queue de fin de 13.10 selon planning). À ownerer avant le plan 19 (Bibliothèque) qui rend les descriptions de sorts en pleine page.
- **Statut** : ouverte. Tracée 2026-05-20 à la livraison du plan 13.10 commit 1, scope confirmé par Adrien (pas de mini-commit immédiat — passe systématique dédiée).
- **Cause-racine** : l'extraction texte du PDF SRD a inséré des espaces parasites en plein milieu de mots du **corps de texte** des descriptions (pas seulement les titres). Exemples relevés : `« no a ns wer »` (≈ « no answer ») dans 3 sorts EN (`augure` / `communion` / `divination`), `« Vot re »` ×5, etc. Distinct de `normalizeSpacedTitle` (`scripts/bootstrap-srd-spells.ts`) qui ne corrige QUE les titres letter-spacés — le corps de texte n'a pas de passe équivalente.
- **Conséquence** : cosmétique, pas un bug fonctionnel (le sort reste lisible et mécaniquement correct). Mais visible en lecture pleine page → à nettoyer avant la Bibliothèque (plan 19).
- **Pourquoi pas corrigé au commit 1/2 du plan 13.10** : (1) le commit 1 a déjà un périmètre dense (pairing, gate, 20 fix structurels, D14, extracteur, tests) — greffer une passe transversale = commit fourre-tout ; (2) cosmétique, non bloquant ; (3) mérite sa propre passe avec audit complet du nombre d'occurrences + regex auditable + allowlist (pour les cas légitimes type abréviations « p. ex. »).
- **Critère de complétion** :
  1. Audit du nombre exact d'occurrences (combien de sorts, combien de fragments) sur le bundle régénéré.
  2. Regex auditable de dé-letter-spacing du corps de texte + allowlist explicite des faux positifs (abréviations, sigles légitimes).
  3. Test versionné garde-fou (échoue sur réintroduction d'un fragment letter-spacé connu).
  4. Bascule en `## Résolu` avec le hash du commit.

## D16 — Écart audit D.3 ↔ réconciliation réelle des renames/ajouts/retraits de sorts

- **Owner** : plan 13.10 commit 5 (annotation de `docs/AUDIT-SRD-COMPLETUDE.md > D.3`). Cette dette est un **flag de divergence à acter**, pas un bug à corriger dans le bundle.
- **Statut** : ouverte. Tracée 2026-05-20 au commit 2 du plan 13.10 (réconciliation). Aucune auto-extension de l'audit — flag à Adrien comme l'exige la procédure du plan (step 8).
- **Cause-racine** : l'audit D.3 ESTIMAIT la transition 2014→SRD à **~44 renames / ~21 ajouts / ~18 retraits** (heuristique, non vérifiée entrée par entrée). La réconciliation réelle (`scripts/__tests__/spell-audit-reconciliation.test.ts`, intrant = `scripts/maps/spell-renames-2014-to-2024.ts` + snapshot gelé `scripts/data/legacy-spell-ids-2014.ts`) donne **50 renames / 16 ajouts / 7 retraits** (273 inchangés ; partition exhaustive, 0 ID orphelin). La source de vérité est le module SRD (`scripts/data/srd-spells.ts`, dérivé du SRD CC) — l'audit était une estimation.
- **Détail des divergences** (toutes bénignes — aucune ne révèle un bug de parse ; vérifié contre `SRD_CC_v5.2.1.txt`) :
  1. **6 « ajouts » de l'audit sont en réalité des renames** (le sort existait sous l'ancien nom) : `esprit-faible`→`alienation` (Befuddlement), `animation-d-objets`→`animation-des-objets` (Animate Objects), `contrat`→`entrave-planaire` (Planar Binding), `terraformage`→`glissement-de-terrain` (Move Earth), `urne-magique`→`possession` (Magic Jar), `marche-sur-le-vent`→`vent-divin` (Wind Walk).
  2. **L'entrée audit « imprécation | Hex » est erronée deux fois** : `imprecation` (« Imprécation ») = **Bane** (rename de `fleau`), et **Hex** = « Maléfice » était DÉJÀ présent (ID inchangé). Aucun des deux n'était manquant.
  3. **L'entrée audit « vent divin | Divine Word » est erronée** : « Vent divin » = **Wind Walk** (rename de `marche-sur-le-vent`) ; **Divine Word** = « Parole divine » était DÉJÀ présent. Confirmé via `FR_SRD_CC_v5.2.1.txt` (lignes 18205 / 20583).
  4. **2 ajouts que l'audit n'a pas listés** : `elementalisme` (Elementalism) et `eruption-ensorcelee` (Sorcerous Burst) — cantrips nouveaux 2024.
  5. **7 retraits réels** (et non ~18 estimés ; chaque EN vérifié absent du SRD CC) : `amis` (Friends), `armure-d-agathys` (Armor of Agathys), `fouet-epineux` (Thorn Whip), `nuee-de-dagues` (Cloud of Daggers), `protection-contre-les-armes` (Blade Ward), `sens-animal` (Beast Sense), `trait-ensorcele` (Witch Bolt).
- **Critère de complétion** :
  1. `docs/AUDIT-SRD-COMPLETUDE.md > D.3` annoté avec les nombres réconciliés (50/16/7) et le détail ci-dessus, référence au commit (plan 13.10 commit 5, step 23).
  2. Bascule en `## Résolu` avec le hash du commit.

## D17 — `build-public-content.ts` obsolète : à refondre en orchestrateur des extracteurs SRD dédiés

- **Owner** : **mini-plan dédié post-13.10** (la refonte de pipeline est hors périmètre de 13.10 « spells cleanup » — Adrien 2026-05-20, rejet de l'option A pour éviter le scope creep + garder la bisectabilité).
- **Statut** : ouverte. Tracée 2026-05-20 au commit 3 du plan 13.10, après dry-run de `pnpm content:build` sur une copie de `public/data` (puis restaurée).
- **Cause-racine** : `scripts/build-public-content.ts` source chaque type depuis `content-sources/extracted/{srd,aidedd}/*.json` via un `SRD_DIR` **figé daté du 2026-05-16**. Mais les bundles live de `classes/ancestries/feats/invocations/spells/items` sont désormais produits par les extracteurs dédiés `extract-srd-*.ts` (plans 13.7/13.8/13.9/13.10) qui écrivent **directement** dans `public/data` — `build-public-content.ts` ne les connaît pas et ne les orchestre pas. Son `SRD_DIR` est donc stale/superseded pour ~5 types.
- **Conséquence — blast radius mesuré (dry-run 2026-05-20, restauré)** : exécuter `pnpm content:build` dans son état actuel régresse le bundle live :
  | Bundle | Après `content:build` | Live (correct) | Cause |
  |---|---|---|---|
  | `classes.json` | **0** (12 perdus, Zod fail) | 12 | `SRD_DIR` stale, schéma courant non satisfait |
  | `ancestries.json` | **0** (9 perdus, `options` Required) | 9 | `SRD_DIR` stale, enrichissement `options` manquant |
  | `feats.json` | **1** (`lutteur`, AideDD) | 17 | pas de `SRD_DIR/feats.json` ; AideDD seule source |
  | `items.json` | 190 mais contenu changé | 190 | perte probable de l'enrichissement `masteryProperty` |
  | `index.json` | 12 types, sans `invocations` | 13 types | `TYPES` de `build-public-content` omet `invocations` |
- **Interdit en force** : **NE PAS exécuter `pnpm content:build`** tant que D17 n'est pas livré (interdit requalifié dans CLAUDE.md — il survit à la résolution de D9). Le bundle live sur disque est sain ; le mécanisme amont est destructif.
- **Surface impactée** : 5 types de contenu live (`classes`, `ancestries`, `feats`, `invocations`, `items`) + `index.json` + `magic-items`/`monsters` (encore AideDD-sourced, en attente de SRD-sourcing — `magic-items` plan ultérieur, `monsters` plan 13.11+).
- **Critère de complétion (mini-plan dédié)** :
  1. `build-public-content.ts` devient un **orchestrateur** : il appelle (ou délègue à) les `extract-srd-*.ts` pour chaque type SRD-sourced au lieu de relire un `SRD_DIR` figé.
  2. Le merge AideDD est retiré pour tous les types SRD-sourced ; conservé seulement pour `magic-items`/`monsters` tant que ces types ne sont pas SRD-sourced (idéalement jusqu'au plan 13.11).
  3. `index.json` inclut les 13 types (dont `invocations`).
  4. Dry-run prouve idempotence : `pnpm content:build && git diff --quiet public/data` → exit 0.
  5. Interdit `pnpm content:build` levé dans CLAUDE.md ; cette entrée bascule en `## Résolu` avec le hash du commit.
- **Notes liées** :
  - CLAUDE.md > Decision log > « Interdit `pnpm content:build` (REQUALIFIÉ) » — pointe ici.
  - `plans/DEBT.md > D9` — la cause sorts est résolue ; D17 est la nouvelle (et vraie) raison de l'interdit.

## Conventions de ce registre

- Une dette = un bloc avec ID stable (`D1`, `D2`, …).
- `Owner` = plan numéroté qui doit livrer la résolution. Si la dette est sortie de scope, le marquer « décommissionné » et déplacer en bas de fichier.
- Toute mention dans un plan doit dire « voir `plans/DEBT.md > D<n>` » au lieu de redécrire la dette.
- Ne jamais supprimer une entrée résolue — la basculer en section `## Résolu` avec le hash du commit.

## Résolu

- **D2 — Point d'entrée S1 manquant** — résolu par commit `b522775` (`feat(library): library screen + nav shell (plan 13.6)`, 2026-05-16). Route `/` monte désormais une `<LibraryScreen />` réelle (query Firestore + grille de cards + empty state + CTA Créer), `<NavShell />` sticky persistant sur `/`, `/create`, `/character/:id`. Grep `Lyralei` / `letter="L"` / `hp={28}` / `hpMax={32}` à zéro dans le code de prod. Verrou de process « UAT navigateur obligatoire » ajouté à `CLAUDE.md`. Playwright (plan 13.5) à exécuter ensuite pour automatiser ce filet. Détails dans la section D2 ci-dessus.
- **D3 — Wizard de création abandonné + 3 bugs structurels exposés** — résolu par commit `023c451` (`feat(wizard): unified pedagogical character creation (plan 05)`, 2026-05-17). Wizard guidé multi-step pédagogique livré, plan 17 absorbé. Les 3 bugs structurels (`setDoc(undefined)`, mismatch FR/EN spell.classes, classes Tailwind inexistantes) sont structurellement absents par construction (form-kit canonique, IDs EN, ignoreUndefinedProperties). Détails dans la section D3 ci-dessus.
- **D9 — `pnpm content:build` réhydrate `spells.json` depuis AideDD** — **cause sorts résolue** aux commits `ebcb27d` (commit 3 — `fix(content): spells.json strict SRD 5.2.1 bilingue + requalif content:build ban + D17`) et `5fafbc9` (commit 4 — `fix(content): D9 ancestry spell slugs + Ray of Sickness + alias migration`). `public/data/spells.json` régénéré strict SRD 5.2.1 bilingue (339 entrées, 0 `name.en === null`, 100 % `source: srd-5.2.1`) par `scripts/extract-srd-spells.ts` (TS→JSON, ne lit jamais AideDD ni PDF). `normalizeSpellEntity` + le merge AideDD pour `spells` supprimés de `build-public-content.ts` ; `spells` retiré de son `TYPES` (même statut que `invocations`). Compteurs `tests/srd-counters.test.ts > Hardening D` ré-dérivés du nouveau bundle (130/109/124/38/48/72/218 + total 339), rouge-avant-vert prouvé contre l'ancien bundle AideDD. Les 2 slugs fantômes d'ascendance (`rayon-de-maladie`→`rayon-empoisonne`, `feinte-vie`→`simulacre-de-vie`) corrigés + migration runtime des persos (`spell-aliases.ts > migrateSpellIds`) au commit 4. ⚠️ **L'interdit `pnpm content:build` n'est PAS levé** : le critère #5 de D9 est *superseded by D17* — `build-public-content.ts` est globalement obsolète (destructif sur 5 types, dry-run vérifié), interdit requalifié dans CLAUDE.md. Détails section D9 ci-dessus.
- **D7 — Cache Dexie du contenu public sans invalidation cross-build** — initialement résolue par `9559b9b` (mécanisme `contentHash`), **réouverte** 2026-05-17 (post-13.7, 3e occurrence du bug "sorts vides" en UAT) car 2 bugs structurels distincts (SW Workbox SWR sur `index.json` + mémoïsation absorbant les échecs comme succès) faisaient encore manquer le filet. **Re-résolue 2026-05-17** par le commit fix anti-cache-figé (Bug 1 NetworkFirst `index.json` + Bug 2 mémoïsation succès-uniquement + signalFreshnessFailure dev/prod + Hardening A-F). UAT Adrien validée sans wipe IndexedDB ni hard refresh — l'invalidation s'effectue d'elle-même au reload simple. Détails dans la section D7 ci-dessus.

> Note : D8 a été basculé en « ## Résolu » en commit `5df68b4` lors de la livraison initiale du plan 13.5, puis **ré-ouvert** au complément 2026-05-17 quand Adrien a refusé le report intégral en `test.fixme()`. La purge est désormais partielle (3/7), avec owner précis = plan 20.5. Cf. section D8 ci-dessus.
