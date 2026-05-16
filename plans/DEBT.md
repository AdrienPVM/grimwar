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

## Conventions de ce registre

- Une dette = un bloc avec ID stable (`D1`, `D2`, …).
- `Owner` = plan numéroté qui doit livrer la résolution. Si la dette est sortie de scope, le marquer « décommissionné » et déplacer en bas de fichier.
- Toute mention dans un plan doit dire « voir `plans/DEBT.md > D<n>` » au lieu de redécrire la dette.
- Ne jamais supprimer une entrée résolue — la basculer en section `## Résolu` avec le hash du commit.

## Résolu

- **D2 — Point d'entrée S1 manquant** — résolu par commit `b522775` (`feat(library): library screen + nav shell (plan 13.6)`, 2026-05-16). Route `/` monte désormais une `<LibraryScreen />` réelle (query Firestore + grille de cards + empty state + CTA Créer), `<NavShell />` sticky persistant sur `/`, `/create`, `/character/:id`. Grep `Lyralei` / `letter="L"` / `hp={28}` / `hpMax={32}` à zéro dans le code de prod. Verrou de process « UAT navigateur obligatoire » ajouté à `CLAUDE.md`. Playwright (plan 13.5) à exécuter ensuite pour automatiser ce filet. Détails dans la section D2 ci-dessus.
