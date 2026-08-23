# Architecture

## Folder structure

```
grimwar/
├── public/
│   ├── data/                    # bundled SRD/Free Rules JSON
│   ├── icons/                   # PWA icons (192, 256, 384, 512, maskable)
│   └── manifest.webmanifest
│
├── src/
│   ├── main.tsx                 # entry, mount React, register SW, init Sentry stub
│   ├── App.tsx                  # providers shell
│   ├── routes.tsx               # route table
│   │
│   ├── features/
│   │   ├── auth/                # sign-in, account upgrade, email verification
│   │   ├── library/             # user's character list + entry to campaigns + content browser
│   │   ├── wizard/              # character creation (7 steps) + level-up wizard
│   │   ├── sheet/               # 5-mode character sheet (Combat/Essence/Magie/Avoir/Âme)
│   │   ├── dice/                # roll engine + tray + history
│   │   ├── radial-menu/         # press-hold-drag FAB
│   │   │
│   │   ├── campaigns/           # S2 — campaign creation, settings, dashboard
│   │   ├── invitations/         # S2 — join flow (code or link)
│   │   │
│   │   ├── dm-view/             # S3 — DM dashboard, omniedit, secret rolls
│   │   ├── encounters/          # S3 — combat tracker shared
│   │   ├── sessions/            # S3 — start/end session, attendance, notes
│   │   ├── journal/             # S3 — auto-compiled journal + Markdown editor overlay
│   │   │
│   │   ├── map/                 # S4 — PixiJS VTT, .dd2vtt import, tokens, lighting, fog
│   │   │
│   │   ├── account/             # S5 — settings, GDPR export, delete account
│   │   └── legal/               # S5 — privacy, ToS, cookie consent
│   │
│   ├── shared/
│   │   ├── components/          # GlassPanel, Card, Button, Chip, Icon, Aurora, Particles, …
│   │   ├── hooks/
│   │   │   ├── use-firestore.ts
│   │   │   ├── use-dexie.ts
│   │   │   ├── use-content.ts
│   │   │   ├── use-locale.ts
│   │   │   ├── use-permissions.ts
│   │   │   ├── use-active-campaign.ts
│   │   │   └── use-pointer-gesture.ts
│   │   ├── lib/
│   │   │   ├── firebase.ts          # init, auth helpers, App Check
│   │   │   ├── dexie-db.ts          # local cache schema
│   │   │   ├── content-loader.ts    # public + user + campaign content resolution
│   │   │   ├── event-logger.ts      # single entry point for all events
│   │   │   ├── permissions.ts       # canEdit / canRead helpers
│   │   │   ├── i18n.ts              # t() + localize()
│   │   │   ├── cn.ts                # clsx + tailwind-merge wrapper
│   │   │   ├── env.ts               # env var validation
│   │   │   ├── format.ts            # date/number formatting
│   │   │   ├── rules/               # 5e rule helpers (modifier, prof bonus, slots, …)
│   │   │   ├── slices/              # zustand slices (auth, ui, current-char, dice, locale, active-campaign)
│   │   │   └── store.ts             # root zustand
│   │   ├── types/
│   │   │   ├── srd.ts
│   │   │   ├── character.ts
│   │   │   ├── campaign.ts
│   │   │   ├── event.ts
│   │   │   ├── content.ts
│   │   │   ├── dice.ts
│   │   │   ├── auth.ts
│   │   │   └── i18n.ts
│   │   └── design/
│   │       ├── tokens.ts
│   │       └── icons.ts             # SVG sprite string
│   └── styles/
│       └── globals.css
│
├── functions/                   # Firebase Cloud Functions (S2+ for App Check token mint, S5 for GDPR export/delete)
│
├── docs/                        # this folder
├── docs/plans/                       # GSD work queue
├── scripts/                     # content extraction
├── content-sources/             # raw PDFs + HTML (gitignored)
├── docs/prototype/grimwar.html      # visual reference
└── tests/
    ├── setup.ts
    └── e2e/
```

## Routing

```ts
const routes = [
  { path: '/',                    element: <LibraryScreen /> },             // user's characters + campaigns
  { path: '/auth/sign-in',        element: <SignInScreen /> },              // anonymous → Google/email upgrade
  
  { path: '/create',              element: <WizardScreen />, children: […] },
  { path: '/character/:id',       element: <SheetScreen />, children: […] },        // mode tabs as children
  { path: '/character/:id/level-up', element: <LevelUpWizard /> },
  
  { path: '/campaigns/new',       element: <CampaignCreateScreen /> },       // S2
  { path: '/campaign/:id',        element: <CampaignScreen />, children: [
    { index: true,                element: <CampaignOverview /> },          // S2
    { path: 'members',            element: <MembersList /> },                // S2
    { path: 'invite',             element: <InvitePanel /> },                // S2
    { path: 'sessions',           element: <SessionsList /> },               // S3
    { path: 'session/:sid',       element: <SessionScreen /> },              // S3
    { path: 'encounter/:eid',     element: <EncounterScreen /> },            // S3
    { path: 'journal',            element: <JournalScreen /> },              // S3
    { path: 'map',                element: <MapScreen /> },                  // S4
    { path: 'dm',                 element: <DMDashboard /> },                // S3 (DM only)
    { path: 'settings',           element: <CampaignSettings /> },           // S2
  ] },
  { path: '/join/:code',          element: <JoinByCodeScreen /> },           // S2
  
  { path: '/library/content',     element: <ContentBrowser /> },             // S2
  
  { path: '/settings',            element: <SettingsScreen /> },             // S5
  { path: '/legal/privacy',       element: <PrivacyScreen /> },              // S5
  { path: '/legal/terms',         element: <TermsScreen /> },                // S5
  
  { path: '*',                    element: <NotFoundScreen /> },
];
```

