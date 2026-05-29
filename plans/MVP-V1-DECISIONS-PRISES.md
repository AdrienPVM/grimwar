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
