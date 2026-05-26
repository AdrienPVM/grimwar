# Mode carte — proposition technique + roadmap (PRÉ-PRODUCTION)

> **Cette PR livre un PROTOTYPE-SQUELETTE, pas un mode carte fini.** Le but
> est de fournir à Adrien du code réel à examiner pour arbitrer les décisions
> UX/produit listées plus bas, plutôt que des promesses abstraites.

**Livré** : marathon nuit 2 — 2026-05-26 (CHANTIER 8).

## 1. Stack technique choisie : SVG + React natif

### Décision

**SVG inline + React + transform de `viewBox`**, zéro nouvelle dépendance.

### Alternatives évaluées (écartées)

| Stack | Coût bundle | Justification d'écart |
| --- | --- | --- |
| **Pixi.js** | ~400kb gzipped | Réservée S4 par `CLAUDE.md > Map / VTT`. Installer aujourd'hui pour un proto de 3 tokens = scope creep majeur. Sa puissance (WebGL, sprite batching) ne sert que sur des centaines de tokens / effets de lumière — surdimensionnée pour la phase 1. |
| **Konva + react-konva** | ~120kb gzipped | Excellent ergonomie React pour canvas (drag-drop natif, hit detection), mais ajoute un poids non négligeable pour une feature en validation produit. Si la phase 2 prouve que SVG plafonne (perf à 50+ tokens), Konva sera la migration la plus indolore — l'API ressemble à React. |
| **Canvas 2D natif** | 0 | Toute la hit detection à coder à la main, pas de model React, perf identique à SVG sur < 100 nœuds. SVG gagne par simplicité dev. |
| **Mapbox / Leaflet** | ~250kb+ | Géolocalisation projetée, totalement hors sujet (carte dessinée fictive, pas géo). |
| **Three.js / WebGL custom** | ~600kb+ | Aucun besoin 3D, et la cible utilisateur (mobile-first phone-in-a-cave) interdit le coût GPU/CPU. |

### Forces du choix SVG

- **0 install** — préserve `pnpm install` rapide et CLAUDE.md « New external dependency » sans approval.
- **Hit-test gratuite** — un click sur un `<circle>` token déclenche son event listener. Pas de math.
- **Transform `viewBox`** — pan/zoom basique en mutant 4 nombres, le navigateur fait le reste.
- **Accessible nativement** — `<text>` lisible par lecteur d'écran, contrairement à canvas.
- **CSS transitions** sur transforms si on veut animer les mouvements de tokens.

### Limites assumées

- **Performance plafonne ~50-100 nœuds** (tokens + effets) selon le navigateur. Si la phase 4 (fog + lumière) requiert un fragment shader, c'est le moment de migrer vers Konva ou Pixi.
- **Pas de filtres GPU** sophistiqués (light radius, gradient pseudo-volumétrique) — possibles via SVG `<filter>` mais lents au-delà de 2-3 calques.
- **Image background lourde** (8 Mo+) peut ralentir le pan/zoom — le proto utilise un blob URL en mémoire, le full écran de 4000×3000px ralentit.

## 2. Modèle de données proposé

