# Plan 23 — Sessions manager

## Goal
DM can start/end sessions in a campaign. Attendance tracked. Each session has a number, title, planned date, notes (Markdown). `session-start` / `session-end` events logged. Sessions list at `/campaign/:id/sessions`, individual session at `/campaign/:id/session/:sid`.

## Context
Read `docs/DATA-MODEL.md` (sessions schema), `docs/EVENT-LOG.md` (session events).

## Prerequisites
Plans 14, 22.

## Steps
- [ ] 1. Route `/campaign/:id/sessions` → `<SessionsList />`: chronological list, DM-only "Planifier une session" button.
- [ ] 2. `<SessionCreateModal />`: title, planned date, optional description.
- [ ] 3. Auto-number sessions: query max `number`, +1.
- [ ] 4. Route `/campaign/:id/session/:sid` → `<SessionScreen />` with tabs: Notes / Attendance / Events / Journal (journal compiler in plan 25).
- [ ] 5. **Notes tab** — Markdown editor + preview (DM only). Auto-saves every 5s. Stored in `sessions/{sid}.notes`.
- [ ] 6. **Attendance tab** — check/uncheck members. Stored in `sessions/{sid}.attendance: string[]`.
- [ ] 7. **Events tab** — events scoped to this session (`events` where `sessionId == sid`), grouped by encounter / chronological.
- [ ] 8. **Start session** button (when status='planned'): sets `status='active'`, `startedAt=now`, logs `session-start` event. Active session sticky in DM dashboard top bar.
- [ ] 9. **End session** button (when status='active'): sets `status='completed'`, `endedAt=now`, logs `session-end` event. Triggers journal compilation (plan 25).
- [ ] 10. Only one session can be `'active'` at a time per campaign.
- [ ] 11. Active session ID flows through Zustand `useActiveSession()` → all events logged during the session get `sessionId` auto-populated by event-logger.

### Tests
- [ ] 12. e2e: DM creates session, starts, players join, end session, journal placeholder visible.
- [ ] 13. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 14. Commit: `feat(sessions): manager + active session + events scoped (plan 23)`

## Definition of Done
- [ ] Session creation, start, end flows work
- [ ] One active session at a time
- [ ] Events auto-tagged with sessionId
- [ ] Notes auto-save

## Sous-jalons

### JALON 23.1 — Data layer (type + service + rule-widening) ✅ livré
Fondation sans UI, entièrement testée. Couvre le socle des steps 3/5/6/8/9/10 côté données.

- **`src/shared/types/session.ts`** — `SessionSchema` (Zod) reproduisant À L'IDENTIQUE la forme documentée `docs/DATA-MODEL.md` (aucun champ ajouté ⇒ pas de changement de schéma Firestore). `SESSION_STATUSES` + `SessionStatus`.
- **`src/shared/lib/services/sessions.ts`** — `createSession` (auto-numérotation max+1, step 3), `listSessions`, `getSession`, `getActiveSession`, `startSession` (garde-fou « une seule active à la fois » côté client, step 10 → `SessionServiceError('another-session-active')`, re-start idempotent), `endSession` (step 9, sans la compilation journal plan 25), `updateSessionNotes` (step 5), `setSessionAttendance` (step 6). Pattern aligné sur `campaigns.ts` (`trackPendingWrite`, `serverTimestamp`, erreurs typées `SessionServiceError`).
- **`firestore.rules`** — lecture sessions élargie `isMemberOf(cid)` → `isMemberOf(cid) || isDMOf(cid)`. Un MJ pur n'a pas de doc `members/` ⇒ ne pouvait pas lire SA PROPRE liste. Élargissement identique au précédent events 22.3 / maps CHANTIER D. **⚠️ Non déployé** — `pnpm firebase:deploy:rules` requis avant que 23.2+ ne consomme la liste en prod (cf. discipline deploy CLAUDE.md).
- **Tests** — `tests/firestore-rules.test.ts` : bloc sessions (read membre/MJ/non-membre incl. gap MJ-sans-`members/` rouge-avant-vert, query liste, CRUD MJ-only) → 87/87 contre l'émulateur. `src/shared/lib/services/__tests__/sessions.test.ts` : 17 tests (auto-numérotation, garde-fou actif, payloads). Triple gate verte.

**Décisions tactiques 23.1 :**
- Garde-fou « une seule session active » placé dans `startSession` (data layer, testable sans UI) plutôt que reporté au wiring 23.4. Client-enforced — les rules ne peuvent pas asserter à bas coût l'unicité cross-doc ; acceptable single-DM V1.
- Auto-numérotation read-then-write non atomique : collision possible sur `number` en cas de double-MJ simultané (id du doc reste unique ⇒ collision cosmétique). Documenté dans le service. Durcissement transactionnel déféré si co-MJ l'exige.
- Pas d'event `session-start`/`session-end` ni de câblage `activeSessionId` Zustand dans le service — c'est du wiring UI (23.4). L'event-logger auto-tag déjà `sessionId` depuis `activeSessionId` (`event-logger.ts:48`, prêt depuis 22.1).
- « description optionnelle » du step 2 NON modélisée comme champ (le schéma documenté n'en a pas) — repliable sur `notes` côté UI 23.2 sans changement de service.

### Reste à livrer
- **23.2** — route `/campaign/:id/sessions`, `<SessionsList>`, `<SessionCreateModal>` (steps 1-3 UI).
- **23.3** — `<SessionScreen>` + onglets Notes (auto-save 5s) / Présence / Events (steps 4-7).
- **23.4** — boutons Start/End + event-logging + câblage `activeSessionId` + onglet Events scopé (steps 8-11). Specs e2e (step 12).

## Notes for next plan
- Plan 25 reads sessions + events to compile journal.
- 23.1 a livré le data layer complet (type + service + rule). 23.2+ n'ont qu'à câbler l'UI sur `sessions.ts` — pas de nouveau schéma, pas de nouvelle rule (le `|| isDMOf` est déjà posé). **Rappel : déployer `firestore.rules` avant la livraison 23.2** (la liste de sessions côté MJ crashe en prod sinon).
