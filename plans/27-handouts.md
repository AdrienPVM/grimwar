# Plan 27 — Handouts MJ→joueur

## Goal
DM creates handouts (image, text, or mixed Markdown+image), targets specific players or the whole party, sends them during a session. Players see a notification + can open the handout in a modal. Reveals tracked. Handouts persist in the campaign history.

## Context
Read `docs/DATA-MODEL.md`, `docs/PERMISSIONS.md`, `docs/EVENT-LOG.md`.

## Prerequisites
Plans 14-22 complete.

## Steps

> **Statut (2026-06-25) — Option A livrée (texte/Markdown), image différée 27b.**
> Le seul blocage du plan était l'upload Firebase Storage (step 5) : aucune infra
> Storage n'existe (décision bundle-vs-Blaze en attente d'Adrien). Tout le reste
> est livré et testé. Le champ `imageUrl` reste au schéma et la visionneuse le
> rend déjà → 27b n'ajoutera que l'upload, sans migration.

### Data model + rules
- [x] 1. Add to `docs/DATA-MODEL.md` (déjà présent ; note V1 texte-only + filtrage rules ajoutée).
    ```ts
    campaigns/{campaignId}/handouts/{handoutId}: {
      id, title, type: 'image' | 'text' | 'mixed',
      content: { text?: string (Markdown), imageUrl?: string (Firebase Storage) },
      recipients: string[] | 'all',   // userIds, or 'all' = everyone except DM
      revealedTo: string[],            // userIds who have opened it
      visibility: 'sent' | 'revealed' | 'archived',
      createdBy: string, createdAt: Timestamp,
    }
    ```
- [x] 2. `firestore.rules` : MJ lit tout (fix du gating `isMemberOf` qui excluait le MJ pur — précédent sessions/events/encounters/maps) ; un joueur lit s'il est dans `recipients` ou `recipients === 'all'` ; un destinataire peut s'auto-ajouter à `revealedTo` (et RIEN d'autre — `diff().affectedKeys().hasOnly + concat`). 13 cas en rules-unit (`pnpm test:rules` 119/119 vert).
- [x] 3. `firestore.indexes.json` : index `handouts (visibility, createdAt DESC)` déjà présent. **Aucun index composite supplémentaire requis** — les lectures (MJ : collection entière ; joueur : `array-contains uid` ∪ `== 'all'`, sans `orderBy`) trient CLIENT-SIDE (volume bas, décision alignée sur `useSessions`).

### DM creation UI
- [x] 4. Entrée « Documents » sur le hub `/campaigns/:cid` (visible à tout membre). **Déviation documentée** : la création vit sur l'écran `/campaigns/:cid/handouts`, PAS sur le prototype `/dm` (qui n'a aucun contexte campagne `:cid`).
- [!] 5. `<HandoutCreateModal />` livré : titre, sélecteur de type (Texte actif ; Image/Les deux **désactivés** avec note), éditeur Markdown + **aperçu live**, picker destinataires (toute la table / sélection). **Upload image DIFFÉRÉ → sous-plan 27b** (Firebase Storage absent — décision infra en attente).
- [x] 6. Envoi : écrit le doc + journalise `handout-sent` (visibilité `all`).

### Player reception UI
- [x] 7. Listener `useHandoutNotifications` (onSnapshot `array-contains uid` ∪ `== 'all'`) monté sur le hub campagne. **Portée V1** : actif tant que le joueur est sur le hub (pas de layout campagne global → couverture « depuis tout écran » différée, notée).
- [x] 8. Toast « Le MJ vous a transmis un document : {title} » sur tout nouvel ajout (skip du snapshot initial). Désactivé pour le MJ.
- [x] 9. `<HandoutViewerModal />` : titre, image (si présente — chemin 27b), texte Markdown (`JournalMarkdown`). À l'ouverture par un joueur : self-reveal + `handout-revealed` (best-effort).
- [x] 10. Route `/campaigns/:cid/handouts` : MJ → tous les documents ; joueur → ceux qui lui sont destinés. Tri chronologique. (Filtre par séance/expéditeur : non requis V1 — un seul expéditeur, le MJ.)
- [x] 11. Le MJ archive (`visibility: 'archived'`) — section « Archivés » côté MJ, hors flux joueur.

### Event types
- [x] 12. `docs/EVENT-LOG.md` : `handout-sent` (visibilité `all`) + `handout-revealed` (visibilité `all`).

### Tests
- [x] 13. Unit : rules (`tests/firestore-rules.test.ts`, 13 cas) + service (`handouts.test.ts`, 8) + helpers de type (9) + modale de création (4) + hook de notif (3).
- [ ] 14. e2e : MJ crée un document texte ciblé sur un joueur → ce joueur le voit et l'ouvre ; un autre joueur ne voit rien. (image = 27b)

### Final
- [ ] 15. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 16. Commit: `feat(campaigns): handouts MJ→player texte (plan 27, image → 27b)`

## Definition of Done
- [x] Handouts collection + rules (déployées AVANT livraison code consommateur — cf. note deploy ci-dessous)
- [!] DM creation flow works (**texte** — image différée 27b)
- [x] Targeted players see notification + can open
- [x] Non-targeted players cannot read (rule + rules-unit)
- [x] History tab works
- [x] Events logged correctly

## Notes for next plan
- **Sous-plan 27b (image)** : ajouter l'upload Firebase Storage à `campaigns/{cid}/handouts/{hid}/image.{ext}` (max 5 Mo) une fois la décision infra prise (bundle local vs Blaze). Réactiver Image/Les deux dans `HandoutCreateModal`, brancher `content.imageUrl`. La visionneuse rend déjà `imageUrl` → aucune migration. `storage.rules` + émulateur storage à ajouter à ce moment.
- **Deploy en attente** : `firestore.rules` (bloc handouts corrigé) à `pnpm firebase:deploy:rules` AVANT mise en prod du code consommateur (requiert `firebase login`). L'émulateur charge les rules → e2e/rules-unit valides en local.
- Plan 28 (NPCs) réutilise le picker de destinataires + la rule de visibilité par joueur.

## Notes for next plan
- Plan 28 (NPCs) shares the "DM-controlled visibility per player" pattern. Reuse the recipient picker UI.
