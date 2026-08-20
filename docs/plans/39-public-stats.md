# Plan 39 — Stats publiques de campagne

## Goal
A public, shareable, no-auth-required page at `/campaign-stats/:slug` showing aggregated stats from a campaign's events: total rolls, crits, deaths, sessions played, top spells, most-rolled skill, MVPs, etc. DM controls visibility per campaign. Beautiful, share-friendly (OG image), great as a campaign souvenir or recruitment tool for new players.

## Context
Read `docs/EVENT-LOG.md` (events drive stats).

## Prerequisites
Plan 22 (event log) complete. Sprint 5 in progress.

## Steps

### Data model
- [ ] 1. Add to `campaigns/{id}.settings`:
    ```ts
    publicStats: {
      enabled: boolean,                  // DM toggle
      slug: string | null,               // 6-12 char slug for public URL
      lastComputedAt: Timestamp | null,
      cachedStats: PublicStatsSnapshot | null,
    }
    ```
- [ ] 2. Slug generation: lowercase, alphanumeric + hyphens, e.g. "ashen-throne-x4kq". Cloud Function ensures uniqueness in `publicStatsSlugs/{slug}` lookup index.

### Cloud Function: computePublicStats
- [ ] 3. Scheduled function running weekly + on-demand when DM clicks "Régénérer maintenant":
    - Reads events, sessions, encounters for the campaign
    - Aggregates into a `PublicStatsSnapshot`:
      - `totalSessions, totalEvents, totalRolls, criticalHits, fumbles, monstersDefeated`
      - `deaths: { characterId, characterName, sessionNumber, cause }[]` (name/info redacted if DM toggled "anonymize")
      - `topSpells: { spellId, castCount }[]` (top 10)
      - `topSkills: { skillId, useCount }[]`
      - `partyComposition: { class, count }[]`
      - `sessionsTimeline: { number, date, encounters, deaths }[]`
      - `mvps: { characterId, characterName, crits, kills }[]`
    - Caches snapshot in `campaigns/{id}.settings.publicStats.cachedStats`
- [ ] 4. Anonymization toggle in DM settings: replaces character names with "Le héros élu", "Le maraudeur", etc. (procedural epithet generation).

### Public route
- [ ] 5. Route `/campaign-stats/:slug` → `<PublicStatsScreen />`, public access (no Firestore reads beyond the cached snapshot).
- [ ] 6. The Cloud Function writes the snapshot to a public-read collection `publicStats/{slug}` so the page can SSR-fetch it without auth.
- [ ] 7. Update `firestore.rules`: `publicStats/{slug}` allows public read; only the DM (via function) writes.

### Page UI
- [ ] 8. Hero: campaign name (i18n), DM name (or "Un MJ anonyme"), session count, "campagne commencée le X".
- [ ] 9. Sections:
    - **Chronique** — timeline of sessions with key events
    - **Le panthéon** — party portraits + classes + key stats per character (with spell sigil for most-cast spell, link to plan 38)
    - **Statistiques de combat** — total kills, crits, fumbles, most epic moment (longest combat / most dangerous encounter from event log)
    - **Le grimoire** — top spells cast, with their sigils
    - **In Memoriam** — deaths, dramatic
    - **L'aubaine** — top loot moments
- [ ] 10. Visual style: same GrimWar aesthetic but adapted for "story-telling" mode — less HUD, more typographic.

### Sharing
- [ ] 11. OG image: Cloud Function generates a 1200×630 PNG with campaign name + key stats. Used in social meta tags.
- [ ] 12. Shareable URL with copy button. QR code for in-person sharing.

### DM controls
- [ ] 13. Campaign settings → "Page publique" section:
    - Toggle enabled
    - Anonymize names toggle
    - "Régénérer maintenant" button
    - Slug field (regenerate available)
    - Preview link

### Tests
- [ ] 14. Unit: stats aggregator from sample events.
- [ ] 15. e2e: DM enables public stats, visits the public URL incognito, sees stats.

### Final
- [ ] 16. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 17. Commit: `feat(public-stats): shareable campaign souvenir page (plan 39)`

## Definition of Done
- [ ] Stats compute correctly from event log
- [ ] Public page accessible without auth
- [ ] DM-controlled visibility
- [ ] Anonymization works
- [ ] OG image renders
- [ ] Shareable URL + QR work

## Notes for next plan
- Plan 40 is the final production deploy. Update Lighthouse audit to include the public stats page.
- Post-v1: embeddable widgets ("Embed this stats card on your Discord/blog").
