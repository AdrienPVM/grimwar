# Plan 21 — DM dashboard

## Goal
At `/campaign/:id/dm`, the DM gets a panoramic view: party roster with HPs/conditions/status, recent events feed, upcoming/active sessions, encounters in flight, quick-access to encounter creation and notes. DM-only route (rule + UI gate).

## Context
Read `docs/PERMISSIONS.md`, `docs/EVENT-LOG.md`.

## Prerequisites
Sprint 2 complete.

## Steps
- [ ] 1. Route `/campaign/:id/dm` → `<DMDashboard />`. Gated: redirect non-DM to `/campaign/:id`.
- [ ] 2. **Party roster panel** — grid of player cards (one per member with a character). Each card shows: portrait, name, class+level, HP bar, conditions chips, AC, equipped highlights, last-seen timestamp.
- [ ] 3. Click a card → opens that character's sheet in "DM view" (full edit authority).
- [ ] 4. **Recent events feed** — last 20 events in the campaign (visibility: all or dm). Tap an event for details. Filter by player.
- [ ] 5. **Sessions strip** — active session highlighted, next planned session pinned, "Start session" / "End session" buttons.
- [ ] 6. **Encounters strip** — list of active and planned encounters with status. "Create encounter" button → opens encounter creator (plan 24).
- [ ] 7. **Quick notes** — Markdown scratchpad stored in the active session's `notes` field (or campaign-level if no active session).
- [ ] 8. **Secret roll** button — DM rolls a hidden d20 + mod (logged as `dm-secret-roll`, visibility: 'dm').
- [ ] 9. Real-time: all panels subscribe via `onSnapshot` — party HP changes from players appear instantly in DM dashboard.
- [ ] 10. Mobile layout: horizontally scrollable carousels for each panel (party / events / sessions / encounters).
- [ ] 11. e2e: 2-user scenario, player changes HP, DM sees update in dashboard within 2s.
- [ ] 12. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 13. Commit: `feat(dm-view): dashboard (plan 21)`

## Definition of Done
- [ ] DM dashboard renders correctly for DMs
- [ ] Non-DM redirected
- [ ] Real-time party updates work
- [ ] Quick notes persist
- [ ] Secret roll logs DM-only event

## Statut (séquencement JALON V1)
- **Step 4 (recent events feed) — LIVRÉ via JALON 22.3**, mais dans `campaign-detail-screen` (la vraie surface MJ d'une campagne réelle, cf. 4A.3), PAS dans la route `/campaign/:id/dm` décrite ici. Le `/dm` actuel est le **prototype 4A pré-V1** (opère sur mock-uid, cf. MVP-V1-DECISIONS-PRISES.md du 2026-06-04). Le feed d'activité MJ temps-réel (`CampaignEventFeed` + `useCampaignEvents`, rule `events` élargie `isMemberOf || isDMOf`, query contrainte par visibilité, filtre `canViewEvent`) est livré là. Détail au tap + filtre par joueur (reste de step 4) différés.
- **Steps 2, 3 et 9 (party roster panel + clic → fiche + party HP live) — LIVRÉS via JALON 4A.4** dans `campaign-detail-screen` (même surface MJ que 22.3). `CampaignPartyPanel` + `PartyMemberCard` montent, MJ-only, une carte par joueur ayant lié une fiche : nom, classe+niveau, barre de PV, états, **CA dérivée réelle** (`computeDisplayedAc` via `useInventoryDerived` — pas la valeur désarmée `character.ac`). Chaque carte s'abonne en LIVE via `useCharacter(characterId, ownerUid)` (lecture cross-owner A2, 4A.1/4A.3) → les PV changés par un joueur apparaissent sans reload (step 9). Clic → ouvre la lecture MJ `/campaigns/:cid/members/:uid/sheet` (4A.3) (step 3). Zéro nouvelle rule, zéro schéma : réutilise A2 + `useCharacter` cross-owner + la `PartyCard` du proto (rendue injectable `onOpen`/`displayedAc`). e2e `campaigns-dm-party-live.spec.ts` (live HP contre vraies rules) ; unit `campaign-party-panel.test.tsx`. **Edit inline MJ (omni-edit) = plan 26**, hors scope ici.
- **Steps 1, 5-8, 10-11 (route `/campaign/:id/dm` dédiée, sessions, encounters, quick-notes Firestore, secret-roll loggé, carousels mobile) — restent à livrer** quand leurs pré-requis atterrissent (sessions = plan 23, encounters = plan 24). Le `/campaign/:id/dm` complet est un jalon ultérieur ; 22.3 + 4A.4 ont livré les sous-ensembles « lecteur d'événements » + « état compagnie live » à plus haut levier, dans la vraie surface campagne.

## Notes for next plan
- Plan 22 implements the full event-logger — LIVRÉ (22.1/22.2 écriture, 22.3 lecteur). Le feed d'activité MJ est en ligne dans `campaign-detail-screen`.
- JALON 4A.4 (party panel live) a, au passage, corrigé une **régression typecheck pré-existante sur `main`** : `campaign-event-feed.tsx` (livré en 22.3) typait le prop `EventRow.event` en `Parameters<typeof summarizeEvent>[0] & { createdAt: unknown }` (createdAt requis), incompatible avec `GameEvent.createdAt` optionnel → `tsc` rouge sur HEAD `f5230ba`. Re-typé en `GameEvent` (ce qui est réellement passé). Aucun changement runtime.
