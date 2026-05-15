# Plan 27 — Handouts MJ→joueur

## Goal
DM creates handouts (image, text, or mixed Markdown+image), targets specific players or the whole party, sends them during a session. Players see a notification + can open the handout in a modal. Reveals tracked. Handouts persist in the campaign history.

## Context
Read `docs/DATA-MODEL.md`, `docs/PERMISSIONS.md`, `docs/EVENT-LOG.md`.

## Prerequisites
Plans 14-22 complete.

## Steps

### Data model + rules
- [ ] 1. Add to `docs/DATA-MODEL.md`:
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
- [ ] 2. Update `firestore.rules`: DM full write; players read where they are in `recipients` (or `recipients === 'all'`).
- [ ] 3. Update `firestore.indexes.json`: composite index on `createdAt DESC` + filter on recipients (collection group).

### DM creation UI
- [ ] 4. In DM dashboard, add a "Documents" panel and quick-action button.
- [ ] 5. `<HandoutCreateModal />`:
    - Title field
    - Type picker (Image / Texte / Les deux)
    - Image upload via Firebase Storage at `campaigns/{cid}/handouts/{hid}/image.{ext}` (max 5MB)
    - Markdown editor with preview
    - Recipient picker: "Tout le monde" or multi-select players
- [ ] 6. On send: writes the handout doc, logs `handout-sent` event (visibility per recipients).

### Player reception UI
- [ ] 7. Persistent listener (in app shell when active campaign set) on handouts where current user is recipient.
- [ ] 8. On new handout: toast notification "Le MJ vous a envoyé un document : {title}" with "Ouvrir" button.
- [ ] 9. `<HandoutViewer />` modal: title, image (zoomable), text (rendered Markdown). On open, adds user to `revealedTo` array.

### Handouts history
- [ ] 10. New tab in campaign view `/campaign/:id/handouts` listing all handouts the current user has received (or all, for DM). Chronological. Filter by sender / session.
- [ ] 11. DM can archive a handout (`visibility: 'archived'`) — stays in history, not in active feed.

### Event types
- [ ] 12. Add to `docs/EVENT-LOG.md`:
    - `handout-sent` (visibility: depends on recipients) — payload: handoutId, recipients
    - `handout-revealed` (visibility: 'all') — payload: handoutId, revealedByUserId

### Tests
- [ ] 13. Unit: rules enforce visibility correctly.
- [ ] 14. e2e: DM creates handout with image, targets one player, that player sees notification and can open; another player sees nothing.

### Final
- [ ] 15. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 16. Commit: `feat(dm-view): handouts MJ→player (plan 27)`

## Definition of Done
- [ ] Handouts collection + rules deployed
- [ ] DM creation flow works (image + text)
- [ ] Targeted players see notification + can open
- [ ] Non-targeted players cannot read
- [ ] History tab works
- [ ] Events logged correctly

## Notes for next plan
- Plan 28 (NPCs) shares the "DM-controlled visibility per player" pattern. Reuse the recipient picker UI.
