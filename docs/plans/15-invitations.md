# Plan 15 — Invitation system

## Goal
DM generates a shareable link + 6-char invite code from the campaign settings. Players land on `/join/:code`, are prompted to upgrade their anonymous account if needed, then join with a character of their choice.

## Context
Read `docs/COMMERCIAL-READINESS.md` (invitation security), `docs/DATA-MODEL.md` (`inviteCodes` + `memberships`).

## Prerequisites
Plan 14 complete.

## Steps

### Cloud Function: createInviteCode
- [ ] 1. Init `functions/` directory if not present (`firebase init functions`, TypeScript).
- [ ] 2. Write `functions/src/createInviteCode.ts`:
    - HTTPS callable, verifies App Check token
    - Input: `{ campaignId, maxUses?, expiresInDays? }`
    - Validates caller is DM of campaignId
    - Generates 6-char code from `[A-Z2-9]` (no ambiguous chars like 0/O/1/I), retries up to 5x if collision
    - Generates random URL token (32 chars) for the long link
    - Writes `inviteCodes/{code}` doc
    - Returns `{ code, inviteUrl }`
- [ ] 3. Deploy: `pnpm firebase:deploy:functions`.

### Invite panel UI
- [ ] 4. Route `/campaign/:id/invite` → `<InvitePanel />`:
    - "Générer un code" button (DM only) → calls Cloud Function, displays the code + shareable URL (`https://grimwar.app/join/${code}`).
    - Copy-to-clipboard buttons.
    - QR code (use `qrcode.react` — add to deps if missing) for in-person sharing.
    - List of existing active invite codes for the campaign with uses count, expiry, revoke button.

### Cloud Function: acceptInvite
- [ ] 5. Write `functions/src/acceptInvite.ts`:
    - HTTPS callable
    - Input: `{ code, characterId | null, role: 'player' | 'spectator' }`
    - Validates: code exists, not expired, uses < maxUses (if set), caller is signed in
    - If character provided, validates ownership + adds campaignId to `presentInCampaigns`
    - Creates `campaigns/{campaignId}/memberships/{uid}` with the role, characterId, status: 'active', joinedAt: serverTimestamp
    - Increments `uses` on the invite code
    - Returns `{ campaignId }`

### Join screen
- [ ] 6. Route `/join/:code` → `<JoinByCodeScreen />`:
    - Fetches `inviteCodes/{code}` to get campaignId + DM info preview (campaign name, DM displayName).
    - If code invalid/expired: error state.
    - If user is anonymous: show "Continue with Google" / "Continue with Email" upgrade buttons before joining. Account upgrade via `linkAnonymousToGoogle` / `linkAnonymousToEmail` — UID preserved.
    - If user already has characters: dropdown to pick which character to bring. "Aucun pour l'instant" option = join as spectator OR create a new character (links to `/create` with return URL).
    - "Rejoindre la campagne" button → calls `acceptInvite` Cloud Function, navigates to `/campaign/${campaignId}` on success.

### Manual code entry
- [ ] 7. Library screen: add a "Rejoindre par code" button → modal with 6-char code input → on submit, navigates to `/join/${code}`.

### Tests
- [ ] 8. Integration test for Cloud Function (use Firebase Emulator Suite).
- [ ] 9. e2e: DM creates campaign + code; second user joins via code + character; both see each other in the members list.

### Final
- [ ] 10. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 11. Commit: `feat(invitations): code + link generation, join flow (plan 15)`

## Definition of Done
- [ ] Cloud Functions deployed
- [ ] DM creates code from invite panel
- [ ] New user (anonymous) can join via link, upgrades account, brings character
- [ ] Existing user joins via code from library
- [ ] Both users see each other in `/campaign/:id/members`
- [ ] Cross-account isolation verified (non-member can't see campaign)

## Notes for next plan
- Plan 16 expands security rules for DM authority on character writes, using the membership data this plan creates.
