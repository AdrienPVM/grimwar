# Plans overview

47 plans across 5 sprints. Numbered, sequential. Pick lowest unfinished. Each has explicit DoD.

## Sprint 1 — Table-ready MVP (21 plans)

Adrien joue Lyralei sur son téléphone à la prochaine session.

| # | Plan | Status |
|---|---|---|
| 01 | [Foundation](./01-foundation.md) — Vite/React/TS scaffold, Tailwind, folder skeleton | TODO |
| 02 | [Design system](./02-design-system.md) — tokens, atomic components, sprite, aurora, particles | TODO |
| 03 | [Firebase setup](./03-firebase-setup.md) — Auth (anon+Google+email), Firestore eu-west1, App Check, baseline rules | TODO |
| 04 | [Content pipeline](./04-content-pipeline.md) — PDFs (truth #1), AideDD translations, i18n shape, items DB strict | TODO |
| 05 | [Character creation wizard](./05-character-creation-wizard.md) — wizard unique multi-step pédagogique, multi-class, responsive | **RÉÉCRIT (fusion 05+17, 2026-05-16)** |
| 06 | [Sheet foundation](./06-sheet-foundation.md) — routes, layout, hero card, mode tabs, status strip | TODO |
| 07 | [Sheet Combat mode](./07-sheet-combat.md) — battle HUD, HP, conditions, attacks, death saves, revive | TODO |
| 08 | [Sheet Essence mode](./08-sheet-essence.md) — hexagram, saves, skills | TODO |
| 09 | [Sheet Magie mode](./09-sheet-magie.md) — magic circle, slot runes, spell list (multi-class slots) | TODO |
| 10 | [Sheet Avoir mode](./10-sheet-avoir.md) — inventory strict, weight, coins | TODO |
| 12 | [Dice + roll engine (digital)](./12-dice-engine.md) — parser, roller, pivot mode-ready, 8 call sites migrés, history, toasts | **SWAPPED (avant 11)** |
| 12.5 | [Dice mode — physical](./12.5-dice-physical.md) — `effectiveDiceMode`, `<PhysicalRollModal />`, settings user, pivot mode-aware, null-guards | **NEW (split de plan 12)** |
| 13.6 | [LibraryScreen + nav shell](./13.6-library-and-nav-shell.md) — point d'entrée S1 + header sticky persistant, élimine Lyralei hardcodée | **NEW (avant 11)** |
| 13.5 | [Playwright smoke e2e + purge dette](./13.5-playwright-smoke.md) — config Playwright + smoke headless + purge dette e2e S1 | **NEW (avant 11)** |
| 13.7 | [SRD schema + scripts d'extraction](./13.7-srd-schema-and-extraction.md) — extension `Character` schema + scripts `extract-srd-*.ts` reproductibles + migration Dexie/Firestore | **NEW (comblage SRD jalon 1, point d'arrêt schéma)** |
| 13.8 | [Sous-choix d'ascendance L1](./13.8-srd-ancestry-sub-choices.md) — Drakéide/Tieffelin/Elfe/Gnome/Goliath/Humain : embranchements wizard + render fiche + e2e | **NEW (comblage SRD jalon 1)** |
| 13.8b | [Sorts d'ascendance consultables](./13.8b-ancestry-spells-clickable.md) — `AncestrySpellsCard` cliquable + `SpellList` inclut `'ancestry'` (Option B). Bouton « Lancer » désactivé → mécanique reportée DEBT D12. | **NEW (finition 13.8, 2026-05-18)** |
| 13.9 | [Sous-choix de classe L1 + Weapon Mastery](./13.9-srd-class-sub-choices.md) — Divine Order / Primal Order / Fighting Style / Weapon Mastery (5 classes) / Expertise / Eldritch Invocations / langues | **NEW (comblage SRD jalon 1)** |
| 13.10 | [Cleanup spells.json SRD strict](./13.10-srd-spells-cleanup.md) — 44 renames PHB 2014→SRD 5.2.1 + 21 ajouts + 18 retraits hors-SRD via script déterministe | **NEW (comblage SRD jalon 1)** |
| 13.11 | [Système d'import de contenu custom](./13.11-custom-content-import.md) — format `grimwar-content-pack.json` + validateur + UI campagne (mécanisme générique vide de contenu) | **NEW (jalon 1 — mécanisme, pas de contenu)** |
| 13.12 | [Matrice de tests de parcours + Vérité du contenu](./13.12-test-matrix-and-content-truth.md) — helpers `content-truth/*`, 20 entrées SRD reference figées, combinatoire L1 (classe × ascendance × background × variant) | **STUB (politique active, mécanique à livrer)** |
| 11 | [Radial FAB menu](./11-radial-fab.md) — gesture, wedges, sub-menus (consomme le moteur 12/12.5) | TODO |
| 13 | [PWA + deploy v0.0.1](./13-pwa-deploy.md) — manifest, SW, install, Firebase Hosting | TODO |

## Sprint 2 — Campaigns + wizard (6 plans, plan 17 absorbé en S1 plan 05)

Tes copains rejoignent, créent leur PJ via wizard.

| # | Plan | Status |
|---|---|---|
| 14 | [Campaigns model](./14-campaigns-model.md) — Firestore campaigns + memberships + variant toggles | TODO |
| 15 | [Invitation system](./15-invitations.md) — link + 6-char code, accept flow, Cloud Function | TODO |
| 16 | [Memberships + permissions](./16-memberships-permissions.md) — DM authority, security rules | TODO |
| 17 | [Wizard creation](./17-wizard-creation.md) — **ABANDONNÉ (fusionné dans plan 05, 2026-05-16)** | — |
| 18 | [Wizard level-up](./18-wizard-levelup.md) — pick class, HP, sous-classe, ASI/feat | TODO |
| 19 | [Bibliothèque](./19-bibliotheque.md) — content browser, recherche, filtres | TODO |
| 20 | [Sheet Âme mode](./20-sheet-ame.md) — personality, features, stats dashboard | TODO |
| 20.5 | [E2e expansion S2 close](./20.5-e2e-expansion-s2-close.md) — purge des 4 dernières specs e2e S1 (sheet/essence/avoir/dice-digital) via le fixture `seedCharacter` | **NEW (close-out S2, owner DEBT.md > D8)** |

## Sprint 3 — DM tools + auto-journal + handouts + NPCs (8 plans)

Vue MJ, event log, journal compilé, documents, PNJs récurrents.

| # | Plan | Status |
|---|---|---|
| 21 | [DM dashboard](./21-dm-dashboard.md) — vue d'ensemble campagne | TODO |
| 22 | [Event log infrastructure](./22-event-log.md) — event-logger.ts + auto-log gameplay | TODO |
| 23 | [Sessions manager](./23-sessions.md) — start/end, attendance, notes Markdown | TODO |
| 24 | [Combat encounter manager](./24-encounters.md) — initiative, monstres, party view DM | TODO |
| 25 | [Journal compiler](./25-journal-compiler.md) — events → narrative auto par session | TODO |
| 26 | [DM omniedit](./26-dm-omniedit.md) — UI exposant l'autorité totale du MJ + revive | TODO |
| **27** | [**Handouts MJ→joueur**](./27-handouts.md) — envoyer images/textes pendant la session | **TODO** |
| **28** | [**NPCs récurrents**](./28-npcs.md) — fiche light, directory, invocation en combat | **TODO** |

## Sprint 4 — Carte + mode TV (5 plans)

Import .dd2vtt, tokens, lighting, fog, mode présentation TV.

| # | Plan | Status |
|---|---|---|
| 29 | [PixiJS + .dd2vtt import](./29-pixijs-foundation.md) — parser dd2vtt, viewport, pan/zoom | TODO |
| 30 | [Tokens](./30-tokens.md) — placement, drag, sync temps réel | TODO |
| 31 | [Lighting + LOS](./31-lighting.md) — sources, calcul vision par token | TODO |
| 32 | [Fog of war](./32-fog-of-war.md) — control MJ-only, sync | TODO |
| **33** | [**Mode présentation / TV**](./33-tv-presentation.md) — full-screen carte+init pour TV | **TODO** |

## Sprint 5 — Polish + public launch (7 plans)

i18n EN, account, GDPR, legal, PDF export, spell sigils, public stats, prod.

| # | Plan | Status |
|---|---|---|
| 34 | [i18n EN](./34-i18n-en.md) — extraction strings, traduction, switcher | TODO |
| 35 | [Account management + GDPR](./35-account-management.md) — settings, export data, delete account | TODO |
| 36 | [Legal pages + privacy](./36-legal-pages.md) — privacy policy, terms, cookie consent | TODO |
| **37** | [**Export PDF de la fiche**](./37-pdf-export.md) — Puppeteer + 2 styles (Classic / GrimWar) | **TODO** |
| **38** | [**Spell card sigils**](./38-spell-sigils.md) — animations procédurales sur cast | **TODO** |
| **39** | [**Stats publiques de campagne**](./39-public-stats.md) — page partageable souvenir | **TODO** |
| 40 | [Production deploy + perf](./40-production-deploy.md) — Lighthouse 90+, prod URL, monitoring | TODO |

## Rules

- **Sequential**: don't jump unless dependencies are clearly satisfied.
- **Mark each step `[x]`** as completed (or `[!]` if blocked).
- **Run checkpoints** every 3-5 steps: `pnpm typecheck && pnpm test && pnpm lint`.
- **DoD must pass** before marking the plan complete.
- **Architectural surprises** → stop and ask Adrien before improvising.

## Swaps actés

- **12 avant 11** (acté 2026-05-16) : la feature dés a grossi (mode physique mode-aware) ; le radial FAB consomme le moteur. Autant le construire une seule fois mode-aware contre un moteur fini plutôt que stub + retrofit. La règle « plus petit numéro non terminé » cède devant ce swap délibéré documenté.
- **Split 12 / 12.5** (acté 2026-05-16) : plan 12 originel scindé en plan 12 « digital » (scope original, livrable + jouable seul) et plan 12.5 « physique » (couche par-dessus). Raison : ~1200 lignes mélangeant réécriture moteur + nouvelle modale + slice + migration Dexie + 8 refactors = trop pour une seule passe d'UAT. Deux commits = rollback isolable + deux UAT ciblées. Ordre : 10 → 12 → UAT digital → 12.5 → UAT physique → 11 → 13.
- **Insertion 13.6 + 13.5** (acté 2026-05-16) : la première UAT navigateur de plan 12.5 a révélé que `/` rendait un placeholder (emblème HP Lyralei hardcodé). Le S1 avait livré `SheetScreen` (plans 06-10) et le wizard `/create` (plan 05) sans jamais bâtir l'écran d'accueil ni un nav shell persistant — l'app n'avait pas de point d'entrée. 13.6 comble le trou (LibraryScreen + nav shell sticky), 13.5 verrouille la régression via Playwright headless. Tracé en `plans/DEBT.md > D2` (cause-racine + leçon de process). Ordre effectif S1 : 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 12 → 12.5 → **13.6 → 13.5** → 11 → 13.
- **Fusion 05 + 17 → 05 (acté 2026-05-16)** : l'UAT navigateur du plan 05 originel (formulaire monopage) a immédiatement révélé 3 bugs structurels (`setDoc(undefined)`, sorts vides pour lanceurs, inputs blanc-sur-blanc) **et** un défaut de conception (one-page non pédagogique, layout desktop non exploité). Décision Adrien : un seul parcours de création de PJ, wizard guidé multi-step, pédagogique pour débutant total, responsive mobile + desktop. Le plan 17 disparaît en tant que plan séparé (réduit à un stub de redirection). Le plan 05 est intégralement réécrit (`plans/05-character-creation-wizard.md`). Cause-racine + diagnostic des 3 bugs en `plans/DEBT.md > D3`. Dette `featAtLevel1` (variant lié à campagne) transférée au plan 14 — `plans/DEBT.md > D4`. Ordre effectif S1 inchangé (le 05 reste en place dans la séquence). Total plans 43 → 42.
- **Insertion 13.7 → 13.11 (acté 2026-05-17)** : l'audit SRD 5.2.1 (`docs/AUDIT-SRD-COMPLETUDE.md`) a constaté que le wizard ne pose pas ~20 sous-choix imposés par le SRD au niveau 1 (type de dragon Drakéide, héritage Tieffelin, Ordre divin Clerc, Style de combat Guerrier, Weapon Mastery 5 classes, Expertise Roublard, etc.) et que `feats.json`/`spells.json` ont des trous + des entrées hors-SRD à purger. Décision Adrien : un personnage L1 doit être **intégralement conforme au SRD avant que les campagnes S2 aient du sens** — c'est de la finition S1, comme `13.5` et `13.6`. 5 plans insérés en suffixe sans renommer aucun plan existant : `13.7` (schema + scripts d'extraction, **point d'arrêt schéma avant code**), `13.8` (sous-choix ascendance), `13.9` (sous-choix classe + Weapon Mastery), `13.10` (cleanup spells SRD strict), `13.11` (système d'import de contenu custom — mécanisme uniquement, vide de contenu). Politique de contenu **bundle SRD-only** actée en parallèle dans `CLAUDE.md` decision log. Total plans 42 → 47. Sprint 1 passe à 21 plans. Aucun plan 14-40 renommé, aucune référence croisée à repister.

## Plan template

```md
# Plan NN — [Name]

## Goal
One paragraph. What does "done" look like for the user?

## Context
- Files to read first
- Related docs
- Prerequisites (previous plans, env setup)

## Steps
- [ ] 1. …
- [ ] 2. …

## Definition of Done
- [ ] All steps checked
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` green
- [ ] (relevant) `pnpm dev` shows expected UI
- [ ] (relevant) tested on mobile viewport (375px and 414px)
- [ ] Committed with conventional message

## Notes for next plan
(Anything the next plan should know — schema updates, tech debt, etc.)
```