## Data flow

```
   ┌────────────────────────────────────┐
   │  Firestore (europe-west1)          │ ← source of truth
   │  - users/{uid}/characters          │
   │  - campaigns/{id}                  │
   │  - campaigns/{id}/events           │
   │  - campaigns/{id}/sessions         │
   │  - inviteCodes                     │
   └──────────┬─────────────────────────┘
              │ onSnapshot listeners
              ↓
   ┌────────────────────────────────────┐
   │  Zustand store (slices)            │
   │  - auth, locale, ui                │
   │  - currentCharacter                │
   │  - activeCampaign                  │
   │  - dice                            │
   └──────────┬─────────────────────────┘
              │ subscribe
              ↓
   ┌────────────────────────────────────┐
   │  React components                  │
   └──────────┬─────────────────────────┘
              │ user actions
              ↓
   ┌────────────────────────────────────┐
   │  Data layer hooks                  │ ← optimistic writes
   │  - useCharacter, useUpdateCharacter│   + Firestore write
   │  - useCampaign                     │   + event-logger.ts call
   │  - useLogEvent                     │
   └────────────────────────────────────┘

   ┌────────────────────────────────────┐
   │  public/data/*.json                │ ← bundled, fetched once, cached in Dexie
   └────────────────────────────────────┘
```

### Write path

Every gameplay write goes through a data layer hook (e.g. `useUpdateCharacter`). Inside:

1. **Permission check** via `permissions.ts` (client-side gate for UX).
2. **Optimistic update** in Zustand.
3. **Firestore write** (`updateDoc` with the patch).
4. **Event log** via `event-logger.ts` (separate Firestore write).
5. **Rollback** Zustand if Firestore fails (with toast).

The two writes (character patch + event) are NOT atomic. If the event write fails after the character write succeeds, we log a warning to console (S5: send to Sentry). For v1 this is acceptable — event log is recoverable.

### Read path

- `useCurrentCharacter()` → subscribes to active character's Firestore doc + propagates to Zustand
- `useActiveCampaign()` → subscribes to active campaign + its memberships
- `useContent(type, id)` → resolves through public → user customContent → campaign customContent layered
- `useRecentEvents(campaignId, limit)` → recent campaign events for the journal feed

## State boundaries

- **Local UI state** (open/closed, hovered, form input drafts) → `useState`
- **Feature-scoped state** (e.g. wizard step progress) → feature Zustand slice
- **App-wide state** (auth, locale, active campaign, current character, dice tray) → root slice
- **Cached content** (SRD JSON) → Dexie + accessed via `useContent` hook (not Zustand — too big)

## Service worker / PWA

Workbox with these strategies:
- **App shell**: precache (HTML, JS, CSS chunks, fonts)
- **Public data JSON** (`/data/*.json`): stale-while-revalidate
- **Firestore**: SDK handles its own offline persistence — SW skips Firestore URLs
- **Map images** (S4): cache-first, 30 days
- **Custom install prompt** (S1) via `beforeinstallprompt` capture, shown with grimwar-themed UI

## Permissions enforcement

Two layers:

1. **Client-side** (`permissions.ts`) for UX only — gray out, hide menus, redirect.
2. **Server-side** (Firestore rules) — the real enforcement.

Client and server use the same logic. If they diverge, server wins.

For DM authority on player characters, the rule must check:
- `request.auth.uid` is DM of a campaign in `character.presentInCampaigns`

This requires a cross-collection read in security rules (`get(/databases/{db}/documents/campaigns/{cid}).data.dmUserId == request.auth.uid`). Done in `firestore.rules`. Cached per request by Firestore (5min). Performance is fine.

## Cloud Functions (S2+, S5)

- **`createInviteCode`** (S2): generates a 6-char code, writes to `inviteCodes/{code}`, returns it to the caller. Runs server-side to ensure code uniqueness (race condition handling).
- **`acceptInvite`** (S2): validates code, creates membership, returns success. Server-side because membership creation must be atomic with the code's `uses++`.
- **`exportUserData`** (S5): bundle all user data into a ZIP, return a signed download URL. GDPR.
- **`deleteUserAccount`** (S5): GDPR-compliant cascade delete.

Until S2, no functions deployed. Auth + Firestore SDK are enough for S1.

## Performance budget

- Lighthouse PWA score: ≥ 90
- FCP < 1.5s on mid-range mobile (Moto G4 / throttled 4G)
- TTI < 3s
- Initial JS bundle (gzipped): < 200KB
- Per-route lazy chunks: < 50KB
- Map view (S4): separate lazy chunk (PixiJS is heavy)

## Accessibility baseline

- WCAG AA contrast on all text (see DESIGN-SYSTEM.md)
- Keyboard reachable everywhere
- `:focus-visible` styled globally
- Touch targets ≥ 44×44 px
- `prefers-reduced-motion` respected (no aurora, no particles, near-instant transitions)
- Screen-reader meaningful labels on icon-only buttons

## Internationalization layer

See `docs/I18N.md`. UI strings via `t(key)`, entity prose via `localize(I18nValue)`. Locale persisted in user doc, app-wide via Zustand slice.
