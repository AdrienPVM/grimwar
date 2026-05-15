# Commercial readiness

The codebase is built so that going commercial requires only UI/billing work — no architectural rewrites.

## Already baked in (from S1+)

### Security
- ✅ **EU data residency** (Firestore `europe-west1`)
- ✅ **Auth providers**: anonymous + Google + email (Apple Sign-In deferred but easy to add)
- ✅ **App Check** (rate limiting + bot prevention)
- ✅ **Security rules** with field-level validation (no client-trusted writes)
- ✅ **Owner isolation**: no cross-user data leak possible
- ✅ **DM authority enforced server-side** in Firestore rules (not just client UX)
- ✅ **Invitations** with expiry + max-uses + revocation

### Data structure
- ✅ **Subscription tier field** on user (`tier: 'free' | 'pro'`) — placeholder, no paywall yet
- ✅ **Audit trail**: events table doubles as audit log
- ✅ **Schema versioning** on all major docs for safe migrations
- ✅ **`updatedBy` field** on character docs (tracks DM edits)

### GDPR foundations
- ✅ Data minimization (we only store what we need)
- ✅ User can delete their account (S5 ships the UI; rules already allow self-delete)
- ✅ User can export their data as JSON (S5 ships the UI; data layer is ready)
- ✅ Consent obtained at signup (S5 adds the actual checkboxes; for now no public users)
- ✅ Right to access — user can see all their data in app

## TODO before public launch (S5)

### Legal
- [ ] Terms of Service drafted
- [ ] Privacy Policy drafted (GDPR-compliant)
- [ ] Cookie consent banner (only essential cookies for v1 — no tracking)
- [ ] DPA with Google/Firebase (standard contractual clauses, already in place via Firebase)
- [ ] List sub-processors (Firebase, possibly Stripe/Sentry later)

### Account management UI
- [ ] Settings screen with email/password change
- [ ] Delete account button (with confirmation flow)
- [ ] Export data button (downloads ZIP with all JSON)
- [ ] Email verification flow
- [ ] Password reset flow

### Operational
- [ ] Error tracking (Sentry or similar)
- [ ] Health monitoring (Firebase Monitoring built-in)
- [ ] Backup strategy (Firestore daily backups via gcloud)
- [ ] Incident playbook (basic — "what to do if Firestore goes down")

### Polish
- [ ] Lighthouse 90+ on PWA criteria
- [ ] FCP < 1.5s on a mid-range mobile
- [ ] Bundle < 200KB gzipped
- [ ] No console errors / warnings on prod build
- [ ] Cross-browser tested (Chrome, Safari iOS, Firefox)

## If we commercialize (post-v1)

These ARE NOT in v1 scope. Listed for awareness:

### Pricing model (TBD, based on TTRPG SaaS norms)
- **Free tier**: 1 active campaign, basic features
- **Pro tier**: unlimited campaigns, map view, advanced journal, custom themes
- Per-DM seat: Pro is paid by the DM, players join free
- Yearly discount (e.g. 12 months for the price of 10)

### Implementation when we add it
1. Stripe integration via Cloud Function (no card data hits our DB)
2. Subscription state on `users/{uid}.tier` updated by webhook
3. Feature gates check `user.tier` (client-side gray-out, server-side rule enforcement on Pro-only collections)
4. Cancellation flow with grace period

### Compliance escalation
- VAT MOSS for EU sales
- US sales tax if we hit US thresholds
- App Store / Play Store revenue cut if we wrap as native app

## Security audit checklist (pre-launch)

Walk through these BEFORE going public. Most are validated by S5 plan 34:

- [ ] All Firestore paths denied by default
- [ ] No collection allows write without auth
- [ ] No collection allows read across users
- [ ] DM authority predicates work as documented (test with 2 accounts)
- [ ] Cannot read another user's `inviteCodes` write
- [ ] Cannot escalate role via membership write
- [ ] Cannot exceed App Check rate limits without bot detection
- [ ] No service account keys in repo
- [ ] No Firebase config in client-readable form except the public API key
- [ ] All forms have CSRF protection (Firestore + App Check covers this)
- [ ] Content Security Policy header set on prod hosting
- [ ] HTTPS enforced
- [ ] No `eval` or unsafe-inline scripts
- [ ] No `dangerouslySetInnerHTML` without sanitizer
- [ ] PWA service worker doesn't cache auth-sensitive endpoints

## Threat model summary

| Threat | Mitigation |
|---|---|
| Player tampers with own HP to cheat | Event log shows changes; DM sees in journal. We don't try to prevent client-side tampering — D&D is cooperative. |
| Player reads another user's data | Firestore rules: hard wall. |
| DM removed but still has Firestore access | DM role is the campaign creator; transferring DM = creating new campaign (post-v1). Removing campaign deletes rule context. |
| Brute-force invite codes | Codes are 6 chars uppercase + digit = ~2B combos. App Check rate-limits. Max-uses prevents resharing. |
| Stale invite reuse | Codes have `expiresAt` and `maxUses`. DM can rotate. |
| Spam campaign creation | Rate-limited via App Check + tier cap (Pro-only past 1 campaign). |
| Account takeover | Standard Firebase auth (Google handles MFA; email/password gets reset via email). |
| Data exfil via subscription downgrade | Subscription = client-side gate but server-side rules still allow data read for the owner. Downgrade doesn't delete data. |

## Why this matters even before commercialization

Even for "just my friends" use:
- Friends won't tolerate data loss → robust schema + backups
- Friends won't tolerate "you can see my character" → strict rules
- Adrien doesn't want to rebuild later → bake the right structure now
- Confidence to share with non-friend playtester groups later
