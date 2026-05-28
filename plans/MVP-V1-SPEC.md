# MVP V1 — Spec consolidée

**Status** : LOCKED (décisions tranchées 2026-05-28 par Adrien + Claude)
**Durée estimée** : 9-13 semaines de travail en sessions multiples
**Cadence UAT** : UAT consolidé final unique (décision Adrien, malgré reco Claude d'UAT par jalon)

---

## Vision

GrimWar V1 = VTT complet style Foundry/Roll20 (sans plugins) focalisé SRD 2024 FR, avec :
- Création de personnage et levelling L1→L20 strictement conformes SRD 2024
- Mode MJ avec pouvoirs étendus (édition fiches joueurs, création items, gestion campagne)
- Custom content import (toutes catégories) partagé en campagne
- Mode VTT carte avec fog, lumière, AoE, tokens liés PJ, initiative tracker MJ
- Propagation effets magic items + sorts buff/debuff
- Desktop pleinement supporté (pas un mobile redimensionné)

Cible : MJ + joueurs jouant **en présentiel autour d'une vraie table**, multi-device (chacun avec son matos).

---

## Décisions LOCKED

### Levelling V1
- Multiclassing **autorisé**, prérequis SRD respectés
- Respec **MJ uniquement** (joueur ne peut pas, MJ a un bouton "réinitialiser choix niveau X")
- 3 méthodes de génération de stats : point buy / 4d6 drop lowest / tableau standard 15-14-13-12-10-8
- Pour 4d6 : choix utilisateur entre "tirer dans l'app" ou "saisir manuellement"
- L1 à L20 supporté pour les 12 classes SRD 2024
- Sous-classes au niveau approprié (L3 pour la plupart des classes SRD 2024)
- ASI/feat à 4/8/12/16/19
- Tous les prérequis SRD durs (impossibilité de choisir un truc sans le prérequis)

### Mode MJ V1
- Plusieurs MJ possibles par campagne (co-MJ, rôle additif)
- MJ a pouvoirs d'édition totaux sur fiches joueurs (stats, inventaire, sorts, PV, conditions, tout)
- Joueur voit uniquement sa propre fiche (zéro visibilité sur autres joueurs)
- MJ a écran "Joueurs de la campagne" avec accès à toutes les fiches
- Firestore Rules : rôle `gm` (MJ) vs `member` (joueur)

### Custom content import V1
- Catégories importables : **toutes** (races, classes, sous-classes, feats, sorts, items, monstres, magic-items, backgrounds)
- Méthodes d'injection : **upload JSON + UI in-app** (les deux)
- Visibilité : contenu custom **partagé par tous les joueurs** de la campagne (apparaît dans leurs choix création/level-up comme s'il était SRD)
- Implication architecturale **majeure** : le système levelling/création doit être agnostique de la source. Pas de hardcoding "12 classes SRD". Moteur opère sur `srd-content + custom-content[campaign]`.

### VTT et carte V1
- Par défaut : joueurs voient/déplacent leur token uniquement, MJ contrôle tout
- Toggle MJ "mode contrôlé" : passe joueurs en lecture seule (seul MJ déplace tokens). Persistant sur la map, basculable en cours de partie.
- Features VTT V1 : fog of war (auto-révélé) + lumière dynamique + AoE templates + tokens liés PJ avec portrait/PV/conditions + initiative tracker MJ (suivi simple, pas combat auto) + mesure distance + layers togglables MJ/joueur + undo/redo + mini-map + grid snap + notes par token

### Propagation effets V1
- Magic items équipés : effets appliqués automatiquement (bonus stats, AC, résistances, vitesse, sauves, etc.)
- Sorts buff/debuff : appliqués auto à l'activation, retirés à expiration ou dispel
- Moteur d'effets actifs central qui recalcule la fiche dérivée à chaque changement
- **Stratégie d'implémentation** : commencer par cas simples (bonus statiques additifs) → étendre aux cas complexes (dés bonus, avantage conditionnel, multi-couches). Si périmètre trop large à la livraison, GSD documente ce qui est livré vs reporté en V1.1.

### Architecture transverse
- Langue : **français uniquement V1**, infrastructure prête multilingue (i18n keys, bundle bilingue nameEn déjà présent)
- Mode offline : **nécessaire V1**. Lecture seule + édition en cache, sync à reconnexion. Architecture offline-first via Dexie + Firestore + sync queue.
- Personnages **multi-campagnes** : un perso vit dans `users/{uid}/characters/{cid}`, invitable à plusieurs campagnes

---

## Jalons V1

1. **JALON 1 — Fondations restantes** (~1-2 semaines)
   - 1A : Sheet desktop complet (5 modes : Identité, Combat, Magie, Essence, Avoir) — étend les prototypes PR #19/#27
   - 1B : Magic items effects propagation v0 (cas simples : bonus statiques additifs). Moteur d'effets actifs central + recalcul fiche dérivée. Étend pattern computeDisplayedAc 13.14b.
   - 1C : Mode MJ niveau 1 — voir fiches joueurs en lecture seule. Firestore Rules rôles `gm` vs `member`.
   - 1D : Mode offline lecture seule via Dexie + sync queue à reconnexion.

2. **JALON 2 — Levelling strict L1-L20** (~2-3 semaines, +1 sem pour multiclassing)
   - 2A : Refactor du système de création de personnage pour être agnostique de la source (préparation custom content)
   - 2B : Système level-up L2→L20, 12 classes SRD, sous-classes choosers
   - 2C : ASI/feat à 4/8/12/16/19, tous les prérequis durs Zod
   - 2D : Multiclassing avec prérequis SRD (slots multiclass, etc.)
   - 2E : 3 méthodes génération stats (point buy / 4d6 / tableau standard, choix tirage app vs manuel)

3. **JALON 3 — Custom content import** (~2 semaines)
   - 3A : Schéma module custom (TypeScript + Zod, 9 catégories)
   - 3B : Upload JSON + validation
   - 3C : UI in-app de création par catégorie (9 formulaires)
   - 3D : Injection en campagne + partage joueurs

4. **JALON 4 — Mode MJ complet** (~1-2 semaines)
   - 4A : Édition complète fiches joueurs par MJ (tous champs)
   - 4B : Création d'items custom in-app + distribution aux joueurs
   - 4C : Permissions Firestore étendues, co-MJ multiples

5. **JALON 5 — VTT Foundry-level** (~2-3 semaines)
   - 5A : UI gestion maps (créer/lister/supprimer/dupliquer)
   - 5B : UI gestion tokens (drag-and-drop depuis fiches PJ, tokens liés)
   - 5C : Initiative tracker MJ
   - 5D : Mesure distance, layers togglables, toggle "mode contrôlé"
   - 5E : Undo/redo, mini-map, grid snap, notes par token

6. **JALON 6 — Effets actifs sorts** (~1-2 semaines)
   - 6A : Moteur d'effets étendu sorts buff/debuff
   - 6B : Application/expiration auto, tracking durée
   - 6C : Intégration recalcul fiche dérivée

**Total estimé** : 9-13 semaines

---

## Hors V1 (V1.1 ou V2)

- VTT temps réel avancé (sons d'ambiance, macros, etc.)
- Combat auto avec jets de dés (joueurs jouent IRL, app fait suivi seulement en V1)
- Effets actifs cas très complexes (dés bonus, avantage conditionnel multi-couches — pourrait être V1.1 si périmètre trop large)
- Multilingue activé (infrastructure y est, activation = V2)
- Application mobile native (PWA suffit V1)
- Marketplace de modules custom (V2)
- Intégration D&D Beyond (V2)
- Combat tour-par-tour automatisé (V2)

---

## Process de développement

- Découpage en plans tracer-bullet (1 plan = 1 PR mergée propre)
- Chaque plan : branche dédiée → quadruple gate Node 22 → PR draft → CI 5/5 verte → merge avec merge-commit → protected-paths-guard vert → rapport intermédiaire factuel
- Rapports intermédiaires factuels après chaque PR mergée (PR number, SHA, git diff --stat, tests verts, dettes ouvertes/résolues)
- Tracer toute nouvelle dette dans plans/DEBT.md
- Conventions d'arrêt : collision SRD irréconciliable / décision UX majeure non couverte par cette spec / quadruple gate échoue 3 fois / signal de saturation contexte
- Si saturation contexte : arrêt propre avec working tree clean, recommandation session fraîche
- UAT : consolidé final unique à la livraison complète du V1 (décision Adrien). Pas d'UAT intermédiaire de la part d'Adrien. Tu produis quand même les captures UAT dans uat-review/ pour chaque PR qui touche au visuel, regroupées par jalon dans uat-review/jalon-N/, mais Adrien ne les vérifie pas en temps réel.
