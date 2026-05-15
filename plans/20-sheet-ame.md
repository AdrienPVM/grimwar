# Plan 20 — Sheet Âme mode

## Goal
Âme mode is the contemplative tab: personality cards (trait/ideal/bond/flaw + custom notes), features-by-source (race/class/background/feat) with descriptions, proficiencies summary, full backstory rich text, and a stats dashboard (lifetime rolls, crits, deaths, sessions attended). Per-character session journal stub for manual notes.

## Context
Read `docs/DATA-MODEL.md` (personality, featureUsage, stats), `prototype/grimwar.html` (Âme section).

## Prerequisites
Plans 01-19.

## Steps
- [ ] 1. `src/features/sheet/modes/ame/ame-mode.tsx`.
- [ ] 2. **Section Personnalité** — 4 cards (trait/ideal/bond/flaw). Tap to edit (owner only, even DM can't per `docs/PERMISSIONS.md`). Lock icon shows for DM view.
- [ ] 3. **Section Aptitudes** — grouped by source (Race / Classe / Historique / Don). Each row: name, source chip, description preview, expand for full text. Tap → opens `<FeatureDetailModal />`.
- [ ] 4. Feature usage tracking: if a feature has `featureUsage[ref] = { current, max, restoresOn }`, show as `2/3` counter with restore-on-rest indicator.
- [ ] 5. **Section Maîtrises** — armor, weapons, tools, languages. Read-only display + edit button (owner or DM).
- [ ] 6. **Section Histoire** — Markdown rich text editor (use a lightweight one like `react-markdown-editor-lite` or roll a basic textarea + preview). Owner-locked.
- [ ] 7. **Section Stats** — dashboard tiles:
    - Total rolls (lifetime)
    - Crits / fumbles
    - Average d20 (sum / count)
    - Skills most used
    - Sessions attended (from `presentInCampaigns` × memberships stats)
    - Time spent at 0 HP (from events, S3+)
- [ ] 8. **Section Journal de session (manuel)** — list of session entries. For S2, this is a manual list ("Notes du joueur sur la séance N"). The compiled journal arrives in S3 plan 25.
- [ ] 9. Adding journal entry: form with session number, title, text. Stored in subcollection `users/{uid}/characters/{cid}/journalEntries/{eid}`.

### Tests
- [ ] 10. e2e: edit a personality card, verify persistence; verify DM cannot edit (test as second user).

### Final
- [ ] 11. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 12. Commit: `feat(sheet): âme mode (plan 20) — end Sprint 2`

## Definition of Done
- [ ] All sections render
- [ ] Owner-locked fields enforced (DM cannot edit personality / backstory)
- [ ] Stats reflect real data
- [ ] Manual journal entries persist
- [ ] **End of Sprint 2** — tag v0.0.2

## Notes for next plan
- Plan 21 starts Sprint 3 with the DM dashboard. The Âme stats dashboard will gain auto-fill from events in plan 22+.