```ts
// /shared/types/map.ts (à créer en phase 2, pas dans cette PR)

interface MapDocument {
  readonly id: string;            // generated UUID
  readonly campaignId: string;    // belongs-to
  readonly name: string;
  readonly description?: string;
  readonly background: MapBackground;
  readonly tokens: readonly Token[];
  readonly fogRegions?: readonly FogRegion[];     // phase 3
  readonly lightSources?: readonly LightSource[]; // phase 4
  readonly grid: GridConfig;
  readonly bounds: { width: number; height: number };  // unités logiques
  readonly version: 1;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

interface MapBackground {
  readonly source: 'firestore-storage' | 'external-url' | 'dd2vtt-import';
  readonly url: string;     // Firebase Storage URL ou externe
  readonly dimensions: { width: number; height: number };
  readonly dd2vtt?: Dd2vttMetadata;  // si import Dungeon Alchemist
}

interface Token {
  readonly id: string;
  readonly label: string;
  readonly position: { x: number; y: number };
  readonly characterId?: string;    // lien optionnel à un PJ
  readonly color: string;
  readonly imageUrl?: string;        // sprite si présent, sinon cercle coloré
  readonly hidden: boolean;          // visible MJ uniquement
  readonly size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
}

interface FogRegion {                // phase 3
  readonly id: string;
  readonly polygon: readonly [number, number][];
  readonly revealed: boolean;        // false = caché aux joueurs
}

interface LightSource {              // phase 4
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly radiusBright: number;     // unités logiques
  readonly radiusDim: number;
  readonly color: string;            // hex
  readonly emitting: boolean;
}

interface GridConfig {
  readonly enabled: boolean;
  readonly size: number;             // taille d'une case en unités logiques
  readonly snap: boolean;            // les tokens collent-ils à la grille ?
  readonly color: string;
  readonly opacity: number;
}

interface Dd2vttMetadata {
  // Dungeon Alchemist .dd2vtt format — à parser en phase 2
  readonly resolution: { mapSize: { x: number; y: number }; pixelsPerGrid: number };
  readonly lineOfSight?: readonly { x: number; y: number }[][];
  readonly lights?: readonly Dd2vttLight[];
}
```

## 3. Liste exhaustive des décisions UX/produit à arbitrer

> **C'est le cœur de cette PR.** Aucune des questions ci-dessous n'est résolue
> par le proto-squelette ; elles attendent ton arbitrage avant d'engager
> du code de production.

### A. Périmètre fonctionnel — qu'est-ce qu'on livre en V1 ?

1. **Fog of war ?** Oui/non. Si oui : (a) polygones manuels dessinés par le MJ, ou (b) auto-révélé selon la position des tokens joueurs (line-of-sight). Le `.dd2vtt` import fournit déjà les lignes de vue → option (b) viable.
2. **Lumière dynamique ?** Oui/non. Si oui : (a) cercles statiques posés par le MJ, ou (b) rayon de lumière attaché à un token (torche/lanterne) qui se déplace avec lui ? D&D 5e définit Bright Light (clair), Dim Light (sombre), Darkness (obscurité) → 3 paliers à rendre.
3. **Combat à la grille (mouvements case-par-case) ou combat libre (drag continu) ?** Le SRD parle de 5-foot squares ; D&D 2024 propose les deux. La distinction impacte la précision UX (snap-to-grid yes/no) + tracking des mouvements par tour.
4. **Mesure de distance ?** Une règle MJ qui dessine une ligne et affiche « 9 m » entre deux points ? Pour les portées de sort (« cube de 6 m », « émanation 9 m ») ?
5. **Templates de zone d'effet (AoE) ?** Cercles, cônes, lignes pour visualiser les zones de sort. Liés au sort cliqué côté fiche → projetés sur la carte ?
6. **Imports de cartes externes** ? Dungeon Alchemist `.dd2vtt` est mentionné dans CLAUDE.md → priorité phase 2 ou 3 ?

### B. Modèle de données + persistance

7. **Firestore pour les maps ?** Schéma proposé ci-dessus → confirmer la collection `campaigns/{cid}/maps/{mid}`. Permissions : MJ peut tout écrire, joueurs lisent uniquement leurs cartes visibles.
8. **Images de fond** : (a) Firebase Storage (limite gratuit 5 Go), (b) URL externe (le MJ host ailleurs), ou (c) les deux ? Si (a), il faut activer Firebase Storage (pas encore actif) + payer le quota si la campagne grossit.
9. **Versionnage** : si une carte évolue (le MJ ajoute des tokens entre 2 sessions), garde-t-on l'historique ? Si oui, mécanisme (snapshots par session ? CRDT plus tard ?).
10. **Offline-first ?** Conformément à la promesse PWA « airplane mode dans une cave ». Si oui : Dexie cache l'image + le doc, sync au retour réseau.

