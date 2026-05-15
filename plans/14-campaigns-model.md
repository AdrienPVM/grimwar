# Plan 14 — Campaigns model

## Goal
The `campaigns` collection exists with settings + status + invite code generation. Adrien can create a campaign from `/campaigns/new`, becomes its DM, sees it in the library. The data model supports memberships, but invitations come in plan 15.

## Context
Read `docs/DATA-MODEL.md` (Campaign schema + memberships), `docs/PERMISSIONS.md`, `docs/COMMERCIAL-READINESS.md`.

## Prerequisites
Sprint 1 complete (plans 01-13).

## Steps
- [ ] 1. Types: `src/shared/types/campaign.ts` — Campaign, Membership, CampaignSettings, MembershipRole.
- [ ] 2. Zod schemas in same file.
- [ ] 3. Data layer hooks `src/features/campaigns/use-campaign.ts`, `use-my-campaigns.ts`, `use-membership.ts`.
- [ ] 4. Zustand slice `active-campaign-slice.ts`: tracks the currently focused campaign (set when user opens `/campaign/:id`).
- [ ] 5. Route `/campaigns/new` → `<CampaignCreateScreen />`:
    - Form: name, description, language (FR default), startingLevel (1).
    - **Variants section** (collapsible "Règles maison" panel): 4 toggles bound to `settings.variants.{featAtLevel1, flanking, slowHealing, grittyRealism}`, all default `false`. Each toggle has a one-line FR explanation tooltip ("Feats au niveau 1 — chaque PJ commence avec un don supplémentaire"…).
    - On submit: writes `campaigns/{newId}` with `dmUserId = currentUser.uid, status: 'active', schemaVersion: 1, inviteCode/inviteToken: ''` (filled in plan 15).
    - Creates own membership: `campaigns/{newId}/memberships/{uid}` with `role: 'dm'`.
    - Navigates to `/campaign/${newId}`.
- [ ] 6. Route `/campaign/:id` → `<CampaignScreen />` with child routes (overview, members, invite placeholder, settings).
- [ ] 7. Library screen update: add "Mes campagnes" section above characters, listing campaigns where current user has a membership (use `useMyMemberships()`).
- [ ] 8. Campaign settings screen `/campaign/:id/settings`: edit name, description, language, allowHomebrew, startingLevel, status (active/paused/archived). DM only.
- [ ] 9. Security rules check: redeploy `firestore.rules` (already covers campaigns). Test cross-user isolation manually with 2 accounts.
- [ ] 10. e2e: create a campaign, see it in library, switch to settings, edit name, see in library updated.
- [ ] 11. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 12. Commit: `feat(campaigns): model + create + settings (plan 14)`

## Definition of Done
- [ ] Adrien can create a campaign
- [ ] Campaign appears in his library
- [ ] DM-only edits enforced by rules (verify with 2nd account read-only access)
- [ ] `pnpm typecheck && pnpm test && pnpm lint` green

## Notes for next plan
- Plan 15 (invitations) adds the `inviteCode` generation Cloud Function.
- Plan 16 (memberships+permissions) wires the DM authority predicate for character writes.
