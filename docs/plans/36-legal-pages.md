# Plan 33 — Legal pages + privacy policy + terms + cookies

## Goal
Static pages at `/legal/privacy` and `/legal/terms`, accessible from footer + settings. Privacy policy GDPR-compliant. Terms of service basic but covering. Cookie banner for first-visit consent (essential cookies only for v1).

## Context
Read `docs/COMMERCIAL-READINESS.md` (legal section).

## Prerequisites
Plan 32.

## Steps

### Privacy policy
- [ ] 1. Draft content (FR + EN). Cover:
    - Who we are, contact email
    - What data we collect (account: email, displayName; user data: characters, campaigns, etc.)
    - Why (provide the service; no advertising; no third-party sharing except sub-processors)
    - Sub-processors: Google Firebase (Auth, Firestore, Functions, Storage, Hosting), reCAPTCHA Enterprise (App Check)
    - Data location: EU (europe-west1)
    - Retention: kept as long as account exists; deleted within 30 days of account deletion
    - User rights: access, rectification, deletion, export, restriction of processing, objection
    - How to exercise rights: in-app + email
    - Cookies: essential only, no analytics, no ads
    - Children: minimum age 13 (or 16 per local law)
    - Changes: how we notify
    - Effective date
- [ ] 2. Render at `/legal/privacy` via `<PrivacyScreen />`. Use Markdown rendered from `src/features/legal/content/privacy-fr.md` + `privacy-en.md` (or whatever content stack chosen).

### Terms of service
- [ ] 3. Draft content (FR + EN). Cover:
    - Acceptance
    - Account responsibilities
    - Acceptable use (no hate speech, no IP infringement, no automated abuse)
    - Service availability (best effort, no SLA on free)
    - Termination
    - Liability disclaimers
    - Governing law (Belgian or Luxembourg — confirm with Adrien)
    - Contact
- [ ] 4. Render at `/legal/terms`.

### Cookie banner
- [ ] 5. `<CookieBanner />` shown on first visit (localStorage flag). Single-button "OK, j'accepte" since we only use essential cookies. Link to privacy.
- [ ] 6. NO analytics tracking on v1 (post-v1 may add Plausible or self-hosted).

### Footer
- [ ] 7. Add a discreet footer to library and settings: links to Privacy + Terms.

### Sign-up consent
- [ ] 8. Sign-up forms (Google upgrade, email upgrade) have a "J'accepte les CGU et la politique de confidentialité" checkbox required. Refuse if unchecked.

### Tests
- [ ] 9. e2e: first visit shows cookie banner, dismiss, doesn't reappear; sign-up flow refuses without consent.

### Final
- [ ] 10. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 11. Commit: `feat(legal): privacy + terms + cookies (plan 33)`

## Definition of Done
- [ ] Both legal pages render in FR and EN
- [ ] Cookie banner works
- [ ] Sign-up flow enforces consent
- [ ] Content reviewed (mention to Adrien for legal review pass if commercializing)

## Notes for next plan
- Final plan 34: perf audit + production deploy.
