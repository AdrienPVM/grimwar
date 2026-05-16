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
- **Statut** : ouverte. Sera close au commit `feat(wizard): unified pedagogical character creation (plan 05)`.
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

## Conventions de ce registre

- Une dette = un bloc avec ID stable (`D1`, `D2`, …).
- `Owner` = plan numéroté qui doit livrer la résolution. Si la dette est sortie de scope, le marquer « décommissionné » et déplacer en bas de fichier.
- Toute mention dans un plan doit dire « voir `plans/DEBT.md > D<n>` » au lieu de redécrire la dette.
- Ne jamais supprimer une entrée résolue — la basculer en section `## Résolu` avec le hash du commit.

## Résolu

- **D2 — Point d'entrée S1 manquant** — résolu par commit `b522775` (`feat(library): library screen + nav shell (plan 13.6)`, 2026-05-16). Route `/` monte désormais une `<LibraryScreen />` réelle (query Firestore + grille de cards + empty state + CTA Créer), `<NavShell />` sticky persistant sur `/`, `/create`, `/character/:id`. Grep `Lyralei` / `letter="L"` / `hp={28}` / `hpMax={32}` à zéro dans le code de prod. Verrou de process « UAT navigateur obligatoire » ajouté à `CLAUDE.md`. Playwright (plan 13.5) à exécuter ensuite pour automatiser ce filet. Détails dans la section D2 ci-dessus.
