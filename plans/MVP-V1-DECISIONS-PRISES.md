# MVP V1 — Décisions prises par défaut

Ce fichier trace TOUTES les décisions UX/produit prises par défaut par GSD pendant le développement V1, parce qu'elles n'étaient pas explicitement couvertes par plans/MVP-V1-SPEC.md.

Chaque entrée doit contenir :
- **Date** : YYYY-MM-DD
- **Jalon** : ex. 1A, 2D, etc.
- **Contexte** : pourquoi une décision était nécessaire
- **Options envisagées** : 2-3 alternatives considérées
- **Décision prise** : option retenue + courte justification
- **PR/Commit** : référence pour traçabilité
- **Status** : "à arbitrer par Adrien à l'UAT final" / "validée implicitement par usage"

Adrien lira ce fichier à l'UAT final et arbitrera les décisions qui ne lui conviennent pas. Une décision marquée "à arbitrer" qui n'est pas changée à l'UAT devient validée.

---

## Format d'entrée type

### [JALON-X] Titre court de la décision (YYYY-MM-DD)

**Contexte** : ...

**Options envisagées** :
1. Option A : ...
2. Option B : ...
3. Option C : ...

**Décision prise** : Option B parce que ...

**Référence** : PR #XX, commit abc1234

**Status** : à arbitrer par Adrien à l'UAT final

---

(les entrées seront ajoutées au fur et à mesure du développement)

---

### [JALON-1C] Dépendance non capturée — 1C suppose campagnes + memberships (S2) (2026-05-29)

**Contexte** : MVP-V1-SPEC.md liste 1C dans le JALON 1 (« Fondations restantes ») : « Mode MJ niveau 1 — voir fiches joueurs en lecture seule. Firestore Rules rôles `gm` vs `member`. » L'inventaire pré-code révèle que :

- Aucune feature `campaigns/` / `invitations/` / `dm-view/` n'existe sous `src/features/`.
- `permissions-context.tsx` pose explicitement `isDM: false` en S1, avec commentaire « la DM authority arrive en plan 16 ».
- `firestore.rules::requestUserSharesACampaignWith` retourne hardcodé `false` pour S1 et commente « no campaigns yet ».
- Plans 14 (campaigns-model), 15 (invitations), 16 (memberships-permissions), 21 (dm-dashboard) sont tous **non livrés** — c'est le périmètre Sprint 2 originel.

**Le problème** : « MJ voit fiches joueurs en lecture seule » présuppose qu'une campagne existe (sinon il n'y a pas de « MJ ») et qu'un joueur est membre (sinon pas de « fiche joueur » à voir). Sans le data layer campagnes + memberships, 1C n'a rien à opérer — c'est un mode MJ vide.

