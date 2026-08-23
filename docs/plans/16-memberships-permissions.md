# Plan 16 — Memberships + permissions

## Goal
The full DM authority predicate works: a DM can edit any character that has joined their campaign. Security rules + client permissions helpers + UI affordances all aligned. Membership roster screen is functional.

## Context
Read `docs/PERMISSIONS.md` in full. Read `firestore.rules`.

## Prerequisites
Plans 14-15 complete.

## Steps

### Client permissions helpers
- [ ] 1. `src/shared/lib/permissions.ts`:
    - `isDMOf(user, campaign): boolean`
    - `isMemberOf(user, campaign, memberships): boolean`
    - `canEditCharacter(user, character, campaigns): boolean` — returns true if owner OR DM of a campaign in `character.presentInCampaigns`.
    - `canEditCharacterField(user, character, field, campaigns): boolean` — owner-locked fields: `'name'`, `'personality.*'`, `'homeCampaignId'`.
    - `canReadEvent(user, event, membership): boolean`
- [ ] 2. Hook `usePermissions(character)` — wraps the above with reactive context (current user + their memberships).

### Security rules — DM authority via Cloud Function (Admin SDK)
- [ ] 3. Direct client-side DM-authority writes on another user's character are NOT allowed by rules (Firestore can't reliably check cross-collection arrays). Instead:
- [ ] 4. Add Cloud Function `editPlayerCharacterAsDM`:
    - HTTPS callable
    - Input: `{ characterOwnerId, characterId, patch }`
    - Verifies App Check
    - Reads character, reads its `presentInCampaigns`, verifies the caller is DM of at least one of them
    - Filters `patch` to disallow owner-locked fields (`name`, `personality.*`, `homeCampaignId`)
    - Performs `updateDoc` via Admin SDK with `updatedBy: callerUid`
    - Logs a `dm-edit` event in the relevant campaign (the first campaign in `presentInCampaigns` where caller is DM)
    - Returns success

### Update `useUpdateCharacter` to route DM edits through Cloud Function
- [ ] 5. In `src/features/sheet/use-update-character.ts`:
    - If `currentUser.uid === character.userId` → direct Firestore write (as before).
    - If `canEditCharacter(user, character, campaigns) && !isOwner` → call `editPlayerCharacterAsDM` Cloud Function.
    - Optimistic update either way.

### Members roster screen
- [ ] 6. Route `/campaign/:id/members` → `<MembersList />`:
    - Reads `campaigns/{id}/memberships` collection.
    - Lists each member: avatar, displayName, role badge, character name + class + level (if any).
    - DM-only actions per member: change role, remove member.
    - Tap a player's character → navigates to that character's sheet (read-write because DM authority).
- [ ] 7. DM character sheet view: when DM opens a player's sheet, show a discrete "Édition MJ" indicator at the top (gold bar with shield icon) so it's clear they're using authority.

### UI affordances
- [ ] 8. In sheet modes, gray out / hide write actions when `canEdit === false` (read-only viewers).
- [ ] 9. Add a "Quitter la campagne" button in member profile (player only on own membership): sets `status: 'left'`, removes character from `presentInCampaigns`.

### Owner-locked fields enforcement
- [ ] 10. Cloud Function strips owner-locked fields from `patch` and returns a warning. Client shows toast: "Le MJ ne peut pas modifier le nom ou l'histoire — uniquement le joueur peut".
- [ ] 11. In the sheet UI, owner-locked fields visually marked (small lock icon when DM views).

### Tests
- [ ] 12. Cloud Function unit test (Firestore emulator).
- [ ] 13. e2e: 2-user scenario, DM edits player's HP (success), DM tries to edit player's name (blocked).

### Final
- [ ] 14. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 15. Commit: `feat(permissions): DM authority via Cloud Function + members roster (plan 16)`

## Definition of Done
- [ ] DM can edit any field on any campaign member's character (except owner-locked)
- [ ] Owner-locked fields rejected with clear feedback
- [ ] Members roster works, DM-only actions enforced
- [ ] Quitter la campagne works
- [ ] Cross-test verified: non-member can't read campaign data

## Notes for next plan
- Plan 17 (wizard creation) replaces the manual form from plan 05. Keep schema, replace UX.

## Inherited context (from plan 03/05/06 firestore fix, 2026-05)
- `firestore.rules` `characterShapeOK` was patched at the end of plan 05 to match the multi-class schema (`totalLevel`/`classes[]`/`primaryClassId`/`status`).
- Owner-locked field enforcement (`name`, `personality.*`, `homeCampaignId`) is **not** at the rule level — the rule denies all non-owner writes outright (S1). DM-authority edits route through the Cloud Function `editPlayerCharacterAsDM` (step 4), which is the correct place to filter owner-locked fields. **Don't add field-level rule lockdown** — would be redundant with the Cloud Function filter and would also block the owner.
- If post-v1 we ever allow direct DM writes from client (no Cloud Function), we'd need rule-level field-locks: `request.resource.data.name == resource.data.name` etc. for non-owner writers. Park.