### C. Permissions + visibilité

11. **Tokens MJ-only** ? Le MJ pose des tokens monstres « cachés » que les joueurs ne voient pas tant qu'il ne révèle pas.
12. **Maps multi-niveaux** ? Donjon avec étages → 1 doc par étage et navigation par tabs ? Ou 1 doc avec layers ?
13. **Activation de carte** ? Le MJ a 10 maps préparées, comment il « active » la carte du moment pour que tous les joueurs voient celle-ci ? Champ `activeMapId` sur la campagne ?
14. **Notes per-map** ? Le MJ veut épingler du texte (« la salle du trône » / « piège ici ») sur certaines coords ?

### D. Synchronisation temps réel

15. **Temps réel ou polling ?** Firestore `onSnapshot` est la voie naturelle (cf. CLAUDE.md « Real-time sync »). Bande passante : un déplacement de token = ~100 bytes, donc OK.
16. **Optimistic UI** ? Quand le MJ déplace un token, est-ce qu'il bouge instantanément côté MJ et est rollback en cas d'erreur Firestore, ou attend-on l'ACK ?
17. **Conflit de mouvement** ? 2 joueurs déplacent leur token simultanément → last-write-wins suffit ? Ou CRDT ?
18. **Throttling des mouvements** ? Drag continu de token = ~60 events/sec côté input. Throttle à 10 Hz pour Firestore (cost-control + UX) ?

### E. Intégration fiche personnage

19. **Token lié au PJ** ? Si oui : (a) le token affiche la portrait du PJ, (b) les PV s'affichent près du token, (c) le clic sur le token ouvre la fiche du PJ ?
20. **Tracking auto des PV** ? Un dégât appliqué côté fiche → diminution visible du token sur la carte (anneau coloré rouge → vert) ?
21. **Conditions affichées** ? Un PJ Étourdi → icône d'état sur son token ?
22. **Token MJ pour les PJ** ? Le MJ peut déplacer le token d'un joueur (autorité MJ = lockée dans CLAUDE.md → oui), mais le joueur peut-il déplacer son propre token aussi ?

### F. Outils MJ — édition d'une carte

23. **Édition à la souris vs édition par formulaire** ? Le MJ ajoute un token : drag-drop depuis une palette latérale, ou bouton « + Token » qui ouvre un formulaire ?
24. **Suppression d'un token** ? Click-droit menu contextuel, ou bouton corbeille au survol ?
25. **Renommage / changement de couleur en place** ? Modal dédiée ou inline editing ?

### G. Présentation joueur

26. **Vue joueur vs vue MJ** ? Vue joueur = pas d'accès aux outils d'édition, juste pan/zoom + voir ses propres déplacements. Vue MJ = palette complète.
27. **Caméra suivante** ? Le MJ peut « focus » la caméra des joueurs sur une zone (« regardez ICI ») → tous les joueurs centrent leur viewport ?

### H. Hors-sujet pour V1 mais à acter

28. **Sons / musique d'ambiance** ? Pas en V1, mais le modèle de données doit-il anticiper un champ `ambientSound` ?
29. **Initiative tracker visuel sur la carte** ? Liste des tokens dans l'ordre d'initiative à côté de la carte ?
30. **Animations** (un dragon qui bouge sa queue, des flammes…) ? Pas en V1 ; sprite GIF/PNG vs WebM ?

## 4. Roadmap technique (phases)