**Options envisagées** :
1. Implémenter 1C tel quel en câblant aussi les fondations campagnes/memberships (= absorber plans 14 + 15 + 16 + un stub dm-view dans le périmètre 1C). Scope creep massif : ~3-5 PRs supplémentaires pour livrer une campagne minimale + invitation + membership + DM-view. Risque de saturation contexte.
2. Implémenter UNIQUEMENT les Firestore Rules ouvrant la lecture DM (`requestUserSharesACampaignWith` réelle, ajout d'un champ dénormalisé `accessibleByDmIds: string[]` sur Character pour autoriser le `request.auth.uid in resource.data.accessibleByDmIds`). Pas de UI, pas de route, pas de loader cross-user. Le wire UI arrive plus tard. Risque : les Rules autorisent une lecture qui n'a aucun consommateur, dette tracée.
3. Différer 1C à un sous-jalon ultérieur (JALON 1.5 ou intercaler entre JALON 2 et JALON 4). Adrien décide où le repositionner dans la séquence. Le JALON 1 se termine sur 1A + 1B + 1D.

**Décision prise (conservative par défaut, à arbitrer Adrien)** : Option 3. Le JALON 1 livre 1A + 1B + 1D. 1C est différé jusqu'à ce qu'au moins un data layer campagnes minimal existe (plans 14 + 16, soit naturellement avant JALON 4 « Mode MJ complet » qui les présuppose de toute façon). Le mode MJ niveau 1 (lecture seule) devient un sous-jalon de l'enchaînement vers JALON 4 plutôt qu'une fondation isolée.

Justification : (a) Option 1 = scope creep majeur non explicitement validé par Adrien ; (b) Option 2 = Rules sans consommateur = dette structurelle pour zéro valeur utilisateur ; (c) Option 3 = position naturelle vu l'ordre des dépendances (campagnes → memberships → DM read).

**À traiter** : Adrien arbitre à l'UAT final OU en cours de route (avant JALON 4) si l'option 3 est validée. Si oui, JALON 1 = 1A + 1B + 1D et 1C remonte en JALON 4 ou intercalé.

**Référence** : commit doc-only à venir sur main (paths non protégés).

**Status** : à arbitrer par Adrien à l'UAT final

---

### [JALON-1B.2] `ability-set-floor` non câblé dans l'UI en v0 (2026-05-28)

**Contexte** : Le moteur d'effets actifs (1B.1) supporte 4 kinds dont `ability-set-floor` (Amulet of Health CON=19, Gauntlets of Ogre Power FOR=19). Le backfill 1B.2 a ajouté l'effet structuré sur les 2 items SRD candidats. Mais l'UI ne consomme pas encore le score d'ability modifié — Hexagram / SavesRow / HpMegaCard utilisent toujours `character.abilities[ability]` brut.

**Options envisagées** :
1. Câbler immédiatement Hexagram + SavesRow + HpMegaCard à `computeDisplayedAbility`. Câbler aussi les rolls (un test STR avec Gauntlets équipés roule sur FOR=19 modifié). Mais HP max stocké en base doit-il être recalculé ? Si CON passe de 14 à 19, le HP max gagne du CON × HD — mais c'est un champ stocké, pas dérivé, dont la recompute touche `useUpdateCharacter`. Scope creep majeur, risque de corrompre des persos existants.
2. Câbler uniquement l'affichage Hexagram (badge « 19 » à la place de « 14 » pour CON quand Amulet équipée) sans recompute HP max ni propagation aux saves dérivées. Demi-livraison sémantiquement bancale.
3. Différer entièrement l'affichage `ability-set-floor` à 1B.3. Le moteur le supporte (testé en 1B.1), le bundle le porte (backfill 1B.2), mais l'UI n'expose pas encore. Cap-AC + cap-saves + cap-speed restent les démos visibles du moteur v0.

**Décision prise** : Option 3 — `ability-set-floor` reste « engine-ready, UI-deferred » en v0. Justification : (a) impact sur les champs dérivés stockés (HP max, save bonuses calculés) trop large pour être livré sans plan dédié ; (b) la démo visible 1B.2 v0 sur AC+save+speed suffit à valider la mécanique de propagation ; (c) Option 1 expose au risque de corruption HP, Option 2 livre un demi-modèle confusant.

**À traiter en 1B.3 ou plan dédié V1 jalon 1 ultérieur** : câblage Hexagram à `computeDisplayedAbility`, recompute HP max conditionnel à l'équipement Amulet of Health (avec migration safe pour persos existants), propagation à SavesRow / SkillsList.

**Référence** : PR à venir (feat/1B-2-magic-effects-wire-backfill)

**Status** : à arbitrer par Adrien à l'UAT final

---

### [JALON-1A.2] Mode Âme reste placeholder en V1 jalon 1 (2026-05-28)

**Contexte** : MVP-V1-SPEC.md JALON 1A demande « Sheet desktop complet pour LES 5 MODES (Identité/Âme, Combat, Magie, Essence, Avoir) ». Le mode Âme est actuellement un placeholder vide (ownerisé par plan 20 / Sprint 2). Lui donner du « traitement desktop » sans contenu réel = layout responsive d'une page vide.

**Options envisagées** :
1. Étendre le scope de 1A.2 pour livrer aussi le contenu du mode Âme (Personnalité / Aptitudes / Maîtrises / Histoire / Stats — plan 20 entier S2). Scope creep majeur estimé ~3-5 jours de travail.
2. Garder le placeholder mais lui appliquer un traitement desktop cohérent (rendu en `<section>` aligné avec les 4 modes contentés, centré au xl pas en grille 2-col vide). Le contenu réel est différé à un jalon ultérieur V1.
3. Différer entièrement le mode Âme au jalon 6 ou au-delà — ne rien faire en 1A.2.

**Décision prise** : Option 2 — le placeholder Âme est rendu en `<section role="tabpanel">` cohérent avec les 4 modes contentés et hérite des resets CSS scoped lg+. À xl+ il n'est PAS basculé en grille 2-col (volontairement absent du sélecteur xl). Le contenu réel du mode Âme (plan 20) reste un jalon ultérieur de V1 — la spec V1 ne le détaille pas et ne l'inclut pas dans le jalon 1.

Justification : option 1 explose le scope du jalon 1 (1A = sheet desktop, pas contented all modes). Option 3 laisse une zone visiblement cassée au desktop. Option 2 livre la cohérence visuelle V1 sans déborder.

**Référence** : PR à venir (feat/1A-2-sheet-ame-placeholder-desktop), commit à venir

**Status** : à arbitrer par Adrien à l'UAT final

---

### [JALON-1D.4a] Spec offline-sync e2e — scénarios (a) + (d) ; (b) custom item + (c) map différés (2026-05-29)

**Contexte** : MVP-V1-SPEC.md JALON 1D.4 demande 4 scénarios e2e offline : (a) édition fiche, (b) création custom item, (c) déplacement token carte, (d) écritures multiples. La PR 1D.4a livre une `tests/e2e/offline-sync.spec.ts` couvrant (a) + (d). Les 2 autres scénarios sont différés pour des raisons documentées ci-dessous, pas par oubli.

**Scénario (b) — custom item en offline + reconnect** :
- Le flow `custom-item-form.tsx > handleSubmit` enchaîne 4 opérations Firestore : (1) `setDoc` sur `users/{uid}/customContent/items/{id}` (write 1), (2) `invalidateUserContent('items', uid)` qui touche le cache Dexie, (3) `addItemToInventory` → `resolveContent` qui fait un round-trip Firestore pour valider l'item, (4) `updateCharacter` (write 2).
- En offline, (3) `resolveContent` lit-il fiable depuis le cache du SDK Firestore ? La question demande un audit dédié du chemin offline de `resolveContent` + tests unitaires de comportement avant de pouvoir asserter un parcours e2e déterministe.
- **Décision** : différer (b) à un sous-jalon ultérieur (1D.4c ou similar) qui auditera explicitement le flow custom item offline. Le test (a) couvre déjà le pattern d'écriture le plus critique (édition fiche) et (d) couvre l'ordering des writes multiples.

**Scénario (c) — déplacement token map en offline + reconnect** :
- `src/features/map-proto/` est un PROTOTYPE — la liste des sites d'écriture est mouvante, plusieurs slices Zustand pas-encore-Firestore (initiative, fog, lighting, AoE, ruler) seront déplacées vers Firestore via plan JALON 5 VTT complet (3-5 sem de chantier).
- Tester l'offline contre un proto qui changera incessamment = bug fixture-cassée garantie à chaque refactor du map.
- **Décision** : différer (c) au JALON 5 (VTT Foundry-level) — quand les sites d'écriture map seront stabilisés. Le mode offline du joueur sur la carte est une fonctionnalité moins critique que l'édition de fiche en V1 (le DM contrôle généralement la carte ; les joueurs peuvent attendre sa propagation pour voir leurs propres tokens).

**Décision prise** : Spec 1D.4a couvre (a) édition HP fiche en offline + (d) 3 writes successives offline avec propagation ordonnée à reconnect + garde-fous OfflineBanner (offline → syncing → null). (b) et (c) tracés explicitement dans cette décision pour ne pas être oubliés. Le critère « 4 scénarios e2e offline verts » de la spec V1 est partiellement honoré ; le reste s'enchaîne quand les pré-requis sont levés.

Justification : conservative-by-default — on livre ce qui peut l'être proprement maintenant sans inventer un protocole offline pour des chemins (custom item, map proto) qui n'y sont pas explicitement préparés.

**Référence** : PR à venir (feat/1D-4a-offline-sync-e2e)

**Status** : à arbitrer par Adrien à l'UAT final

---

### [JALON-1D.4b] PWA assets placeholder + e2e offline-load via `vite preview` (2026-05-29)

**Contexte** : MVP-V1-SPEC.md JALON 1D.4 demande « Service Worker minimal pour offline-load » avec un « test e2e qui valide ouvrir app online → setOffline(true) → reload → l'app se charge ». L'inventaire pré-code révèle que :
- VitePWA était déjà configuré dans `vite.config.ts` avec `registerType: 'autoUpdate'` + Workbox precache complet (33 entrées : HTML, JS, CSS, `public/data/*.json`).
- `dist/registerSW.js` + `<script id="vite-plugin-pwa:register-sw">` sont auto-injectés au build : **aucun ajout de code dans `src/main.tsx` n'est requis**.
- Manifest référence 3 PNGs (192/512/maskable) + `index.html` référence `favicon.svg` + `apple-touch-icon.png` — TOUS absents sur disque (manifest techniquement invalide, 404 console).

**Décisions prises** :

1. **Assets PWA placeholder générés par script reproductible** (`scripts/generate-pwa-placeholder-icons.ts` + `pnpm content:pwa-icons`) — 4 PNGs solides aux dimensions correctes (192×192, 512×512, 512×512 maskable, 180×180 apple-touch) + 1 SVG favicon stylisé "G" doré sur fond brand-ink. Couleur : `#08060e` (brand-ink GrimWar). Pure Node + zlib, zéro dépendance externe. Adrien fournira les vrais assets de marque en V1.1.

2. **`registerSW` explicite côté `main.tsx` : NON ajouté**. VitePWA injecte déjà la registration via `<script src="/registerSW.js">` dans `dist/index.html`. Ajouter un `import { registerSW } from 'virtual:pwa-register'` doublerait l'enregistrement et n'apporte rien tant qu'on n'a pas besoin d'un hook UI (« nouvelle version disponible »). Quand ce besoin viendra (V1.5+), on basculera à l'enregistrement explicite.

3. **`devOptions.enabled`: false (inchangé)**. Enabler le SW en dev mode interfère avec le HMR de Vite (le SW intercepte les modules avant le HMR). Le test offline-load tourne contre `vite preview` qui sert le build de prod — environnement réaliste, pas de pollution du flow dev d'Adrien.

4. **Config Playwright dédiée `playwright.preview.config.ts`** (`pnpm test:e2e:preview`) — boote `pnpm build && pnpm preview --port 5180`, ne tourne QUE `tests/e2e/offline-load.spec.ts`. La config dev (`playwright.config.ts`) exclut explicitement ce spec via `testIgnore: ['**/offline-load.spec.ts']` pour ne pas le ramasser sans le SW prod.

5. **`tests/e2e/offline-load.spec.ts` scopé au chargement de l'app**, pas à la fiche du joueur en offline. La spec V1 disait « fiche du joueur lisible depuis Dexie cache » mais en pratique la fiche est dans Firestore (pas Dexie), et l'auth anon offline vs. émulateur indispo demande un setup hors-scope. On prouve le critère structurel : **HTML + JS + CSS servis depuis le précache → app boote → LibraryScreen rend** après `setOffline(true)` + `reload()`. Tester la fiche en offline-load demande un setup multi-couches (Firestore IndexedDB persistence + Dexie + SW) qui mérite son propre PR si jugé nécessaire ultérieurement.

**Référence** : PR à venir (feat/1D-4b-sw-precache-offline-load)

**Status** : à arbitrer par Adrien à l'UAT final

---

### [JALON-3C] Décomposition JALON 3C en 11 sous-jalons PR-sized (2026-05-31)

**Contexte** : MVP-V1-SPEC.md JALON 3C demande « UI in-app de création par catégorie (9 formulaires) ». L'audit des 9 schémas Zod V1 (`CustomContentPackEntitiesSchema`) révèle des surfaces très inégales :

| Catégorie | Champs requis | Sous-objets | Complexité UI |
|---|---|---|---|
| `feats` | 6 (id, name, prerequisite?, summary?, description?, category?, prerequisites[]?, source) | i18n × 4 + discriminated union | Faible |
| `invocations` | 5 (id, name, summary, prerequisiteWarlockLevel?, prerequisiteOther?, source) | i18n × 3 | Faible |
| `subancestries` | 6 (id, ancestryId, name, description, traits[], abilityScoreIncrease[], source) | i18n × 2 + ASI repeater + traits repeater | Moyenne |
| `backgrounds` | 9 (id, name, description, skillProficiencies[], toolProficiencies[], languages, equipment[], startingCoins?, feature{name,description}, source) | i18n × 3 + 3 multi-select + ItemRef repeater | Moyenne |
| `subclasses` | ? (à expliciter par sous-classe SRD : Champion + Beast Master + Battle Master = features hétérogènes) | Heterogene, source de variation | Moyenne-élevée |
| `spells` | 14 (id, name, level, school, castingTime, range, components{v,s,m,material?}, duration, concentration, ritual, description, atHigherLevels?, classes[], damage[]?, summonedCreatureIds[]?, source) | i18n × 6 + enum × 2 + bool × 3 + damage repeater | Élevée |
| `ancestries` | 11 (id, name, size, speed, description, ASI[], traits[], languages[], source, options{}, commonSpellIds[]?, spellUsages?) | Sous-objet `options` polymorphe (dragon / tiefling / elf / gnome / giant) | Très élevée |
| `items` | ~10 (id, name, category, weight?, description, properties[], damage?, mastery?, source) — varie par `category` | Variant par catégorie (weapon / armor / gear / tool) | Très élevée |
| `classes` | ~25 (id, name, hitDie, primaryAbilities[], savingThrows[], skillChoices, startingEquipment, multiclassPrerequisites, multiclassProficiencies, levelTable, ASI/feat levels, spellcasting?, options[]?) | Énorme — source du wizard L1 + level-up L2-L20 | Massive |

**Options envisagées** :

1. **Form-kit générique dérivé de Zod** (un générateur introspecte `_def` et rend automatiquement le formulaire). Avantage : un seul moteur couvre les 9. Risque : abstraction lourde, mauvais UX pour les schémas hétérogènes (Spell ≠ Class), debug pénible, pattern non utilisé ailleurs dans le projet.

2. **Formulaires hand-rolled par catégorie**, partageant des primitives `FieldString` / `FieldI18n` / `FieldNumber` / `FieldEnum` / `FieldArrayString` / `FieldRepeater`. Avantage : UX précis, debug clair, alignement avec le form-kit Tailwind du projet. Coût : ~9 formulaires distincts, mais réutilisation des primitives = ~30% de code par form après le premier.

3. **Hybride** : générateur dérivé de Zod pour les 4 catégories simples (feats, invocations, subancestries, backgrounds) + formulaires hand-rolled pour les 5 complexes. Avantage : couverture rapide des simples. Risque : 2 paradigmes à maintenir, plus de surface bug que (2).

**Décision prise** : **Option 2 — primitives + 9 forms hand-rolled, attaqués par ordre de complexité croissante**. Justification : (a) le form-kit existant (`shared/components/form-kit-*`) est déjà hand-rolled et bien rodé ; (b) chaque schema mérite son UX dédié (un Spell n'a pas la même ergonomie qu'une Class) ; (c) un générateur Zod-driven serait un projet en soi, hors V1 ; (d) attaquer par ordre croissant permet d'éprouver les primitives sur les 2 plus petits forms (feat + invocation) avant d'attaquer Spell/Class.

**Décomposition en 11 sous-jalons PR-sized** :

| Sous-jalon | Périmètre | Estimation |
|---|---|---|
| **3C.1** | Form-kit primitives custom-content (`FieldI18n`, `FieldEnum`, `FieldArrayString`, `FieldRepeater`) + **FeatForm** + PackEditor shell (route `/account/content/new`, list des 9 catégories vides, sélection catégorie, ajout entité, export JSON / save Firestore). e2e : créer pack avec 1 feat → save → apparaît dans la liste packs. | 1 PR |
| **3C.2** | **InvocationForm** + intégration dans PackEditor. Réutilise primitives 3C.1. e2e : ajouter 1 invocation à un pack existant. | 1 PR |
| **3C.3** | **SubancestryForm** (ASI repeater + traits repeater + référence `ancestryId` parmi SRD ∪ pack). e2e : créer subancestry référant une ancestry SRD. | 1 PR |
| **3C.4** | **BackgroundForm** (multi-select skills/tools/languages + ItemRef repeater pour `equipment`). e2e : background complet. | 1 PR |
| **3C.5** | **SubclassForm** (id, name, description, parentClassId, features[] minimales). Heterogène SRD documenté ; pour V1 on offre champs libres `features[]` (name + description + level). | 1 PR |
| **3C.6** | **SpellForm** (level enum, school enum, components struct, damage repeater optionnel, classes multi-select). Le plus utile en pratique (joueurs ajoutent souvent des sorts custom). | 1 PR |
| **3C.7** | **ItemForm** (catégorie discriminée : weapon / armor / gear / tool — champs conditionnels). | 1 PR |
| **3C.8** | **AncestryForm** (size/speed/ASI/traits) + sous-éditeur `options` pour les 5 variantes SRD (dragon / tiefling / elf / gnome / giant). Sous-éditeur live tant qu'au moins une variante est utilisée. | 1 PR |
| **3C.9** | **ClassForm** (hitDie, primary/saves, skillChoices, startingEquipment, multiclassPrerequisites, multiclassProficiencies) — sans level table L2-L20 dans le form V1 (un homebrew complet de classe est mieux fait à la main en JSON). Le form V1 cible les classes simples (id, name, fondations) + un avertissement « pour une classe complexe, éditez le JSON ». | 1 PR |
| **3C.10** | **PackEditor edit mode** : permettre de modifier un pack déjà importé (charge depuis Firestore, formulaires pré-remplis, save écrase). | 1 PR |
| **3C.11** | Doc utilisateur `docs/CUSTOM-CONTENT-CREATE.md` + screenshots UAT regroupés dans `uat-review/jalon-3C/`. Et e2e end-to-end : créer un pack avec 1 entité par catégorie → save → ouvrir wizard → tous les forms produisent une option utilisable. | 1 PR |

**À traiter** : Adrien arbitre l'ordre et la profondeur à l'UAT final. Si une catégorie n'est jamais utilisée par lui en pratique (ex. ClassForm car les classes custom sont rares), on pourra réduire le périmètre du form en V1 — la décision finale dépend de l'usage réel observé.

**Référence** : PR à venir (feat/3C-0-audit-decompose-pack-editor) — commit doc-only sur main.

**Status** : à arbitrer par Adrien à l'UAT final

---

### [JALON-1A étendu] Sheet desktop densification post-1A (rétroactif, 2026-06-04)

**Contexte** : JALON 1A.1 avait posé la coquille sidebar + main du desktop sheet, mais l'audit responsive réel (4 viewports × 5 modes en captures `uat-review/`) révélait à 1024 et 1440px des cards cantonnées à ~440px largeur centrées, ~60% du viewport occupé par l'aurora background. Cause racine identifiée pendant l'audit : un `> * { max-width: 420px }` hardcodé dans `globals.css` lors de JALON 1A.1 cappait silencieusement TOUTES les cards et neutralisait les utilities Tailwind annoncées. Le polish desktop n'a pas été planifié comme un sous-jalon V1 distinct — il a été exécuté en autonomie le 2026-06-04 (commit `afeca89`) à la demande explicite d'Adrien (« UI/UX déplorable en desktop, à améliorer »).

**Options envisagées rétroactivement** :
1. Rebadger comme « JALON 1A.3 » nouveau sous-jalon V1. Risque : pollue la numérotation 1A officielle après clôture.
2. Officialiser comme « extension 1A — polish post-clôture » sans nouveau sous-jalon numéroté. Trace la décision sans réécrire la séquence.
3. Reverter le commit et le re-livrer formellement dans un sprint polish V1.5. Coût élevé pour zéro gain (le code est sain, testé, déployable).

**Décision prise** : Option 2 — officialisé comme **« 1A étendu — Sheet desktop densification post-1A »**, intégré rétroactivement à la clôture du JALON 1A. Le code reste sur `main` (commit `afeca89`). Aucune renumérotation V1.

Justification : (a) le commit corrige une dette structurelle (cap 420px hardcodé) qui aurait été un blocage UAT final ; (b) l'extension est cohérente avec l'intention 1A (sheet desktop complet) — ce n'est pas un nouveau pilier, c'est la finition de la coquille déjà posée ; (c) tests verts (triple gate + e2e responsive structural), pas de régression mobile/tablet, l'extension est qualitativement saine.

**Changements livrés (récapitulatif factuel)** :
- `sheet-screen.tsx` : container `lg:max-w-[1240px]` → `xl:max-w-[1440px]`, sidebar 300→320px à xl, gap 8→10.
- `combat-mode.tsx` + `essence-mode.tsx` : `xl:grid xl:grid-cols-2`, focales en `xl:col-span-2`, petits panneaux en grille.
- `magie-mode.tsx` + `avoir-mode.tsx` : `lg:max-w-[720px]` monocol (listes longues respirent).
- `status-strip.tsx` : 2×2 à lg+ au lieu de 1×4 écrasé.
- `mode-tabs.tsx` : vertical pleine-largeur lg+ avec border-left dorée.
- `globals.css` : suppression du cap 420px (cause racine).
- `wizard-screen.tsx` : barre de progression `h-[3px] md:h-1 lg:h-1.5`.
- `tests/e2e/sheet-responsive-layout.spec.ts` : 166 lignes, assertions DOM bbox 4 viewports.
- UAT : 20 captures `uat-review/sheet-desktop/` (gitignored).

**Référence** : commit `afeca89` (direct main, pas de PR — exécution en mode autonomie demandée par Adrien).

**Status** : à arbitrer par Adrien à l'UAT final

---

### [JALON-4A prototype pré-V1] Vue MJ `/dm` MVP exécutée hors-séquence (rétroactif, 2026-06-04)

**Contexte** : MVP-V1-SPEC.md JALON 4 « Mode MJ complet » présuppose l'existence d'un data layer campagnes + memberships (cf. décision [JALON-1C] du 29/05 qui avait acté de DIFFÉRER 1C jusqu'à ce que ce data layer existe). Le 2026-06-04, en autonomie complète sur demande d'Adrien (« vue admin/MJ doit avancer, jamais vue par l'utilisateur »), un MVP `/dm` a été livré (commit `09d1308`) opérant sur les fiches du même `uid` que l'utilisateur connecté, sans memberships réels. Le code anticipe JALON 4 sans en lever les pré-requis V1.

**Options envisagées rétroactivement** :
1. Reverter le commit. Coût : perte de ~960 lignes de code testées (party-card, secret-roll, quick-notes, i18n MJ) qui seront re-livrées presque à l'identique au JALON 4A propre.
2. Rebadger comme **« Prototype 4A pré-V1 »** — code conservé sur `main`, mais explicitement étiqueté comme proto à refactorer une fois les memberships livrés (JALON 4.0 préalable). Le `/dm` actuel reste accessible mais opère sur mock-uid jusqu'à ce que le refactor le branche sur les vrais membres de campagne.
3. Promouvoir le commit en livrable V1 final 4A. Refusé : (a) viole la décision 1C du 29/05 ; (b) opère sur mock-uid, ne couvre pas le cas réel multi-joueurs ; (c) anticipe avant les pré-requis (campagnes + memberships absents).

**Décision prise** : Option 2 — **« Prototype 4A pré-V1 — opère sur fiches mock du même `uid`, pas sur cohorte réelle. À valider/refactorer après livraison des memberships dans JALON 4 propre. »** Le code n'est PAS reverté. Il est explicitement marqué prototype dans cette décision et sera refactoré lors de JALON 4A propre.

Justification : (a) le code livré (PartyCard, SecretRollButton, QuickNotes) est qualitativement sain et sera réutilisé tel quel ou presque ; (b) reverter pour re-livrer presque à l'identique = pur gaspillage ; (c) le proto sert d'amorce UI/UX que le refactor 4A consommera, après que JALON 4.0 (Campaign + memberships) ait posé les data structures réelles ; (d) le `/dm` reste non listé dans le nav-shell (lien discret en pied de bibliothèque) — exposition minimale jusqu'au refactor.

**Composants livrés (à refactorer en 4A)** :
- `src/features/dm-view/dm-dashboard-screen.tsx` (111 lignes) — orchestrateur 2-col, à câbler sur cohorte réelle.
- `src/features/dm-view/party-card.tsx` (181 lignes) — emblème HP / classes-niveau / barre PV ratio / CA + Init / conditions chips. **Réutilisable tel quel** une fois branché sur vrais membres.
- `src/features/dm-view/secret-roll-button.tsx` (174 lignes) — d20+mod, avantage/désavantage, historique court. Câblage event-log `visibility:'dm'` arrive plan 22 ; pour V1 reste inline local.
- `src/features/dm-view/quick-notes.tsx` (80 lignes) — scratchpad markdown localStorage. Bascule vers `session.notes` Firestore quand plan 23 livre.
- `routes.tsx` : route `/dm` enregistrée.
- `library-screen.tsx` : lien discret « Tableau du meneur → » en pied (à supprimer ou repositionner quand la vraie nav arrive).
- `i18n.ts` : 92 lignes de clés `dm.*` (réutilisables tel quel).
- Tests : 207 lignes unit + 76 lignes e2e UAT.

**Bonus connexe à noter** : `useCharactersList` aligné sur `useCharacter` pour l'upgrade `v1 → v2` avant parse Zod. Sans ça, les fiches v1 historiques étaient silencieusement filtrées de la bibliothèque tout en s'ouvrant normalement par ID. C'est un fix indépendant de la vue MJ — il aurait dû être un commit séparé, à noter pour discipline future.

**Prochaine étape V1 (séquence remise sur les rails)** :
1. **JALON 4.0** — Campaign entity + memberships data layer (Firestore + Zod + service + UI « Mes campagnes » + Rules).
2. **JALON 4A** — Refactorer `/dm` pour brancher PartyCard sur les vrais membres de campagne (non plus mock-uid). Ajouter édition complète des fiches joueurs par MJ.
3. **JALON 4B** — Création items custom in-app + distribution depuis vue MJ.
4. **JALON 4C** — Co-MJ multiples, permissions Firestore étendues.

**Référence** : commit `09d1308` (direct main, pas de PR — exécution en mode autonomie demandée par Adrien).

**Status** : à arbitrer par Adrien à l'UAT final (le proto reste accessible jusqu'au refactor 4A)

---

### [JALON-4.0] Schéma Campaign + Membership V1 — divergences vs DATA-MODEL.md brouillon (2026-06-06)

**Contexte** : JALON 4.0 livre la fondation Campaign + memberships (pré-requis non identifié dans MVP-V1-SPEC.md, ajouté en début de JALON 4). La spec d'Adrien pour 4.0 simplifie le schéma initial de `docs/DATA-MODEL.md` (rédigé en brouillon S2 avant le re-séquencement V1). Plusieurs divergences délibérées doivent être tracées avant que les sous-jalons 4.0.2 → 4.0.6 ne se posent dessus.

**Décisions de schéma prises en 4.0.1** (commit du PR `feat/4-0-1-campaign-schema`) :

1. **`gmIds: string[]` (array, min 1, max 8) au lieu de `dmUserId: string` (singleton)** — Anticipe 4C (co-MJ multiples) sans migration de doc. Un MJ unique = `gmIds.length === 1`. Justifié par la spec explicite d'Adrien dans le message du 06/06 : « 4C : gmIds[] supporte plusieurs UIDs ». Implique refactor des `firestore.rules` lignes 21, 169, 176 + de `services/campaigns.ts > ensureCampaignExists` lors de 4.0.2 / 4.0.3.

2. **Sous-collection `members/{uid}` au lieu de `memberships/{uid}`** — Nom plus court, plus aligné avec le rôle 2-valeurs (`gm`|`member`). Justifié par la spec Adrien : `campaigns/{cid}/members/{uid}`. Implique refactor des rules ligne 26, 180, 244, 294 lors de 4.0.2.

3. **Rôles `'gm' | 'member'` au lieu de `'dm' | 'player' | 'spectator'`** — Le rôle `spectator` n'a aucun consommateur V1 (pas de cas d'usage Twitch/observation table). Renommé `dm` → `gm` pour homogénéité avec `gmIds`. Si le besoin spectateur réapparait (V1.5+), on étend l'enum.

4. **Settings simplifiés** — On garde `language`, `diceMode`, `variants` (3 réglages qui ont un consommateur V1 réel). On drop `permissionMode` (toujours `dm-full`, donc inutile en V1), `allowHomebrew` (remplacé par le système custom-content JALON 3), `startingLevel` (hors-scope V1 — le wizard pose le perso à L1), `enableSpectators` (suit la décision #3).

5. **`inviteToken` (long token URL) déféré à 4.0.5** — En 4.0 on livre uniquement `inviteCode` (6-char). L'invite par lien partageable arrivera quand l'UI invite/join sera câblée (4.0.5).

6. **Constantes de génération du code d'invitation** — Alphabet sans `0/1/I/O` pour éviter les confusions visuelles à la dictée IRL (le code se partage à voix haute autour d'une table). 6 caractères = ~30 bits d'entropie, suffisant pour une campagne privée (rotation manuelle suffit).

7. **Champs `characterOwnerId` + `status` + `stats.*` du membership initial drop** — `characterOwnerId` redondant tant que les fiches restent player-owned (PJ ⇒ owner = userId). `status: 'active'|'invited'|'left'` remplacé par présence/absence du doc (kick = delete). `stats.*` (per-campaign metrics) arriveront via la collection events (JALON 22), pas via du dénormalisé fragile.

**Options envisagées** :
1. Suivre DATA-MODEL.md à la lettre (`dmUserId` singleton, 3 rôles, settings complets). Avantage : pas de re-rédaction de doc. Inconvénient : viole la spec d'Adrien 4.0 explicite + crée une dette migration au moment de 4C (renommer le champ + propager les rules + migrer les docs existants).
2. **Suivre la spec d'Adrien à la lettre (gmIds[], 2 rôles, settings simplifiés)**. Avantage : alignement avec l'intention V1 + zéro migration future pour 4C. Inconvénient : re-rédiger la section campaigns de DATA-MODEL.md.
3. Schéma hybride (gmIds[] mais 3 rôles, etc.). Inconvénient : moitié-cohérent, pire des deux mondes.

**Décision prise** : **Option 2** — la spec d'Adrien 4.0 est l'autorité V1, DATA-MODEL.md est mis à jour pour refléter le schéma V1 + tracer les champs déférés post-V1 dans des sections explicites.

**Conséquences pour les sous-jalons suivants** :
- **4.0.2 (Firestore Rules)** : refactor `dmUserId == request.auth.uid` → `request.auth.uid in resource.data.gmIds`. Renommer `/memberships/` → `/members/`. Tests rules-unit.
- **4.0.3 (campaignService.ts)** : refactor `ensureCampaignExists` pour écrire `gmIds: [uid]` au lieu de `dmUserId: uid`. Ajouter `createCampaign`, `listMyCampaigns`, `joinByCode`, `leaveCampaign`, `promoteToGm`.
- **4.0.4 → 4.0.6** : UI consomme la nouvelle forme directement, pas de cas legacy à gérer (pas de docs en prod sous l'ancien schéma — seul `ensureCampaignExists` du proto map-proto pourrait avoir créé un doc local, à migrer one-shot ou ignorer).

**Migration** : `schemaVersion: 1` posé d'office sur tous les docs créés à partir de 4.0.3. Aucune migration `v0 → v1` nécessaire — aucun doc V1 conforme n'existe encore en prod (seuls les stubs `ensureCampaignExists` du chantier D map-proto ont posé des docs ; à nettoyer manuellement ou via une migration 4.0.3 si découverte de docs résiduels).

**Référence** : PR `feat/4-0-1-campaign-schema` — Zod schema + tests (35 cas) + alignement DATA-MODEL.md. Les rules + service + UI suivent dans 4.0.2 → 4.0.6.

**Status** : à arbitrer par Adrien à l'UAT final V1
