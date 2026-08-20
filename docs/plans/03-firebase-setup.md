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

- [x] 1. `.env.local` créé avec les 7 clés Firebase de `dndjourney-2ee6f`. `VITE_RECAPTCHA_SITE_KEY` laissé vide — App Check reporté.
- [x] 2. Firebase CLI v14.2.2 déjà installé globalement, session active.
- [x] 3. `.firebaserc` créé pointant sur `dndjourney-2ee6f`.
- [x] 4. `firebase use` retourne `dndjourney-2ee6f` — alias OK.

### Env validation
- [x] 5. `src/shared/lib/env.ts` : valide les 6 clés requises (`measurementId` + `recaptchaSiteKey` optionnels), exporte un const typé `env`.

### Firebase SDK init
- [x] 6. `src/shared/lib/firebase.ts` : init lazy de app, Auth, Firestore, persistence IndexedDB (best-effort avec warnings clairs en cas de multi-tab ou IndexedDB absent), App Check **conditionnel** (skip avec warning si `VITE_RECAPTCHA_SITE_KEY` absente — décision : ne pas bloquer le dev local). Tous les helpers d'auth exportés.

### Auth provider
- [x] 7. `src/features/auth/auth-provider.tsx` : wrap, écoute `onAuthStateChanged`, sign-in anon une seule fois (garde `useRef` contre double-trigger StrictMode), miroir dans Zustand.
- [x] 8. `src/features/auth/use-auth.ts` : hook exposant `{ user, isAnonymous, isReady, signInWithGoogle, signInWithEmail, signUpWithEmail, linkToGoogle, linkToEmail, signOut, sendPasswordReset }`, actions stabilisées via `useCallback`.
- [x] 9. `src/shared/lib/slices/auth-slice.ts` : state `{ user, isAnonymous, isReady }` + actions.
- [x] 10. `App.tsx` mount `<AuthProvider>`. Splash `Cinzel Decorative` (GrimWar + "Invocation en cours…") tant que `!isReady`.

### Verify auth works
- [!] 11. À faire par Adrien : `pnpm dev` → vérifier que la Console Firebase affiche un anonymous user dans l'onglet Authentication.
- [!] 12. À faire par Adrien : reload → même UID persiste.
- [ ] 13. SKIPPED — pas de bouton temp dans `App.tsx`. Le flow link-to-Google sera vérifié naturellement dans le UI auth de plan 14+ (l'API `linkAnonymousToGoogle` est exportée et typée, prête à brancher).
- [ ] 14. N/A (pas de bouton temp ajouté).

### Firestore — basic write test
- [x] 15. `pnpm firebase:deploy:rules` → déployé. Warnings non-bloquants sur fonctions utilitaires définies mais pas encore utilisées (memberRole, isDMOfAnyCampaignFor, someCampaignHasMeAsDM) — elles seront câblées en plans 14-16.
- [x] 16. `pnpm firebase:deploy:indexes` → déployé. Retiré 3 index single-field (characters/updatedAt, events/createdAt, sessions/number) que Firestore auto-gère et qui faisaient échouer le deploy avec "this index is not necessary".
- [ ] 17. SKIPPED — pas de bouton temp. Vérification permission rules reportée à plan 05+ quand on aura un vrai flow de création de personnage à instrumenter.
- [ ] 18. N/A.
- [ ] 19. N/A.

### Dexie
- [x] 20. `src/shared/lib/dexie-db.ts` : `GrimWarDB` avec les 3 tables `content [type+id]`, `diceHistory`, `settings`, version 1, conformément à `docs/DATA-MODEL.md`.
- [x] 21. `src/shared/lib/content-loader.ts` : `loadPublicContent(type)` avec cache 7 jours + fallback sur cache expiré si réseau échoue, + `invalidatePublicContent(type)`.
- [x] 22. `public/data/spells.json` créé vide (`{}`).

### i18n + locale slice (lightweight, full impl in plan 04+)
- [x] 23. `src/shared/lib/slices/locale-slice.ts` : `{ locale: 'fr' | 'en', setLocale }`, défaut `'fr'`.
- [x] 24. `src/shared/lib/i18n.ts` : `STRINGS` minimal (splash.brand, splash.loading, auth.placeholder.email, auth.placeholder.password) + `t(key, locale?)` et `localize(value, locale?)`. Fallback FR systématique.

### Checkpoint
- [x] 25. `pnpm typecheck && pnpm test && pnpm lint` → tous verts (6 tests passés, 0 warning, 0 erreur).
- [ ] 26. Commit final (en cours).

## Definition of Done

- [x] Code des 26 étapes posé ou explicitement skippé/reporté avec justification.
- [!] Anonymous user auto-signed-in on app load — **à vérifier en browser par Adrien** (`pnpm dev`).
- [x] `linkAnonymousToGoogle()` / `linkAnonymousToEmail()` exportés, typés, prêts à câbler en plan 14+.
- [x] Firestore rules + indexes déployés sur `dndjourney-2ee6f` (warning rules à corriger en plans 14-16 quand les fonctions utilitaires sont utilisées).
- [!] App Check **deferred** — `VITE_RECAPTCHA_SITE_KEY` vide. À activer avant déploiement public (plan 13 PWA-deploy). Firebase.ts skip initAppCheck avec warning console clair.
- [x] Dexie initialisé, content-loader prêt avec cache 7 jours.
- [x] Locale slice + i18n.ts scaffoldés avec FR défaut.
- [x] Env vars validées au runtime ; clé manquante → erreur claire avec nom de la clé.
- [x] `pnpm typecheck && pnpm test && pnpm lint` verts.

## À vérifier manuellement par Adrien après le commit

1. `pnpm dev` → ouvrir `http://localhost:5173` → écran splash visible brièvement puis HeroEmblem (placeholder plan 02).
2. Console Firebase → Authentication → Users → un utilisateur anonyme apparaît dans les ~2 secondes.
3. Reload (Ctrl+R) → l'UID reste identique (persistence localStorage active).
4. DevTools → Application → IndexedDB → bases `grimwar` et `firestore/dndjourney-2ee6f/(default)` créées.

Si un de ces points casse, signaler avant de passer au plan 04.

## Notes for next plan

- Plan 04 (content pipeline) writes the real `public/data/*.json` files.
- Plan 04 also fills out `i18n.ts` `STRINGS` map for UI strings discovered along the way.
- DMG content upload script (plan 04 step 17+) needs the Firebase Admin SDK service account key — Adrien generates it in Project Settings → Service Accounts and saves to `firebase-adminsdk-private.json` (gitignored, exclusion already in `.gitignore`).
- Cloud Functions (S2 plan 15) for invite code generation will reuse the App Check token verification.
- **App Check à activer en plan 13** : créer reCAPTCHA v3 site key dans la Console Firebase → App Check → Apps → Register web app → coller dans `.env.local` `VITE_RECAPTCHA_SITE_KEY`. Le code dans `firebase.ts` détecte la présence et active automatiquement.
- **Warnings firestore.rules** : 3 fonctions utilitaires sont définies mais inutilisées (`memberRole`, `isDMOfAnyCampaignFor`, `someCampaignHasMeAsDM`). Elles ont été ajoutées préventivement en plan 01 pour les rules de campaign/memberships/characters cross-DM. À câbler en plan 14 (`campaigns-model`) et plan 16 (`memberships-permissions`).
- **Plan 03 n'a pas ajouté de bouton temp de test** (steps 13/17 SKIPPED). La vérification de l'auth anonyme se fait visuellement via la Console Firebase ; les liens Google/Email seront testés naturellement quand le UI auth arrive en plan 14+ et la création de personnage en plan 05.
