# Plan 34 — Production deploy + perf audit + monitoring

## Goal
Lighthouse 90+ on PWA criteria, error tracking, performance baseline, prod URL live. v1.0 tagged. End of project.

## Context
Read `docs/COMMERCIAL-READINESS.md` (security audit checklist).

## Prerequisites
Plans 31-33 complete.

## Steps

### Bundle audit
- [ ] 1. Run `pnpm build && pnpm dlx vite-bundle-visualizer`. Identify the largest dependencies.
- [ ] 2. Verify map view is in a separate chunk (PixiJS lazy-loaded).
- [ ] 3. Initial bundle target: < 200KB gzipped. If over, identify and split.
- [ ] 4. Check fonts: load only the weights actually used, with `font-display: swap`.
- [ ] 5. Tree-shake icons sprite if individual icons aren't referenced (audit usage).

### Lighthouse
- [ ] 6. `pnpm preview` then run Lighthouse mobile audit. Targets:
    - Performance ≥ 85
    - Accessibility ≥ 95
    - Best Practices ≥ 95
    - SEO ≥ 90
    - PWA ≥ 90
- [ ] 7. Fix any criteria failures. Common ones: image sizes, contrast ratios, ARIA labels.

### Error tracking
- [ ] 8. Add Sentry (free tier) — install `@sentry/react`. Init in `main.tsx` (only in prod).
- [ ] 9. Configure: tracesSampleRate: 0.1, errorSampleRate: 1.0, capture unhandled rejections.
- [ ] 10. Verify a thrown error in dev mode reports to Sentry dashboard.

### Health monitoring
- [ ] 11. Use Firebase built-in monitoring for Firestore reads/writes, Functions invocations, Auth.
- [ ] 12. Set up budget alerts in GCP console: if monthly Firestore usage exceeds €5, email Adrien.

### Backups
- [ ] 13. Enable Firestore daily exports to a Cloud Storage bucket (gcloud command — document in `docs/OPS.md`).
- [ ] 14. Retention: 30 days.

### Security audit
- [ ] 15. Run through the checklist in `docs/COMMERCIAL-READINESS.md` → "Security audit checklist" section. Document results in `docs/SECURITY-AUDIT.md`.
- [ ] 16. Confirm: no service account keys committed, no Firebase config secrets in client (only public API key), CSP header set, HTTPS enforced.

### CSP + headers
- [ ] 17. `firebase.json` hosting headers: add Content-Security-Policy meta:
    ```
    default-src 'self';
    script-src 'self' https://www.gstatic.com https://*.firebaseio.com https://www.google.com/recaptcha/;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;
    img-src 'self' data: https:;
    font-src 'self' https://fonts.gstatic.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    ```
- [ ] 18. Other security headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin.

### Final deploy
- [ ] 19. `pnpm build && pnpm firebase:deploy:all`. Note prod URL.
- [ ] 20. Smoke test on prod URL: sign in, create campaign, add character, play through a session simulation.
- [ ] 21. Add a custom domain if Adrien has one (Firebase Hosting custom domain config).
- [ ] 22. Tag release: `git tag v1.0.0 && git push --tags`.

### Continuous deployment (optional, recommended)
- [ ] 23. Add GitHub Actions workflow:
    - On push to `main`: `pnpm typecheck && pnpm test && pnpm lint`
    - On merge to `main`: deploy to prod via `firebase deploy --token`
    - Token stored as GitHub secret

### Documentation
- [ ] 24. Update `README.md` with prod URL, status badges, contribution guide.
- [ ] 25. Create `CHANGELOG.md` covering v0.0.1 → v1.0.0.

### Final
- [ ] 26. Commit: `chore(release): v1.0.0`

## Definition of Done
- [ ] Lighthouse targets hit
- [ ] Sentry receives errors
- [ ] Backups configured
- [ ] Security audit passed (documented)
- [ ] Prod URL live, smoke-tested
- [ ] v1.0.0 tagged
- [ ] CI/CD optional but recommended
- [ ] **Project status: shippable**

## Notes for next plan
- No next plan. Post-v1 backlog lives in `docs/ROADMAP.md` "Au-delà de v1.0".
- If commercializing: add Stripe integration as a v1.1 follow-up.
