# Plan 13 — PWA finalize + first deploy

## Goal
The app installs on Adrien's phone as a PWA, works offline (cached app shell + Firestore persistence), and lives at a real URL on Firebase Hosting. End of Sprint 1.

## Context
Read `docs/ARCHITECTURE.md` (PWA section), `vite.config.ts`.

## Prerequisites
Plans 01-12 complete. Firebase Hosting enabled in the Firebase project.

## Steps

### Manifest
- [ ] 1. `public/manifest.webmanifest`:
    ```json
    {
      "name": "GrimWar",
      "short_name": "GrimWar",
      "description": "Compagnon de table pour D&D 5e",
      "start_url": "/",
      "scope": "/",
      "display": "standalone",
      "orientation": "portrait",
      "background_color": "#0a0612",
      "theme_color": "#0a0612",
      "lang": "fr",
      "icons": [
        { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-256.png", "sizes": "256x256", "type": "image/png" },
        { "src": "/icons/icon-384.png", "sizes": "384x384", "type": "image/png" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
      ]
    }
    ```
- [ ] 2. Reference manifest in `index.html`: `<link rel="manifest" href="/manifest.webmanifest">`.
- [ ] 3. Add `<meta name="theme-color" content="#0a0612">` and `<meta name="apple-mobile-web-app-capable" content="yes">`.
- [ ] 4. Add Apple touch icons: `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`.

### Icons
- [ ] 5. Generate icons from the prototype's hero emblem (SVG → PNG at 192/256/384/512/maskable 512). Use `sharp` or an online tool offline. Store in `public/icons/`.
- [ ] 6. Maskable icon: full bleed with safe zone in the center (use Maskable.app preview for visual check).

### Service worker via vite-plugin-pwa
- [ ] 7. Already installed (`vite-plugin-pwa`). Configure in `vite.config.ts`:
    ```ts
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/**', 'data/**', 'fonts/**'],
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'public-data' },
          },
        ],
        // Don't intercept Firestore
        navigateFallbackDenylist: [/^\/__\/firestore/, /firestore\.googleapis\.com/],
      },
    })
    ```
- [ ] 8. Service worker auto-updates: when a new version is deployed, prompt user to reload via `<UpdateBanner />` listening to `vite-pwa`'s update hook.

### Custom install prompt
- [ ] 9. `src/features/auth/install-prompt.tsx`:
    - Listens to `beforeinstallprompt` event
    - Shows a grimwar-themed banner: "Installer GrimWar — disponible hors-ligne"
    - Buttons: "Installer" (calls `prompt()`) / "Plus tard"
    - Persists dismissal in localStorage for 30 days

### Apple-specific install hint
- [ ] 10. iOS Safari doesn't fire `beforeinstallprompt`. Detect iOS Safari and show a different banner: "Pour installer : appuyez sur ⎙ puis « Sur l'écran d'accueil »".

### Offline UX
- [ ] 11. Add an offline indicator at the top of the app when `navigator.onLine === false`. Soft amber banner.
- [ ] 12. Verify Firestore writes queue offline (Firestore SDK does this automatically with persistence enabled).
- [ ] 13. Test: turn on airplane mode, change HP, see optimistic update. Turn off airplane mode, see Firestore sync.

### Lighthouse + manifest validation
- [ ] 14. Run `pnpm build && pnpm preview`. Open in Chrome DevTools → Lighthouse → Mobile → PWA category.
- [ ] 15. Fix any PWA criteria failures. Target: score ≥ 90 on PWA category.

### Firebase Hosting deploy
- [ ] 16. Verify `firebase.json` includes hosting config:
    ```json
    {
      "hosting": {
        "public": "dist",
        "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
        "rewrites": [{ "source": "**", "destination": "/index.html" }],
        "headers": [
          {
            "source": "/icons/**",
            "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
          },
          {
            "source": "/data/**",
            "headers": [{ "key": "Cache-Control", "value": "public, max-age=300, must-revalidate" }]
          }
        ]
      }
    }
    ```
- [ ] 17. Deploy: `pnpm firebase:deploy:hosting`. Note the URL printed (e.g. `https://grimwar-xxx.web.app`).
- [ ] 18. Visit the URL on a phone, install as PWA, verify it works.
- [ ] 19. Test installed app offline (airplane mode after first load).

### Final
- [ ] 20. Commit: `feat(pwa): manifest, service worker, custom install, first deploy (plan 13)`
- [ ] 21. Tag the release: `git tag v0.0.1 && git push --tags`

## Definition of Done
- [ ] All steps checked
- [ ] App installs on Android (Chrome) and iOS (Safari)
- [ ] App works offline after first load (HP changes optimistic, sync on reconnect)
- [ ] Lighthouse PWA score ≥ 90
- [ ] Deploy URL accessible
- [ ] v0.0.1 git tag created
- [ ] **Adrien plays Lyralei on his phone at next session** ← real DoD

## Notes for next plan
- End of Sprint 1. Adrien is table-ready solo.
- **Sprint 2 starts**: plan 14 introduces campaigns and changes the data model significantly. Read `docs/DATA-MODEL.md` Campaigns section carefully.
- Future deploys: same `pnpm firebase:deploy:hosting`. Automate via GitHub Actions in plan 34.
