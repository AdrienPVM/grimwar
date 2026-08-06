# Event log

Every gameplay action writes an event to `campaigns/{id}/events/{eventId}`. The journal compiler turns events into narrative.

## Why event sourcing

- Auto journal: turn events into a narrative session-by-session
- Replay: rewatch a fight roll-by-roll
- Audit: who changed what when (especially for DM edits)
- Stats: per-character, per-campaign metrics
- Product analytics later (commercial-ready)

## Single entry point

All events flow through **`src/shared/lib/event-logger.ts`** — one function per event kind. Components never write to the `events` collection directly. This guarantees:
- Consistent payload shape
- Correct visibility default per kind
- Optional aggregation hooks
- One place to add throttling / batching later

```ts
// Example signature
export async function logRoll(args: {
  campaignId: string,
  characterId: string | null,
  label: string,                          // 'Boule de feu', 'Sauvegarde Force'…
  expression: string,                     // '8d6'
  rolls: number[],
  modifiers: number,
  total: number,
  kind: 'attack' | 'damage' | 'save' | 'check' | 'init' | 'death-save' | 'custom',
  advantage: 'normal' | 'advantage' | 'disadvantage',
  crit: boolean,
  fumble: boolean,
  sessionId: string | null,
  encounterId: string | null,
  visibility?: 'all' | 'dm' | 'self',     // defaults to 'all' for rolls
}): Promise<void>
```

## Event kinds

| Kind | Triggered by | Default visibility | Payload key fields |
|---|---|---|---|
| `roll` | Any dice roll | `all` | label, expression, rolls, total, kind (attack/save/etc.), advantage, crit, fumble |
| `hp-change` | PV modified | `all` | before, after, delta, reason (damage/heal/temp), source (event/manual) |
| `temp-hp` | Temp HP gained | `all` | before, after, source |
| `condition-add` | Condition acquired | `all` | conditionId, source, duration |
| `condition-remove` | Condition dispelled | `all` | conditionId |
| `spell-cast` | Sort lancé | `all` | spellId, level, slotConsumed, components, targets |
| `slot-consumed` | Emplacement utilisé (out of cast context) | `all` | slotLevel, source |
| `slot-restored` | Repos | `all` | slotLevel, count, restType ('short' / 'long') |
| `resource-consumed` | Class resource (ki, sorcery, etc.) | `all` | resourceId, before, after |
| `resource-restored` | Repos | `all` | resourceId, restType |
| `item-acquired` | Item ajouté à l'inventaire | `all` | itemRef, qty, source ('loot' / 'shop' / 'gift' / 'dm') |
| `item-removed` | Item retiré | `all` | itemRef, qty, reason |
| `item-transferred` | Item donné à un autre PJ | `all` | itemRef, qty, fromCharacterId, toCharacterId |
| `item-equipped` | Item équipé | `all` | itemRef |
| `item-unequipped` | Item déséquipé | `all` | itemRef |
| `attunement-changed` | Attunement modifié | `all` | itemRef, attuned |
| `coins-change` | Coins modified | `all` | before, after, delta |
| `level-up` | Niveau gagné | `all` | newLevel (total), classId, className (localisé), classLevel, isNewClass |
| `xp-gain` | XP gagné ou retiré | `all` | delta (signé — négatif = correction MJ), total (après coup) |
| `rest` | Repos pris | `all` | type ('short' / 'long'), hpHealed, resourcesReset |
| `death-save` | Sauvegarde de mort | `all` | success/fail, currentTally |
| `death` | PJ mort | `all` | cause ('death-saves' / 'dm') |
| `revival` | PJ revenu à la vie | `all` | source ('nat20' / 'dm') — l'auteur est déjà dans `actorUserId` |
| `stabilize` | PJ stabilisé | `all` | |
| `inspiration-grant` | Inspiration accordée | `all` | byUserId |
| `inspiration-consume` | Inspiration utilisée | `all` | onEventId (refs the event it boosted) |
| `encounter-start` | Combat commence | `all` | encounterId, participants |
| `encounter-end` | Combat terminé | `all` | encounterId, outcome ('victory' / 'defeat' / 'fled') |
| `initiative-roll` | Init lancée (in encounter) | `all` | initiative |
| `turn-start` | Tour d'un participant | `all` | participantId |
| `turn-end` | Tour terminé | `all` | participantId |
| `monster-hp-change` | DM modifie PV monstre | `dm` | monsterInstanceId, before, after, delta |
| `dm-secret-roll` | DM rolls behind screen | `dm` | label, total |
| `treasure-drop` | DM annonce trésor | `all` | items, gold |
| `session-start` | Session démarrée | `all` | sessionId, attendance |
| `session-end` | Session terminée | `all` | sessionId, summary |
| `note` | Note manuelle (DM ou joueur) | `all` | text |
| `dm-edit` | DM édite un PJ via authority | `all` | targetCharacterId, fieldsChanged, before, after |
| `campaign-join` | Joueur rejoint | `all` | userId, characterId |
| `campaign-leave` | Joueur quitte | `all` | userId, reason |
| `handout-sent` | DM transmet un document | `all` | handoutId, recipients, title |
| `handout-revealed` | Joueur ouvre un document | `all` | handoutId, revealedByUserId |
| `npc-introduced` | DM crée un PNJ | `all` si PNJ `visibility:'all'`, sinon `dm` | npcId, name |
| `npc-attitude-changed` | Attitude d'un PNJ envers un PJ change | `all` si PNJ `visibility:'all'`, sinon `dm` | npcId, characterId, before, after |

