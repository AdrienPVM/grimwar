# Plan 03 — Firebase setup

## Goal

Firebase backend live: Auth (anonymous + Google + email), Firestore in **europe-west1** with security rules deployed, App Check active for rate limiting, env config managed. After this plan, the app auto-signs-in anonymously on load and can read/write the user's own test document.

## Context

Read:
- `docs/DATA-MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/COMMERCIAL-READINESS.md`
- `CLAUDE.md` (Firebase decisions in decision log)
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`

## Prerequisites

- Plan 01 complete
- **Adrien manual steps** (Claude Code stops here until done):
    1. Create Firebase project at console.firebase.google.com named "grimwar"
    2. Enable Auth providers: Email/Password, Google, Anonymous
    3. Create Firestore database — **production mode**, region **eur3 (Europe multi-region) OR europe-west1** (eu-west1 preferred for cost)
    4. Enable App Check (reCAPTCHA v3 for web)
    5. Generate web app config from Project Settings → General → Your apps → Add web app
    6. Paste config into `.env.local` (copy from `.env.example`)
    7. Confirm to Claude Code: "Firebase ready, env filled"

## Steps

- [ ] 1. Verify `.env.local` contains all `VITE_FIREBASE_*` keys. If any missing, BLOCK and ask Adrien.
- [ ] 2. Install Firebase CLI globally if not present: `npm i -g firebase-tools`. Then `firebase login`.
- [ ] 3. From project root: `cp .firebaserc.example .firebaserc` and replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID` with the actual project ID.
- [ ] 4. Run `firebase use` to verify the project alias works.

### Env validation
- [ ] 5. Create `src/shared/lib/env.ts` that:
    - Reads all `VITE_FIREBASE_*` from `import.meta.env`
    - Throws a clear error on missing required keys (all except `VITE_FIREBASE_MEASUREMENT_ID` are required)
    - Exports typed `env` const

### Firebase SDK init
- [ ] 6. Create `src/shared/lib/firebase.ts`:
    - Initialize Firebase app
    - Init Auth, Firestore
    - **Enable Firestore IndexedDB persistence** (`enableIndexedDbPersistence`)
    - Init **App Check** with ReCaptchaV3Provider (read site key from `VITE_RECAPTCHA_SITE_KEY` — add to `.env.example`)
    - Export typed helpers:
      - `signInAnonymouslyAndPersist()`
      - `signInWithGoogle()` (uses `signInWithPopup`)
      - `signInWithEmail(email, password)` / `signUpWithEmail(email, password)`
      - `linkAnonymousToGoogle()` / `linkAnonymousToEmail(email, password)`
      - `signOutCurrentUser()`
      - `sendPasswordResetEmail(email)`
      - `sendEmailVerification()` after sign-up

### Auth provider
- [ ] 7. Create `src/features/auth/auth-provider.tsx`:
    - Wraps app
    - Subscribes to `onAuthStateChanged`
    - If no user after init, calls `signInAnonymouslyAndPersist()` once
    - Writes user state into Zustand `authSlice`
    - Renders `null` (or splash) while `!isReady`
- [ ] 8. Create `src/features/auth/use-auth.ts`:
    - Returns `{ user, isAnonymous, isReady, signInWithGoogle, signInWithEmail, signUpWithEmail, linkToGoogle, linkToEmail, signOut, sendPasswordReset }`
- [ ] 9. Create `src/shared/lib/slices/auth-slice.ts` (Zustand):
    - State: `user: AuthUser | null, isAnonymous: boolean, isReady: boolean`
    - Actions: `setUser(user)`, `setReady(ready)`
- [ ] 10. Mount `<AuthProvider>` in `src/App.tsx` wrapping all routes. Show a splash (GrimWar title + small loading text) while `!isReady`.

### Verify auth works
- [ ] 11. Run `pnpm dev`. Open browser → app auto-signs-in anonymously. Open Firebase Console → Authentication → Users tab — confirm an anonymous user appears within seconds.
- [ ] 12. Reload page — same anonymous UID persists (default Firebase behaviour).
- [ ] 13. Add a temporary "Sign in with Google" button in `<App>` for testing. Click → upgrades to Google. Verify in Console: same UID, now has Google credentials linked.
- [ ] 14. Remove the temp button.

### Firestore — basic write test
- [ ] 15. Deploy security rules: `pnpm firebase:deploy:rules`
- [ ] 16. Deploy indexes: `pnpm firebase:deploy:indexes`
- [ ] 17. Add a temp button in `<App>` that writes to `users/{uid}/characters/test-write`. Click. Confirm doc appears in Firestore Console.
- [ ] 18. Try writing to `users/{anotherUid}/characters/test` — should fail with `permission-denied`. (Manually craft the call in browser console.)
- [ ] 19. Remove temp button.

### Dexie
- [ ] 20. Create `src/shared/lib/dexie-db.ts` per `docs/DATA-MODEL.md`:
    - Tables: `content`, `diceHistory`, `settings`
    - Versioned with `version(1)`.
- [ ] 21. Create `src/shared/lib/content-loader.ts`:
    - `loadPublicContent(type)` → fetches `/data/${type}.json`, caches in Dexie, returns
    - On subsequent calls, returns from Dexie if fresh (< 7 days)
- [ ] 22. Add empty `public/data/spells.json` (`{}`) to avoid 404. Content fills it in plan 04.

### i18n + locale slice (lightweight, full impl in plan 04+)
- [ ] 23. Create `src/shared/lib/slices/locale-slice.ts`:
    - State: `locale: 'fr' | 'en'`
    - Action: `setLocale(locale)`
    - Defaults to `'fr'`
- [ ] 24. Create `src/shared/lib/i18n.ts` with minimal `STRINGS` (just keys needed for splash + sign-in placeholder). Export `t(key)` and `localize(value, locale)`.

### Checkpoint
- [ ] 25. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 26. Commit: `feat(firebase): auth + firestore + app-check + dexie + i18n scaffold (plan 03)`

## Definition of Done

- [ ] All 26 steps checked
- [ ] Anonymous user auto-signed-in on app load (verified in Firebase Console)
- [ ] User can upgrade to Google with `linkAnonymousToGoogle()` (UID preserved)
- [ ] User can upgrade to Email/password with `linkAnonymousToEmail()` (UID preserved)
- [ ] Firestore rules deployed; write to another user's doc denied
- [ ] App Check enabled and not blocking legitimate requests
- [ ] Dexie initialized, content-loader works for empty JSON
- [ ] Locale slice + i18n.ts scaffolded with FR default
- [ ] Env vars all required at runtime; missing one throws clear error
- [ ] `pnpm typecheck && pnpm test && pnpm lint` green

## Notes for next plan

- Plan 04 (content pipeline) writes the real `public/data/*.json` files.
- Plan 04 also fills out `i18n.ts` `STRINGS` map for UI strings discovered along the way.
- DMG content upload script (plan 04 step 17+) needs the Firebase Admin SDK service account key — Adrien generates it in Project Settings → Service Accounts and saves to `firebase-adminsdk-private.json` (gitignored, exclusion already in `.gitignore`).
- Cloud Functions (S2 plan 15) for invite code generation will reuse the App Check token verification.
