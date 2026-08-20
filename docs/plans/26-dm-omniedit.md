# Plan 26 — DM omniedit

## Goal
When the DM opens a player's character sheet, every field is editable inline (per `docs/PERMISSIONS.md` — full authority except `personality.*`, `name`, `homeCampaignId`). A discrete "Édition MJ" indicator confirms the mode. Every DM edit logs a `dm-edit` event.

## Context
Read plan 16 (DM authority routing), `docs/PERMISSIONS.md`.

## Prerequisites
Plans 16, 22.

## ⚠ Décision d'architecture — Voie B (rules-only), SUPERSEDE plan 16

Le plan tel qu'écrit (steps 4-5) supposait une **Cloud Function `editPlayerCharacterAsDM`** (plan 16). Celle-ci **n'a jamais été construite** (pas de `functions/`, pas de `firebase-functions`, rule write owner-only). Adrien (« avance à fond ») a validé la **Voie B « rules-only »** que j'ai recommandée : autorité MJ vérifiée *côté Firestore rules* via le pointeur unique `homeCampaignId` (A2), **sans Cloud Function ni plan Blaze**. Steps 4-5 réinterprétés en conséquence. Acté 2026-06-25 — cf. décision LOCKED « DM omni-edit » dans `CLAUDE.md` + `docs/PERMISSIONS.md`.

## Steps
- [x] 1. `usePermissions(character)` → `{ canEdit, isDM, isDMEdit, lockedFields }` (+ `ownerUid` porté par le contexte). `DM_LOCKED_FIELDS = ['name','personality','homeCampaignId']` + helper `useFieldLocked(field)`. (`permissions-context.tsx`)
- [x] 2. Barre dorée « Édition MJ » en tête de fiche quand `isDMEdit` (`DmEditBanner` dans `character-sheet.tsx`).
- [x] 3. Indicateur de verrou : cadenas « Réservé au joueur » sous le nom (`hero-card.tsx` via `useFieldLocked('name')`). NB : `name`/`personality` ne sont éditables nulle part dans la fiche aujourd'hui — la protection réelle est la **rule** ; le cadenas + la barre communiquent le verrou.
- [x] 4. **Voie B (au lieu d'une Cloud Function)** : `useUpdateCharacter` lit `ownerUid`/`isDMEdit`/`lockedFields` du contexte, route le write vers `users/{ownerUid}/...`, et garde-fou client sur les champs verrouillés. Rule `firestore.rules > allow update` = `gmCanReadLinkedCharacter` + `dmOmniEditLockedFieldsUnchanged()` (immuabilité name/personality/homeCampaignId). 8 tests rules-unit (ACCEPTE non-réservé, REFUSE name/personality/homeCampaignId, REFUSE non-MJ/ex-MJ/déliée, owner régression).
- [x] 5. **Journalisation client (au lieu de la Cloud Function)** : `logDmEdit(before, patch, characterId)` écrit UN event `dm-edit` (visibilité `all`, acteur null, `targetCharacterId`), payload `{ fieldsChanged, changes }` — before/after pour les scalaires, plafonné à 5, gros champs listés par nom. `useUpdateCharacter` l'appelle en omni-edit (jamais le diff sémantique).
- [x] 6. Feed d'activité MJ : `summarizeEvent`/`eventDetailRows` rendent `dm-edit` (« Édition MJ » + « N champ·s modifié·s » ; détail = libellés FR mappés + before→after). Hovercard = `EventDetailModal` existante.
- [x] 7. Onglet **Events** de l'écran de séance câblé (était un placeholder) : `SessionEventsTab` + `useSessionEvents` (query `(sessionId, visibility, createdAt)` — index déjà déclaré), filtre `Tous` / `Éditions MJ` côté client. Bonus : template `dm-edit` du compilateur de journal (`journal.tpl.dmEdit`).

### Tests
- [x] 8. e2e `campaigns-dm-omniedit-uat` : MJ ouvre la fiche d'un joueur lié → bandeau « Édition MJ » → baisse les PV (28→27, fiche reflète) → retour campagne → feed montre « Édition MJ » → détail liste « Points de vie ». Vert contre les vraies rules. (L'ancien `campaigns-dm-read-sheet.spec.ts` — premisse « lecture seule » désormais inversée — est supprimé, couvert par ce spec.)

### Final
- [x] 9. `pnpm typecheck && pnpm lint && pnpm test:fast` (2539) `&& pnpm test:matrix` (182) `&& pnpm test:rules` (107, +8 omni-edit) `&& pnpm test:e2e` (specs affectés verts) — tous verts.
- [ ] 10. Commit: `feat(dm-view): omniedit + audit trail (plan 26)`

## Definition of Done
- [x] DM can edit any non-locked field on any character in the campaign — rule + hook + UI omni-edit.
- [x] Lock indicator shown for owner-locked fields when DM views — cadenas nom + barre « Édition MJ ».
- [x] Every DM edit logs an event — `logDmEdit` → `dm-edit` (visibilité `all`).
- [x] Audit feed works — feed MJ + onglet Events de séance (filtre dm-edit) + journal.

## Notes for next plan
- **End of Sprint 3** — tag v0.0.3
- Plan 27 starts Sprint 4 with PixiJS map foundation
- **⚠ DEPLOY EN ATTENTE (action Adrien)** : la rule `allow update` omni-edit (plan 26) **doit être déployée** (`pnpm test:rules` puis `pnpm firebase:deploy:rules`) AVANT toute prod — sinon le MJ obtient `permission-denied` à l'écriture d'une fiche de joueur. Rejoint les rules/indexes déjà en attente des plans 23/24/25. L'index `(sessionId, visibility, createdAt)` consommé par l'onglet Events existe déjà sur disque (posé par le journal 25) — l'émulateur l'auto-crée, donc e2e valide ; déployer avec les autres indexes en attente (`pnpm firebase:deploy:indexes`).
- **Architecture** : `firebase-functions`/Blaze toujours absents et NON requis (Voie B). Toute future autorité MJ reste « client + rules » tant que le modèle du pointeur unique `homeCampaignId` tient (cf. décision LOCKED « DM omni-edit » dans CLAUDE.md).