| Phase | Périmètre | Stack | Effort estimé |
| --- | --- | --- | --- |
| **Phase 1 (CETTE PR)** | Squelette `/map-proto` : import bg blob URL, 3 tokens cercles avec label, pan/zoom/drag, grille togglable. **Pas de persistance, pas de réseau.** | SVG + React | LIVRÉ. |
| **Phase 2 — modèle + persistance** | Schémas Zod `Map / Token / GridConfig`, Firestore collection `campaigns/{cid}/maps/{mid}`, CRUD MJ + sync `onSnapshot`. Image de fond Firebase Storage. Token = cercle coloré + label, pas encore d'image. Permissions MJ vs joueur. | SVG + Firebase + Dexie cache | ~5-7 jours plein temps. |
| **Phase 3 — fog of war** | Polygones MJ dessinés à la souris OU lignes de vue parsées depuis `.dd2vtt`. Switch « tout caché par défaut, le MJ révèle ». Vue joueur applique le fog. | SVG `<mask>` + polygon clipping | ~3-5 jours. |
| **Phase 4 — lumière dynamique** | Cercles de lumière (Bright/Dim/Darkness) attachés à un token. Conformément à D&D 5e. Combine avec le fog : seul ce qui est éclairé est visible. | SVG `<filter feGaussianBlur>` + `<mask>` composé | ~4-6 jours. Peut nécessiter migration Konva si SVG sature. |
| **Phase 5 — intégration fiche** | Token lié au PJ : portrait + PV + conditions affichées sur le token. Dégâts in-fiche → sync token. Click token → ouvre fiche. | React state coupling | ~3-4 jours. |
| **Phase 6 — outils MJ avancés** | Mesure de distance, templates AoE liés aux sorts cliqués, multi-maps navigation, notes épinglées. | UX work, pas de migration | ~5-7 jours. |
| **Phase 7 — V1 release** | Tests e2e, perf audit, accessibilité, doc utilisateur. | — | ~3 jours. |

**Total estimé V1 polish-ready : ~25-35 jours plein temps**, en supposant aucune migration de stack. Si phase 4 force la migration vers Konva, ajouter ~3-5 jours.

## 5. Anti-patterns évités dans le squelette

- ❌ Installation préventive de Pixi.js « parce qu'on en aura besoin un jour ». Le coût bundle est concret aujourd'hui pour 0 valeur en phase 1.
- ❌ Refactor du schéma `Character` pour anticiper le token. Phase 5 territory, pas phase 1.
- ❌ Mutation Firebase « pour tester ». Le proto vit 100 % en mémoire — un refresh = état initial. C'est volontaire.
- ❌ Synchronisation entre clients. Pas dans le scope phase 1, pas câblé.
- ❌ Tests cat. 4 / matrix sur le proto. C'est un terrain de discussion, pas un livrable de prod (cf. CLAUDE.md « Tests cat. 4 obligatoires sauf prototypes »).

## 6. Comment l'examiner

1. Lancer `pnpm dev` localement.
2. Aller sur `http://localhost:5173/map-proto` (pas listé au menu, accessible par URL uniquement).
3. Essayer :
   - Importer une image de fond (n'importe quel JPG/PNG du disque).
   - Déplacer les 3 tokens à la souris.
   - Molette pour zoomer/dézoomer.
   - Drag sur le fond pour pan.
   - Toggle grille.
   - Bouton « Réinitialiser ».
4. **Ne pas chercher de fonctionnalités absentes** — la liste à arbitrer ci-dessus est précisément le pourquoi ces fonctionnalités sont absentes.

## 7. Recommandation immédiate

1. **Liste prioritaire des arbitrages à trancher** : A1 (fog), A2 (lumière), A5 (AoE templates), B7 (Firestore), B8 (Storage hosting), D17 (conflit), E19 (token lié au PJ). Ces 7 décisions cadrent la phase 2 et bloquent le démarrage du vrai dev.
2. **Phase 2 démarre quand** ces 7 réponses + un mini-plan d'implémentation Phase 2 sont posés.
3. **Le proto restera accessible** à `/map-proto` jusqu'à ce que la phase 5 le remplace par le vrai mode carte.
