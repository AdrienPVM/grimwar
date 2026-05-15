# Plan 32 — Account management + GDPR

## Goal
Settings screen with email/password change, locale switcher, theme prefs, audio prefs, sign-out, **export my data** (GDPR), **delete account** (GDPR cascade). Cloud Functions for export and delete.

## Context
Read `docs/COMMERCIAL-READINESS.md` (GDPR foundations).

## Prerequisites
Sprint 5 plan 31 done.

## Steps

### Settings UI
- [ ] 1. Route `/settings` → `<SettingsScreen />`.
- [ ] 2. Sections:
    - **Profil**: displayName edit, photoURL upload (Firebase Storage)
    - **Compte**: email change (re-auth required), password change, email verification status, link Google
    - **Préférences**: locale, reducedMotion, soundOn, diceTheme, sheetDefaultMode
    - **Mes données**: "Exporter mes données" button, "Supprimer mon compte" button (red, requires confirmation)
- [ ] 3. Email change: re-auth flow (Firebase requires recent sign-in for email update). Sends verification to new email.
- [ ] 4. Password change: re-auth + `updatePassword`.
- [ ] 5. Link Google: `linkAnonymousToGoogle` for anonymous users; for already-Google users, no-op.

### Cloud Function: exportUserData
- [ ] 6. `functions/src/exportUserData.ts`:
    - HTTPS callable
    - Reads all user data: profile, characters, customContent, memberships (with derived campaign data), events the user authored.
    - Bundles into a JSON object.
    - Writes to Firebase Storage at `exports/{uid}/{timestamp}.json` (or a ZIP if data > 10MB).
    - Generates a signed URL (24h expiry).
    - Returns the URL.
- [ ] 7. Settings UI: click "Exporter mes données" → calls function, shows progress, displays download link when ready.

### Cloud Function: deleteUserAccount
- [ ] 8. `functions/src/deleteUserAccount.ts`:
    - HTTPS callable, requires re-auth check (verify caller signed in within last 5min)
    - Cascade delete:
      - All characters under `users/{uid}/characters/*`
      - All custom content under `users/{uid}/customContent/*`
      - All memberships (`collectionGroup('memberships').where('userId', '==', uid)`) — also remove the user's character from `presentInCampaigns` of remaining campaigns
      - If user is DM of any campaign: cascade-delete that campaign and all its subcollections (sessions, events, encounters, customContent, memberships, maps)
      - Auth user record (`admin.auth().deleteUser(uid)`)
    - Idempotent.
- [ ] 9. Settings UI: "Supprimer mon compte" → confirmation modal (type "SUPPRIMER" to confirm) → calls function → signs out + redirects to a "Au revoir" screen.

### Sessions management
- [ ] 10. Settings → Sessions tab: list active sessions (browsers). Use Firebase Auth session management.

### Tests
- [ ] 11. Cloud Function tests via emulator.
- [ ] 12. e2e: complete flow — create account, fill some data, export, delete account, verify all data gone.

### Final
- [ ] 13. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 14. Commit: `feat(account): settings + GDPR export & delete (plan 32)`

## Definition of Done
- [ ] All settings sections work
- [ ] Email/password change works with re-auth
- [ ] Export downloads ZIP/JSON of all user data
- [ ] Delete account cascades correctly and is irreversible
- [ ] Test cleared: deleted account's data truly gone from Firestore

## Notes for next plan
- Plan 33 adds the legal pages that link from settings.