## Common payload structure

```ts
type Event = {
  id: string,
  kind: EventKind,                         // see table above
  actorUserId: string,
  actorCharacterId: string | null,
  targetCharacterId: string | null,
  sessionId: string | null,
  encounterId: string | null,
  payload: Record<string, unknown>,        // kind-specific
  visibility: 'all' | 'dm' | 'self',
  createdAt: Timestamp,
}
```

## Campagne active (qui est la cible d'écriture) — décision 22.1 (2026-06-23)

Le logger doit savoir **dans quelle campagne** écrire, mais les call sites de jeu
(pivot de dés, patch de fiche) ne portent que le `characterId`. La « campagne
active » est tenue par un store Zustand (`useActiveCampaignStore`), lu de façon
**synchrone** par `event-logger.ts` (`getState()`).

Qui renseigne le store : l'écran de fiche du **propriétaire** (`SheetScreen` via
`useSyncActiveCampaign`), à partir de **`character.homeCampaignId`** — le pointeur
de routage posé au lien fiche↔membre (JALON 4A). Pas de mode « session » dédié :
une fiche liée joue *dans* sa campagne d'attache. Fiche non liée
(`homeCampaignId == null`) ⇒ store à `null` ⇒ **logger no-op silencieux** (c'est
le comportement S1 du stub historique, désormais réel). La lecture MJ (lecture
seule, JALON 4A.3) ne renseigne **pas** le store — le MJ ne joue pas à la place
du joueur.

`activeSessionId` reste `null` jusqu'au plan 23 (sessions) : les événements
hors-session portent `sessionId: null` et n'apparaissent dans aucun journal de
session compilé (le compilateur plan 25 groupe par `sessionId`). On journalise
tout dans la campagne ; la session découpe la narration plus tard.

Réversible : aucun changement de schéma ni de rule. Si un vrai mode « session »
devient nécessaire, il suffit de changer **qui** appelle `setActiveCampaign`.

## Visibility model

See `docs/PERMISSIONS.md#event-visibility-model`. Filtering happens at query time (Firestore rules + client-side `canViewEvent` for UX).

> **Gap RÉSOLU (JALON 22.3 — lecteur du flux).** La rule de READ `events`
> exigeait `isMemberOf(campaignId)`. Or un MJ n'a **pas** de doc `members/` (sa
> membership est sous-entendue par `gmIds[]`) → un MJ ne pouvait pas lire le flux
> de sa campagne. 22.3 a élargi le prédicat de base à `isMemberOf || isDMOf` ; le
> filtrage par visibilité reste per-doc. Le premier lecteur — le feed d'activité
> MJ dans `campaign-detail-screen` (`CampaignEventFeed` + `useCampaignEvents`) —
> s'abonne en temps réel (`onSnapshot`) via une **query contrainte**
> (`where visibility in ['all','dm']` pour le MJ) : la rule filtre par doc, donc
> une query non contrainte serait rejetée (même classe que 4.0.4). Index composite
> `(visibility ASC, createdAt DESC)` ajouté à `firestore.indexes.json`. Filtrage
> fin d'affichage via `canViewEvent` (plan 22 step 10). Couvert : rules-unit (MJ
> lit `all`/`dm` ✓, query contrainte ✓, query non contrainte ✗) + e2e
> `campaigns-dm-event-feed.spec.ts` (feed live contre les vraies rules).

## Append-only

Events are immutable after creation. No edit, no delete (except for GDPR-mandated user deletion). If a DM made a mistake, they log a **correction event** referencing the original.

## Throttling / batching

A high-frequency event source (e.g. 10 dice rolls in 5 seconds) writes 10 events. No batching for v1 — Firestore handles this fine for normal table play. If we hit cost issues post-launch, we can move to a Cloud Function batcher.

## Journal compilation (S3, plan 25)

Per session, the journal compiler:
1. Reads all events in `campaigns/{id}/events` where `sessionId == s` ordered by `createdAt ASC`
2. Groups by encounter / phase
3. Templates each event into a narrative sentence (FR)
4. Concatenates into a Markdown document
5. Stores in `campaigns/{id}/sessions/{sessionId}.journalCompiled`
6. DM can edit (becomes a snapshot — events still source of truth, edit is the "final" version)

Example templates:

| Event | Template (FR) |
|---|---|
| `roll` (attack, crit) | `{actor} attaque et obtient un **coup critique** (jet : {rolls}, total {total}) !` |
| `hp-change` (damage) | `{target} subit {abs(delta)} dégâts ({reason}) — PV : {before} → {after}` |
| `spell-cast` | `{actor} lance **{spell.name}** (niveau {level}, emplacement de niveau {slotConsumed} consommé)` |
| `level-up` | `{actor} atteint le **niveau {newLevel}** ! 🎉` |
| `death` | `**{target} tombe** sous {cause}.` |
| `item-acquired` (loot) | `{actor} récupère **{item.name}** (×{qty}).` |

Templates live in `src/features/journal/templates/` keyed by event kind. FR first; EN added in S5.

## Stats aggregation

Per character / per campaign / per session stats can be computed by reading events. For performance, we keep denormalized counters on:
- `users/{uid}/characters/{cid}.stats` (lifetime)
- `campaigns/{id}/memberships/{uid}.stats` (per-campaign)

These are updated by the `event-logger.ts` after a successful write. Inconsistency = bug, but events remain the truth.

## Replay (post-v1)

The replay feature reads events for a time range and replays them visually. Not in scope for v1, but the data model already supports it. We just need a UI that scrubs through events.
