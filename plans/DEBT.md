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

- **Owner** : nouveau plan à créer, probablement en fin de S1 ou début S2. Adrien fera l'audit détaillé mode par mode avant cadrage.
- **Statut** : ouverte. Détectée lors de l'UAT plan 05 du 16 mai 2026, à l'atterrissage sur la fiche après création de personnage.
- **Cause-racine** : les 5 modes de la fiche (`combat` / `essence` / `magie` / `avoir` / `ame`, plans 06-12) ont été construits **mobile-first** sans pass desktop. À large viewport, le layout mobile s'étire (cards pleine largeur, padding sous-utilisé) au lieu d'exploiter l'espace disponible (2 cols, sticky sidebar, dense par endroit).
- **Conséquence** : la fiche est utilisable mais ergonomiquement sous-optimale sur écran large. Pas bloquant pour le MJ qui joue sur téléphone (cas nominal), gênant pour les usages annexes (préparation de session sur PC).
- **Surface impactée (à confirmer après audit)** :
  - `src/features/sheet/sheet-screen.tsx` — coquille.
  - `src/features/sheet/modes/*-mode.tsx` — chaque mode à reprendre.
  - `src/features/sheet/hero/`, `src/features/sheet/mode-tabs/`, `src/features/sheet/status/` — composants partagés.
- **Hors scope du wizard (plan 05)** : aucune correction de la fiche dans le lot wizard. La dette est seulement **tracée** ici pour que la mémoire de projet la garde.
- **Critère de complétion** :
  1. Audit mode-par-mode par Adrien (PC + grand écran).
  2. Plan dédié créé et numéroté.
  3. Chaque mode revu avec breakpoints `md:` + `lg:` (et `xl:` quand pertinent).
  4. UAT navigateur 1024 + 1440 + 1920 px validée par Adrien.
  5. Cette entrée bascule en `## Résolu` avec le hash du commit final.

## D7 — Cache Dexie du contenu public sans invalidation cross-build

- **Owner** : ce document + commit qui ajoute `contentHash` à `index.json` et l'invalidation côté loader.
- **Statut** : **résolue de mécanisme** en commit `9559b9b` (`fix(content): dexie cache invalidation by contentHash`). Reste ouverte en vigilance jusqu'à au moins une session UAT post-déploiement qui confirme l'auto-flush en condition réelle.
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
  3. UAT navigateur Adrien : Magicien niveau 1 voit ses cantrips, Occultiste niveau 1 idem.
  4. Une session UAT post-déploiement confirme l'auto-flush sur build régénéré.

## D8 — Suite e2e Playwright S1 livrée, dette détaillée S1 différée en placeholders

- **Owner** : ce document + commit qui ajoute la suite Playwright (plan 13.5).
- **Statut** : **résolue de filet** — les **filets golden-path** sont en place (smoke central + modal invariant + création rapide wizard). La dette plus profonde par feature (combat / essence / magie / avoir / dice digital + physique) est tracée mais différée — explicitement requalifiée par Adrien (« ne sur-dimensionne pas 13.5, son but est le FILET, pas une suite exhaustive »).
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
- **Java/JRE requis** : OUI pour la majorité de la suite — l'émulateur Firebase tourne sur JVM. Sans Java :
  - `wizard-modal.spec.ts` → **tourne** (UI-only, lit `public/data/*.json`, ne fait pas d'écriture Firestore).
  - `smoke.spec.ts`, `wizard.spec.ts` → **skip propre** avec message visible (« Firestore emulator unreachable on 127.0.0.1:8080 »). Pas de faux-vert.
  - `deferred-debt.spec.ts` → TODO, n'échoue pas, n'a pas besoin de Java.
- **Reste ouvert (différé)** :
  - 6 areas e2e détaillées (`combat`, `essence`, `magie`, `avoir`, `dice-digital`, `dice-physical`) — tracées en `test.fixme()` dans `deferred-debt.spec.ts`. Ces tests unitaires des mêmes mécaniques (`hp-combat.test.ts`, `roll-with-flags.test.ts`, `spell-slots.test.ts`, `inventory-rules.test.ts`, `use-dice-physical.test.ts`, etc.) couvrent la logique pure. L'e2e validerait le câblage UI + Firestore complet — sera ajouté soit dans un plan e2e dédié S5 (quand CI atterrit, plan 40), soit feature-par-feature quand chacune est retouchée.
  - CI GH Actions pour automatiser les e2e à chaque PR : plan 40 (production deploy + perf).
  - Visual regression / snapshots : non inclus en S1 (Percy/Argos en option S5).
- **Critère de fermeture** :
  1. Suite Playwright livrée et fonctionnelle. ✅
  2. Smoke central vert + sanity-check step 9 vérifié manuellement. ✅ (à confirmer à la livraison)
  3. Modal invariant vert même sans émulateur. ✅
  4. Tous les items différés tracés en `test.fixme()` (ne se perdent pas silencieusement). ✅
  5. Cette entrée bascule en `## Résolu` avec le hash du commit `feat(e2e): playwright smoke + S1 deferred tests (plan 13.5)`. ⏳

## Conventions de ce registre

- Une dette = un bloc avec ID stable (`D1`, `D2`, …).
- `Owner` = plan numéroté qui doit livrer la résolution. Si la dette est sortie de scope, le marquer « décommissionné » et déplacer en bas de fichier.
- Toute mention dans un plan doit dire « voir `plans/DEBT.md > D<n>` » au lieu de redécrire la dette.
- Ne jamais supprimer une entrée résolue — la basculer en section `## Résolu` avec le hash du commit.

## Résolu

- **D2 — Point d'entrée S1 manquant** — résolu par commit `b522775` (`feat(library): library screen + nav shell (plan 13.6)`, 2026-05-16). Route `/` monte désormais une `<LibraryScreen />` réelle (query Firestore + grille de cards + empty state + CTA Créer), `<NavShell />` sticky persistant sur `/`, `/create`, `/character/:id`. Grep `Lyralei` / `letter="L"` / `hp={28}` / `hpMax={32}` à zéro dans le code de prod. Verrou de process « UAT navigateur obligatoire » ajouté à `CLAUDE.md`. Playwright (plan 13.5) à exécuter ensuite pour automatiser ce filet. Détails dans la section D2 ci-dessus.
- **D3 — Wizard de création abandonné + 3 bugs structurels exposés** — résolu par commit `023c451` (`feat(wizard): unified pedagogical character creation (plan 05)`, 2026-05-17). Wizard guidé multi-step pédagogique livré, plan 17 absorbé. Les 3 bugs structurels (`setDoc(undefined)`, mismatch FR/EN spell.classes, classes Tailwind inexistantes) sont structurellement absents par construction (form-kit canonique, IDs EN, ignoreUndefinedProperties). Détails dans la section D3 ci-dessus.
- **D7 — Cache Dexie du contenu public sans invalidation cross-build** — résolu (mécanisme) par commit `9559b9b` (`fix(content): dexie cache invalidation by contentHash`, 2026-05-17). `index.json` porte un `contentHash` sha-256, le loader purge le cache Dexie quand le hash change ; offline-safe, mémoïsé par session. Vigilance UAT post-déploiement encore due. Détails dans la section D7 ci-dessus.
