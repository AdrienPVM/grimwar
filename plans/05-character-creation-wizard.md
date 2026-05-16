# Plan 05 — Wizard de création de personnage (unique, pédagogique, multi-step)

## Goal

Un seul parcours de création de PJ pour GrimWar : un wizard multi-step, responsive, **pédagogique pour un débutant total** (qui n'a jamais joué à D&D), qui produit un document Firestore valide pour n'importe quelle combinaison classe / ascendance / historique du SRD 5.2.1, multi-class compris. Ce plan **remplace intégralement** l'ancien plan 05 (`manual-character-screen.tsx`) et **fusionne** le plan 17 (wizard guidé S2). Plus de formulaire monopage, plus de doublon.

## Contexte (décision et bugs déclencheurs)

L'ancien formulaire monopage a été UAT par Adrien en navigateur réel le 2026-05-16. **3 bugs et 1 défaut de conception** ont été constatés :

1. **BLOQUANT — `setDoc(undefined)`** : Firestore refuse les champs `undefined`. La création crash sur n'importe quel perso parce qu'un champ optionnel non rempli part en `undefined` au lieu d'être omis. Diagnostic au §0 ci-dessous.
2. **BUG — Sorts non listés pour un lanceur** : IDs de classes en EN dans `public/data/classes.json`, IDs de classes en FR dans `public/data/spells.json`. Le filtre `s.classes.includes('wizard')` matche `['magicien']` → 0 résultat. Diagnostic au §0.
3. **BUG — Texte blanc sur fond blanc** : classes Tailwind `text-text-primary` / `bg-bg-deep` **inexistantes** dans `tailwind.config.ts`. Les inputs héritent du UA défaut → illisibles. Diagnostic au §0.
4. **CONCEPTION — Pas pédagogique** : formulaire desktop étiré au centre, zéro explication, jargon partout. Un débutant ne sait pas ce que « Point Buy » veut dire ni ce que fait un Magicien.

**Décision actée par Adrien (2026-05-16)** : un seul parcours, wizard guidé multi-step. Le plan 17 disparaît en tant que plan séparé. L'ancien `manual-character-screen.tsx` est jeté entier — patcher du code qu'on jette = gaspillage.

## Contexte technique à relire avant de coder

- `docs/DATA-MODEL.md` (CharacterSchema, multi-class, status)
- `docs/I18N.md` (forme des clés, FR par défaut)
- `docs/DESIGN-SYSTEM.md` (tokens couleurs, motifs)
- `prototype/grimwar.html` (aesthetic illuminated-manuscript)
- `plans/DEBT.md > D3` (cause-racine de cet abandon)
- `plans/DEBT.md > D4` (dette `featAtLevel1` portée par le plan 14)
- `src/shared/lib/firebase.ts`, `src/shared/lib/inventory.ts` (cibles des fixes infra)
- `tailwind.config.ts` (palette `text` et `bg` actuelles)
- `public/data/classes.json` + `public/data/spells.json` (mismatch FR/EN à corriger)

## Prerequisites

- Plans 01-04 + 06-10 + 12 + 12.5 + 13.6 complets.
- Triple gate verte au démarrage : `pnpm typecheck && pnpm test && pnpm lint`.
- L'app se rend sur `/` (LibraryScreen + NavShell, plan 13.6 commit `b522775`).

---

## §0 Diagnostic + fixes infra (préalable au wizard)

> **Commit séparé** : `fix(firestore): ignoreUndefinedProperties + addItem omits undefined contentSource`. Rollback isolable. Triple gate verte avant de toucher au wizard.

### 0.1 Bug `setDoc(undefined)` — cause-racine + fix

- **Cause** : `src/shared/lib/inventory.ts > addItemToInventory` écrit `contentSource: scopeId` ; pour `scope = 'public'` (cas du wizard 100 % du temps), `scopeId` vaut `undefined`. Le champ part en `undefined` jusqu'au `setDoc`.
- **Pourquoi Zod ne l'a pas attrapé** : `inventoryItemSchema.contentSource: z.string().optional()` accepte `undefined` (Zod ne distingue pas « absent » de « undefined »).
- **Pourquoi Firestore rejette** : `getFirestore()` initialise en mode strict, `undefined` interdit.

**Fixes (à la source)** :

- [ ] 0.1.a `inventory.ts > addItemToInventory` : ne pose la clé `contentSource` dans l'objet **que si `scopeId` est défini**. Omission, pas `undefined`. Idem pour tout autre champ optionnel construit dans la même fonction (auditer).
- [ ] 0.1.b `firebase.ts > getDb` : remplacer `getFirestore(app)` par `initializeFirestore(app, { ignoreUndefinedProperties: true })`. Belt-and-braces — protège tout futur `setDoc` contre la même classe de bug.
- [ ] 0.1.c Test unit `src/shared/lib/__tests__/inventory.test.ts` : `addItemToInventory(scope='public', scopeId=undefined)` produit un item où la clé `contentSource` est **absente** (`'contentSource' in item === false`), pas `item.contentSource === undefined`.

### 0.2 Bug sorts non listés — cause-racine + fix

- **Cause** : `public/data/classes.json` a des IDs **EN** (`wizard`, `sorcerer`, `cleric`, `druid`, `bard`, `warlock`, `ranger`, `fighter`, `barbarian`, `monk`, `rogue`, `paladin`). `public/data/spells.json` a `spell.classes[]` en **FR** (`magicien`, `ensorceleur`, `clerc`, `druide`, `barde`, `occultiste`, `rodeur`, `paladin`). Seul `paladin` matche par accident.
- **Pourquoi** : le pipeline AideDD écrit du FR dans un champ qui doit être en EN canonique (cf. CLAUDE.md décision lockée « PDFs source of truth #1 — EN canonique »).

**Fixes (à la source)** :

- [ ] 0.2.a `scripts/build-public-content.ts` (et `scripts/parse-aidedd.ts` si c'est là que le champ est posé) : ajouter une map `CLASS_ID_FR_TO_EN` et la passer sur `spell.classes[]` au build. Mapping : `magicien→wizard`, `ensorceleur→sorcerer`, `clerc→cleric`, `druide→druid`, `barde→bard`, `occultiste→warlock`, `rodeur→ranger`, `paladin→paladin`, `barbare→barbarian`, `moine→monk`, `roublard→rogue`, `guerrier→fighter`.
- [ ] 0.2.b Re-générer `public/data/spells.json`. Confirmer la commande exacte au moment de la step (probablement `pnpm tsx scripts/build-public-content.ts` ou équivalent).
- [ ] 0.2.c **Test invariant cross-bundle, intégré à la triple gate** : `scripts/build-public-content.ts` génère le bundle, et un test Vitest dédié (`src/shared/lib/__tests__/content-integrity.test.ts`) charge `classes.json` + `spells.json` et assert que pour chaque sort, `spell.classes[*]` ∈ `classes.json[*].id`. **Throw au build n'est pas suffisant — c'est un test Vitest qui tourne en CI**. Un futur re-build qui casse le mapping doit faire échouer `pnpm test`, pas juste un build manuel.

### 0.3 Bug texte blanc/blanc — cause-racine + fix

- **Cause** : `manual-character-screen.tsx` utilise massivement `text-text-primary` et `bg-bg-deep/40`. Dans `tailwind.config.ts` la palette `text` n'a pas de clé `primary` (elle a `DEFAULT, secondary, tertiary, faint`) et la palette `bg` n'a pas de clé `deep` (elle a `DEFAULT, 2, 3, elev`). → Classes Tailwind **inexistantes** → aucune règle CSS générée → l'`<input>` hérite des défauts UA, illisible sur fond glass sombre.
- **Fix** : (a) l'ancien fichier est supprimé donc les 17 occurrences disparaissent ; (b) le nouveau wizard utilise EXCLUSIVEMENT les tokens existants `text-text` (DEFAULT `#f4ecd6`) et `bg-bg-3/40` (`#181122`) ; (c) **plus aucun `<input>` natif dans `features/wizard/`** — tout passe par les composants partagés (§A.4).

**Garantie de non-réapparition** :

- [ ] 0.3.a Composants form partagés livrés dans `src/shared/components/form/` (§A.4) — c'est le seul portail.
- [ ] 0.3.b Audit grep post-livraison du wizard : `text-text-primary|bg-bg-deep` dans `src/` (hors `__tests__/`) = **zéro**.
- [ ] 0.3.c Audit grep post-livraison : `<input |<select |<textarea ` dans `src/features/wizard/` = **zéro**.
- [ ] 0.3.d Au passage, `src/features/debug/debug-content.tsx` est nettoyé des classes mortes s'il en contient.

### 0.4 Triple gate + commit infra

- [ ] 0.4.a `pnpm typecheck && pnpm test && pnpm lint` verts.
- [ ] 0.4.b Commit : `fix(firestore): ignoreUndefinedProperties + addItem omits undefined contentSource`.

---

## §A Audit FR/EN cross-bundle élargi (gate intermédiaire)

> Demande explicite Adrien : éradiquer cette classe de bug **partout**, pas juste sur spells↔classes.

- [ ] A.1 Script d'audit one-shot (peut vivre dans `scripts/audit-content-refs.ts` ou rester inline dans le test) qui croise toutes les références cross-bundle de `public/data/*.json`. À auditer au minimum :
  - `spell.classes[*]` → `classes.json[*].id` (déjà couvert en 0.2.c)
  - `feat.classes[*]` / `feat.prerequisite.class` (si présent) → `classes.json[*].id`
  - `subclass.classId` → `classes.json[*].id`
  - `magicItem.classes[*]` (si présent, items à attunement classe) → `classes.json[*].id`
  - `subancestry.ancestryId` → `ancestries.json[*].id`
  - `background.feat` → `feats.json[*].id`
  - `class.startingEquipment[*].itemId` + `background.equipment[*].itemId` → `items.json[*].id`
  - `class.spellcasting.cantripIds[*]` (si présent) → `spells.json[*].id`
- [ ] A.2 **STOP gate** : si l'audit révèle **au moins un autre mismatch** au-delà de spells↔classes, **listez-le à Adrien et arrêtez**. Pas de fix en masse sans son OK. Si l'audit est propre (zéro autre mismatch), continuer.
- [ ] A.3 Le test `content-integrity.test.ts` (§0.2.c) est élargi pour couvrir TOUTES les relations cross-bundle listées en A.1, pas juste spells↔classes. Une régression future sur n'importe quelle référence fait échouer la triple gate.

---

## §B Composants de formulaire partagés (accessibles dès la livraison)

> Demande explicite Adrien (ajustement B) : ces composants vont servir TOUTE l'app. A11y non négociable dès maintenant. Pas de reprise en S5.

Création de `src/shared/components/form/` :

- [ ] B.1 `<FormField />` — wrapper label + input slot + helper text + error. `htmlFor` lié à `id` de l'input (utilise `useId` React). Aria : `aria-describedby` sur l'erreur (id généré), `aria-invalid` quand error présent. Touch target ≥ 44px (hauteur min).
- [ ] B.2 `<TextInput />` — `<input type="text">` avec tokens `text-text bg-bg-3/40 border-soft focus:border-glow focus-visible:ring-2 ring-gold-bright/40`. Min height 44px. Pas de `outline-none` nu : focus-visible stylé visible au clavier.
- [ ] B.3 `<NumberInput />` — `<input type="number">` avec stepper accessibles (boutons +/− cliquables ET clavier flèches), `aria-valuemin/max/now`. Min height 44px par bouton.
- [ ] B.4 `<Select />` — `<select>` natif (pas de combobox custom — déléguer à la plateforme l'a11y mobile native). Tokens corrects. Min height 44px.
- [ ] B.5 `<Checkbox />` — `<input type="checkbox">` invisible + label cliquable (touch target ≥ 44px). État stylé via `peer-checked:` Tailwind. `aria-describedby` si helper.
- [ ] B.6 `<RadioGroup />` — fieldset + legend (caché visuellement mais lu par AT) + radios. Navigation flèches haut/bas/gauche/droite native. Min height 44px par option.
- [ ] B.7 Tests RTL pour chacun (`src/shared/components/__tests__/form.test.tsx`) :
  - Computed style `color` non vide et non transparent.
  - `htmlFor`/`id` correctement liés (un click sur le label focus l'input).
  - `aria-invalid` passe à `'true'` quand `error` prop fournie.
  - Touch target hauteur ≥ 44px (assert sur `getBoundingClientRect`).
  - Focus-visible visible au clavier (assert `box-shadow` ou `outline` non vide après `Tab`).
- [ ] B.8 **Aucun `<input>` natif n'est utilisé hors de `src/shared/components/form/`**. C'est la barrière structurelle qui empêche le retour du bug #3.

---

## §C Wizard — coquille + état (mobile + desktop)

### C.1 Ordre des étapes (final, validé Adrien)

1. **Identité** — nom, niveau (1-20), alignement
2. **Classe** — classe principale + (si niveau ≥ 2) bouton « Ajouter une autre classe » (multi-class)
3. **Ascendance** — peuple + sous-peuple
4. **Caractéristiques** — Standard Array (défaut) / Point Buy / Manuel
5. **Historique** — background
6. **Compétences** — sélection des skills supplémentaires de classe
7. **Équipement** — choix de starting equipment de classe + grants du background
8. **Sorts** (conditionnel — visible si **au moins une** des classes choisies est lanceuse)
9. **Récapitulatif** — fiche lisible débutant (cf. §F)

> Sous-classe : **skip à la création** (cohérent SRD 2024 — la plupart des classes choisissent leur subclass au niveau 3, géré par le plan 18 level-up). Validé Adrien.
> Don au niveau 1 (`featAtLevel1`) : **hors scope** S1 du wizard. Dette tracée en `plans/DEBT.md > D4`, owner = plan 14. Le wizard de création devra à terme lire `activeCampaign.settings.variants.featAtLevel1` et insérer une étape Don conditionnelle. Validé Adrien.

### C.2 Layout responsive

**Mobile (< 768px)** :

- [ ] C.2.a 1 étape par écran, plein viewport.
- [ ] C.2.b Top : barre de progression horizontale (9 segments), segment courant éclairé en `gold-bright`. Segments passés cliquables (retour à l'étape).
- [ ] C.2.c Bottom bar fixe : `← Précédent` | indicateur `3/9` | `Suivant →` (disabled tant que l'étape n'est pas valide, avec `aria-disabled` + tooltip explicatif).
- [ ] C.2.d Touch targets ≥ 44px sur toute la bottom bar et la barre de progression.

**Desktop (≥ 768px)** :

- [ ] C.2.e Layout deux colonnes dans le `GlassPanel`, `max-w-6xl` :
  - Colonne gauche (~40%) : navigation verticale (sommaire « 1. Identité ✓ », « 2. Classe ← courant », …). Réutilise le motif de `mode-tabs` (cf. fiche).
  - Colonne droite (~60%) : contenu de l'étape, qui peut elle-même contenir une sous-grille (choix à gauche, panneau pédagogique à droite — cf. §D).
- [ ] C.2.f Pas de bottom bar fixe : `← Précédent` / `Suivant →` ancrés en bas du contenu droit.
- [ ] C.2.g Aurora + flourishes du prototype préservés. Vérification visuelle vs `prototype/grimwar.html` à chaque étape.

### C.3 État + persistence

- [ ] C.3.a Slice Zustand `src/shared/lib/slices/wizard-slice.ts` étendue (ou réécrite si l'ancienne `useWizardStore` est trop liée au manual form) : `currentStep: number`, `visitedSteps: Set<number>`, `draft: Partial<Character>` avec typage strict (zéro `unknown`, zéro `any`).
- [ ] C.3.b Persistence `localStorage` via middleware `persist` (réutilise l'existant), **clé bumpée** (ex. `grimwar-wizard-draft-v2`) pour invalider l'ancien draft du formulaire monopage. Reset après submit réussi.
- [ ] C.3.c **Validation per-step via Zod** : chaque étape a un schéma partiel, et `Suivant` est disabled tant qu'il ne valide pas. Messages d'erreur inline, sous le champ concerné, avec `aria-describedby`.

---

## §D Pédagogie — exigence non négociable

> Demande explicite Adrien : un débutant total doit comprendre chaque décision.

### D.1 Structure du contenu pédagogique par étape

Pour chaque étape de choix structurant (Classe, Ascendance, Caractéristiques, Historique, Compétences, Sorts), trois surfaces de contenu :

1. **Bandeau d'intro** en haut de l'étape : 1-2 phrases qui expliquent CE QUE L'ÉTAPE FAIT, en langage débutant, zéro jargon. Ex. Classe : « Ta classe, c'est ton métier d'aventurier. Elle définit ce que tu sais faire (taper fort, lancer des sorts, soigner, etc.) et comment tu progresses au fil du jeu. »
2. **Carte de description live** : quand on hover (desktop) / tap (mobile) une option, un panneau adjacent (desktop = colonne droite, mobile = card expandable sous la liste) affiche :
   - Le nom + un **slogan court** (ex. Magicien : « Le savant qui plie la réalité par l'étude »)
   - Paragraphe **« À choisir si tu veux… »** (« étudier la magie pour la maîtriser, avec un grand arsenal de sorts variés »)
   - Liste **« Tu vas faire ça en jeu »** : 3 bullets concrets (« lancer des sorts puissants », « préparer ta liste chaque matin », « être plus fragile en mêlée — reste derrière »)
   - **« Difficulté pour débuter »** : 🟢 facile / 🟡 moyenne / 🔴 expert
3. **Tooltips** sur les termes techniques (mod, point-buy, slot, cantrip, ASI, prerequisite, attunement…) : tap/hover → définition courte. Composant partagé `<TermTooltip term="cantrip" />`.

### D.2 Recommandation par défaut + « Choisir pour moi »

- [ ] D.2.a Sur les choix mécaniquement délicats (caractéristiques, sorts), une option **pré-suggérée** avec étoile dorée. Ex. Magicien : INT 15, CON 14, DEX 13.
- [ ] D.2.b Bouton **« Choisir pour moi »** sur chaque étape facultative (caractéristiques, compétences, équipement, sorts).
  - **Validé Adrien** : c'est une **build de référence cohérente par classe**, pas un tirage random. Un Magicien « choisi pour moi » a INT en stat haute, des cantrips utiles (Trait de feu / Prestidigitation / Lumière), des sorts de niveau 1 utiles (Bouclier / Projectile magique), un équipement de classe cohérent (bâton + grimoire).
  - Les builds de référence vivent dans `src/features/wizard/reference-builds/<classId>.ts` (12 fichiers, un par classe), typés strict. Un test unitaire pour chaque build : produit un perso valide vs `CharacterSchema` après merge avec les choix utilisateur des étapes amont.

### D.3 Contenu i18n — clés + relecture Adrien

- [ ] D.3.a Toutes les strings via `t(key)` dans `src/shared/lib/i18n.ts`. FR seul S1, EN ajouté en plan 34.
- [ ] D.3.b Racine de clés : `wizard.help.*` :
  - `wizard.help.class.<classId>.tagline` (slogan court)
  - `wizard.help.class.<classId>.whyChoose` (paragraphe « À choisir si tu veux… »)
  - `wizard.help.class.<classId>.inGame` (3 bullets)
  - `wizard.help.class.<classId>.difficulty` (`'easy' | 'medium' | 'expert'`)
  - Idem pour `wizard.help.ancestry.<ancestryId>.*`, `wizard.help.background.<backgroundId>.*`
  - `wizard.help.abilities.method.<method>.intro` (Standard Array / Point Buy / Manuel)
  - `wizard.help.skills.intro`, `wizard.help.equipment.intro`, `wizard.help.spells.intro`
  - `wizard.help.terms.<term>` pour les tooltips
- [ ] D.3.c Volume estimé : ~150 clés (12 classes × 4 + 8 ascendances × 4 + 13 backgrounds × 4 + ~20 termes + ~6 intros). Volume réel à confirmer à l'exécution selon le contenu réel de `public/data/`.
- [ ] D.3.d **STOP gate — relecture Adrien obligatoire** : quand le contenu pédagogique est rédigé (au minimum les 12 classes + 8 ascendances), Claude **rassemble tout le contenu rédigé dans un seul message à Adrien et s'arrête**. Adrien relit pour exactitude des règles D&D et clarté débutant. Aucun commit du wizard avant le OK explicite d'Adrien sur le contenu pédago.

---

## §E Étapes du wizard — détail

### E.1 Étape 1 — Identité

- [ ] E.1.a Composant `src/features/wizard/steps/identity-step.tsx` : nom (`<TextInput />`), niveau (`<NumberInput />` 1-20), alignement (`<Select />` 9 options).
- [ ] E.1.b Validation : nom non vide (≥ 1 char), niveau dans [1, 20].
- [ ] E.1.c Bandeau d'intro pédago (clé `wizard.help.identity.intro`).

### E.2 Étape 2 — Classe (+ multi-class conditionnel)

- [ ] E.2.a `src/features/wizard/steps/class-step.tsx` : liste des 12 classes en cards (avec art, nom, slogan). Tap/click → sélection. Panneau pédagogique adjacent (cf. §D).
- [ ] E.2.b Si niveau ≥ 2 : bouton **« Ajouter une autre classe »** sous la classe sélectionnée. Permet d'ajouter une 2e entrée `{ classId, level }` avec contrainte `sum(levels) === totalLevel`.
- [ ] E.2.c Prerequisites multi-class enforced (5e SRD : ex. min 13 STR pour Fighter multi-class). Affichage clair de pourquoi un choix est bloqué. Helper dans `src/shared/lib/rules/multiclass.ts`.
- [ ] E.2.d Validation : `classes.length ≥ 1`, `sum(level) === totalLevel`, prerequisites respectés.
- [ ] E.2.e Sous-classe : **non demandée à la création** (cf. C.1).

### E.3 Étape 3 — Ascendance

- [ ] E.3.a `src/features/wizard/steps/ancestry-step.tsx` : liste des ascendances en cards. Sous-ascendance si applicable (ex. Elfe → Haut elfe / Elfe des bois / Drow).
- [ ] E.3.b Applique speed + size + traits de l'ascendance au draft. Affichage live.
- [ ] E.3.c Validation : ascendance choisie, sous-ascendance si requise.

### E.4 Étape 4 — Caractéristiques

- [ ] E.4.a `src/features/wizard/steps/abilities-step.tsx` : toggle méthode (Standard Array / Point Buy / Manuel).
- [ ] E.4.b Standard Array : 6 valeurs `[15, 14, 13, 12, 10, 8]` à distribuer aux 6 caractéristiques via drag ou tap/select.
- [ ] E.4.c Point Buy : 27 points, cost table `[8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9]`. Helper dans `src/shared/lib/rules/abilities.ts`.
- [ ] E.4.d Manuel : 6 `<NumberInput />` 3-20, pas de validation arithmétique (mode « confiance MJ »).
- [ ] E.4.e Affichage live des modifiers et des totaux post-ascendance.
- [ ] E.4.f Recommandation visuelle (étoile dorée) sur la stat principale de la classe choisie.
- [ ] E.4.g Bouton « Choisir pour moi » (build de référence — cf. D.2.b).
- [ ] E.4.h Validation : 6 stats dans [1, 20] (post-ASI).

### E.5 Étape 5 — Historique

- [ ] E.5.a `src/features/wizard/steps/background-step.tsx` : liste des backgrounds en cards. Panneau pédagogique adjacent.
- [ ] E.5.b Affiche les grants (skills, languages, equipment, feat 5e 2024).
- [ ] E.5.c Édition personnalité (trait/ideal/bond/flaw) : pick parmi les suggestions du background **ou** custom via `<TextInput />`.
- [ ] E.5.d Validation : background choisi.

### E.6 Étape 6 — Compétences

- [ ] E.6.a `src/features/wizard/steps/skills-step.tsx` : tous les skills affichés, **pré-cochés** ceux de classe + background (read-only). Le joueur pick N supplémentaires depuis la liste autorisée par sa classe (`class.skillChoices.from`, `class.skillChoices.choose`).
- [ ] E.6.b Skills canonicalisés en clés stables (pas de FR brut). Map `SKILLS_FR_TO_KEY` étendue à toutes les compétences SRD (audit complet à l'exécution).
- [ ] E.6.c Bouton « Choisir pour moi » (build de référence).
- [ ] E.6.d Validation : exactement N skills choisis parmi la liste autorisée.

### E.7 Étape 7 — Équipement

- [ ] E.7.a `src/features/wizard/steps/equipment-step.tsx` : choix de starting equipment de la classe (groupes de choix « a) Cotte de mailles OU b) Cuir + arc »).
- [ ] E.7.b Grants automatiques du background.
- [ ] E.7.c Chaque item pické passe par `addItemToInventory` (strict, public scope — fix §0.1 garantit no-undefined).
- [ ] E.7.d Coins de départ depuis background ou classe (5e variant — SRD 2024 utilise « starting wealth alternatif »).
- [ ] E.7.e Bouton « Choisir pour moi » (build de référence).
- [ ] E.7.f Validation : tous les groupes de choix résolus.

### E.8 Étape 8 — Sorts (conditionnel)

- [ ] E.8.a `src/features/wizard/steps/spells-step.tsx` : visible uniquement si `classes.some(c => contentClasses.find(cc => cc.id === c.classId)?.spellcasting !== null)`.
- [ ] E.8.b Pour **chaque classe lanceuse** dans `classes[]` : section dédiée avec cantrips disponibles + sorts de niveau 1.
- [ ] E.8.c Filtre depuis `public/data/spells.json` : `spells.filter(s => s.classes.includes(classId))` — désormais correct grâce au fix §0.2.
- [ ] E.8.d Pick N cantrips + N sorts connus/préparés selon la classe.
- [ ] E.8.e **Schéma multi-class respecté** : `knownSpells` et `preparedSpells` keyés par `classId` (ex. `{ wizard: ['fireball', 'shield'], cleric: ['cure-wounds'] }`).
- [ ] E.8.f Panneau pédagogique : « Cantrip » et « Sort préparé » expliqués, exemples concrets.
- [ ] E.8.g Bouton « Choisir pour moi » (build de référence).
- [ ] E.8.h Validation : exactement N cantrips + N sorts choisis par classe lanceuse.

### E.9 Étape 9 — Récapitulatif

> Demande explicite Adrien (ajustement D) : preview **lisible débutant**, pas un dump technique.

- [ ] E.9.a `src/features/wizard/steps/recap-step.tsx` : preview de la fiche au format **prose lisible**.
- [ ] E.9.b Exemples de formulations :
  - Au lieu de `spellSlots.1: 3` → « Tu pourras lancer 3 sorts de niveau 1 par jour. »
  - Au lieu de `ac: 13` → « Ta défense (Classe d'armure) est de 13 — c'est ce que les attaquants doivent dépasser pour te toucher. »
  - Au lieu de `hp.max: 8` → « Tu commences avec 8 points de vie. »
  - Au lieu de `proficiency: 2` → « Ton bonus de maîtrise est de +2 (tu l'ajoutes à tes jets quand tu es entraîné·e). »
  - Au lieu de `inventory: [{...}, {...}]` → « Tu portes : un grimoire, un bâton, une dague, une bourse de 10 pièces d'or, … »
- [ ] E.9.c Chaque bloc a un bouton « Modifier » discret qui jump-back à l'étape concernée.
- [ ] E.9.d Bouton final **« Créer le personnage »** ancré bas (sticky mobile, ancré bas-droite desktop). Disabled tant que la validation Zod complète ne passe pas.
- [ ] E.9.e **Validation Zod complète** via `CharacterSchema` AVANT `setDoc`. Si invalide, toast d'erreur avec le détail du champ fautif. Avec le fix §0.1, un Magicien (et tous les autres archétypes) doit passer.

---

## §F Submit + persistance Firestore

- [ ] F.1 `src/features/wizard/submit-character.ts` réécrit (ou nouveau fichier `submit-from-wizard.ts` si l'ancien est trop lié au manual form) :
  - Validation Zod via `CharacterSchema` — throw si invalide (mais l'UI doit avoir empêché d'arriver là).
  - Génère ID (slug du nom + suffix random 6 chars).
  - Write `users/{uid}/characters/{charId}` avec `schemaVersion: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: uid, status: 'alive'`.
  - On success : reset draft Zustand, navigate to `/character/${charId}`.
  - On failure : toast avec le message Zod.
- [ ] F.2 Avec le fix §0.1 (`ignoreUndefinedProperties: true` + `addItemToInventory` qui omet la clé), aucun champ undefined ne peut atteindre `setDoc`.

---

## §G Tests

- [ ] G.1 Unit tests :
  - `abilities.test.ts` : Point Buy cost table + Standard Array reachability (existant, valider après refacto).
  - `multiclass.test.ts` : prerequisites + multi-class spell slots formula (existant, valider).
  - `inventory.test.ts` : `addItemToInventory(scope='public')` n'écrit pas `contentSource` (§0.1.c).
  - `content-integrity.test.ts` : tous les cross-bundle refs sont valides (§0.2.c + §A.3).
  - `reference-builds.test.ts` : chaque build de référence produit un perso valide vs `CharacterSchema` après le wizard.
- [ ] G.2 Component tests RTL pour les composants form (§B.7).
- [ ] G.3 Component tests RTL pour chaque step (validation, navigation, "Choisir pour moi").
- [ ] G.4 e2e Playwright (à câbler quand plan 13.5 est livré — si 13.5 vient APRÈS 05, ajouter dans plan 13.5 deux scenarios `magicien.spec.ts` + `barbare.spec.ts`).

---

## §H Roadmap — mises à jour de docs (commit doc-only, avant tout code)

- [x] H.1 Ce fichier (`plans/05-character-creation-wizard.md`) écrit en remplacement de `plans/05-manual-character.md`.
- [x] H.2 `plans/05-manual-character.md` supprimé.
- [x] H.3 `plans/17-wizard-creation.md` réduit à un stub de redirection vers le plan 05.
- [x] H.4 `plans/00-overview.md` mis à jour : ligne 05 renommée, ligne 17 marquée « ABANDONNÉ », total 43 → 42, swap consigné dans `## Swaps actés`.
- [x] H.5 `docs/ROADMAP.md` mis à jour : 43 → 42 plans, ligne 17 retirée du tableau S2.
- [x] H.6 `plans/DEBT.md` : entrée D3 ouverte (wizard abandonné + 3 bugs structurels), entrée D4 ouverte (`featAtLevel1` portée par plan 14).

---

## Definition of Done

- [ ] Toutes les étapes §0 à §G cochées.
- [ ] **Triple gate verte** : `pnpm typecheck && pnpm test && pnpm lint`.
- [ ] **STOP §A.2** respecté : si l'audit FR/EN élargi a révélé d'autres mismatches, Adrien a OK les fixes en masse avant qu'ils soient appliqués.
- [ ] **STOP §D.3.d** respecté : Adrien a relu et OK le contenu pédagogique avant le commit du wizard.
- [ ] **Deux commits séparés** :
  1. `fix(firestore): ignoreUndefinedProperties + addItem omits undefined contentSource`
  2. `feat(wizard): unified pedagogical character creation (plan 05)`
- [ ] **Audit grep post-livraison** :
  - `text-text-primary|bg-bg-deep` dans `src/` (hors `__tests__/`) = **zéro**.
  - `<input |<select |<textarea ` dans `src/features/wizard/` = **zéro**.
  - `Lyralei|letter="L"|hp={28}|hpMax={32}` dans `src/` (hors `__tests__/`) = **zéro** (déjà acquis depuis 13.6, juste vérifier qu'on ne réintroduit pas).
- [ ] **UAT navigateur Adrien (obligatoire, pas optionnel)** sur **375 + 414 + 1024 + 1440px** :
  - Création complète d'un **Magicien** de bout en bout : 9 étapes → fiche créée → atterrissage sur `/character/{id}` fonctionnel → sorts listés et sélectionnables → setDoc OK → **aucune erreur console / network** → **aucun champ blanc-sur-blanc**.
  - Création complète d'un **Barbare** (non-lanceur) : 8 étapes (skip Sorts) → fiche créée → atterrissage OK → cohérence inventaire/HP.
  - Création d'un **multi-class** (Magicien 1 / Guerrier 1, niveau 2) : flow multi-class → fiche créée avec `classes.length === 2` et `totalLevel === 2`.
  - Reload mid-wizard → draft retrouvé (persist).
  - Reset → draft vidé.
  - Bouton « Choisir pour moi » sur chaque étape facultative : produit un perso valide après submit.
- [ ] D3 fermée dans `plans/DEBT.md > ## Résolu` avec le hash du commit `feat(wizard):` et la mention que les 3 bugs sont structurellement absents.

---

## Notes for next plan

- Plan 11 (radial FAB) consomme la fiche créée par ce wizard — vérifier qu'elle expose bien `classes[]`, `totalLevel`, `inventory.items[]` cohérents pour la consommation FAB.
- Plan 13 (PWA deploy) clôt S1 ; après le merge de ce plan, on est prêts à shipper v0.0.1.
- Plan 14 (campaigns model) hérite de la dette D4 (`featAtLevel1`) — voir `plans/DEBT.md > D4` pour le contrat exact attendu côté wizard quand `activeCampaign.settings.variants.featAtLevel1 === true`.
- Plan 18 (level-up wizard) réutilise les composants form §B et l'orchestration wizard §C. Refactor à `src/features/wizard/shared/` si nécessaire à ce moment-là.
- Le test `content-integrity.test.ts` (§0.2.c + §A.3) devient un gardien permanent du pipeline content — tout nouveau bundle ajouté à `public/data/` doit s'y enregistrer.
