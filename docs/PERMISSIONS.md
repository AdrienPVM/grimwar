# Permissions

The locked decision: **DM has full authority** over every character in their campaign. This document codifies how that gets enforced.

## Roles

| Role | Earned by | Number per campaign |
|---|---|---|
| **DM** | Creating the campaign | Exactly 1 (the creator) |
| **Player** | Joining via invite code/link with a character | 1-∞ |
| **Spectator** | Joining via invite code/link without a character (S2+, if `settings.enableSpectators`) | 0-∞ |

Membership doc has `role: 'dm' | 'player' | 'spectator'`. Role is locked at join time (no role changes for v1 — defer to post-launch).

## Permission matrix

Legend: **R** = read, **W** = write, **—** = no access.

### Campaign-level

| Resource | DM | Player | Spectator | Non-member |
|---|---|---|---|---|
| `campaigns/{id}` doc | R/W | R | R | — |
| `campaigns/{id}/memberships/*` | R/W | R | R (visible roster) | — |
| `campaigns/{id}/sessions/*` | R/W | R | R | — |
| `campaigns/{id}/encounters/*` | R/W | R (filtered by visibility) | R (limited) | — |
| `campaigns/{id}/customContent/*` | R/W | R | R | — |
| `campaigns/{id}/events/*` | R | R (filtered by visibility) | R (limited) | — |
| `campaigns/{id}/maps/*` (S4) | R/W | R (with fog applied) | R (with fog applied) | — |

### Character-level

A character lives under `users/{ownerId}/characters/{characterId}`. Access depends on:
- Who is requesting (`request.auth.uid`)
- Who owns the character (`ownerId`)
- Whether the requester is DM of a campaign the character is currently in

```
A user `u` can READ a character `c` (owned by `ownerId`) if:
  u == ownerId
  OR u is DM of any campaign where c is a member
  OR u is a co-member of a campaign where c is also a member (read-only)

A user `u` can WRITE a character `c` (owned by `ownerId`) if:
  u == ownerId
  OR u is DM of any campaign where c is currently in `presentInCampaigns`
```

This is the **DM full authority** model: any DM of any campaign the character has joined can edit the character.

> **État d'implémentation (JALON 4A.1 → 4A.3, 2026-06-23)** — le prédicat ci-dessus est la cible. Ce qui est **réellement câblé** dans `firestore.rules` à ce stade :
> - **READ MJ** : implémenté en **Voie A2** (`gmCanReadLinkedCharacter`). Au lieu d'« any campaign where c is a member », la rule suit le pointeur unique `homeCampaignId` de la fiche et vérifie en *live* `(u ∈ gmIds)` ∧ `(members/{owner} existe)` ∧ `(members.characterId == c)`. Conséquence : **un perso = une campagne d'attache à la fois** (compromis V1 acté — cf. `docs/plans/MVP-V1-DECISIONS-PRISES.md > [JALON-4A.1]`).
> - **UI consommatrice (JALON 4A.3 → plan 26)** : le MJ ouvre la fiche d'un joueur lié via `/campaigns/:cid/members/:memberUid/sheet` (affordance « Voir la fiche » du roster). Depuis le **plan 26**, la fiche est rendue en **OMNI-EDIT** : `PermissionProvider value={{ canEdit: true, isDM: true, isDMEdit: true, ownerUid: memberUid, lockedFields: DM_LOCKED_FIELDS }}` → tous les contrôles d'édition sont actifs, une **barre dorée « Édition MJ »** coiffe la fiche, et le **nom** porte un cadenas (réservé au joueur). Le FAB d'historique des jets reste masqué (la sous-collection de jets vit hors périmètre de la rule cross-owner). ⚠️ **Cette UI rend le deploy de `firestore.rules` obligatoire avant toute mise en prod** — sans deploy, le MJ obtient `permission-denied` à l'écriture.
> - **READ co-membre** (« co-member read-only ») : **pas encore ouvert** — l'autorisation cross-owner est MJ-only.
> - **WRITE MJ** (DM omni-edit) : **CÂBLÉ — plan 26, Voie B « rules-only » (PAS de Cloud Function)**. `firestore.rules > allow update` autorise le MJ via la MÊME autorité *live* que la lecture (`gmCanReadLinkedCharacter`) + `dmOmniEditLockedFieldsUnchanged()` qui impose l'immuabilité des champs réservés au propriétaire (`name`, `personality`, `homeCampaignId`). `useUpdateCharacter` route l'écriture vers `users/{ownerUid}/...` (lu depuis le contexte de permission) et journalise un événement d'audit `dm-edit` (visibilité `all` → feed MJ + onglet Events de séance + journal de campagne). **⚠ SUPERSEDE la décision plan 16 « omni-edit via Cloud Function (Admin SDK) »** : le pointeur unique `homeCampaignId` (A2) a levé l'obstacle « arrays cross-collection non vérifiables », rendant l'autorité MJ vérifiable côté rules sans backend Functions ni plan Blaze. Acté 2026-06-25.

### Special fields

Some fields are sensitive even to the DM authority model:

| Field | Who can write |
|---|---|
| `name`, `personality.*`, `homeCampaignId` | Owner only — these are player identity, even DM shouldn't change |
| Everything else (PV, conditions, position, items, sorts, level, abilities…) | Owner + any DM of joined campaigns |

This is enforced in security rules with field-level validation (see `firestore.rules`).

## Common scenarios

### Scenario: Player rolls damage on themselves
- Player writes `hp.current -= damage` on their own character. ✅ Allowed (owner write).
- An event is logged with `actorUserId = playerId`, `targetCharacterId = playerCharacterId`.

### Scenario: DM applies condition during combat
- DM writes `conditions += 'frightened'` on a player's character. ✅ Allowed (DM authority).
- Event logged with `actorUserId = dmId`, `targetCharacterId = playerCharacterId`.

### Scenario: Player tries to edit another player's character
- Not the owner. Not the DM. ❌ Denied at rules level.

### Scenario: DM tries to change a player's personality.backstory
- DM has authority on most fields BUT `personality.*` is owner-locked. ❌ Denied at rules level.
- (UX: DM can suggest via the journal or a "request edit" event, deferred to post-v1.)

### Scenario: Player leaves campaign
- Player updates own membership `status: 'left'`. ✅ Allowed (membership owner).
- DM can re-invite or remove permanently.
- Character is removed from `presentInCampaigns` for that campaign — DM loses write access on that character.

### Scenario: Spectator joins
- Joins via invite. `role: 'spectator'`. No character.
- Read-only on campaign + sessions + members. Events visibility: only `'all'`-visible events.
- Cannot write anything.

## Permission helpers in code

`src/shared/lib/permissions.ts` exports:

```ts
canEditCharacter(user: User, character: Character, campaigns: Campaign[]): boolean
canEditCharacterField(user: User, character: Character, field: string, campaigns: Campaign[]): boolean
canReadCampaign(user: User, campaign: Campaign, membership: Membership | null): boolean
canViewEvent(user: User, event: Event, membership: Membership | null): boolean
canEditMembership(user: User, membership: Membership): boolean
isDMOf(user: User, campaign: Campaign): boolean
isPlayerOf(user: User, campaign: Campaign): boolean
isSpectatorOf(user: User, campaign: Campaign): boolean
```

These run **client-side** for UX (gray out buttons, hide menus) but are **not security**. Firestore rules are the real enforcement.

## Event visibility model

Each event has `visibility: 'all' | 'dm' | 'self'`.

| Visibility | Who can read |
|---|---|
| `'all'` | DM + all players + spectators in the campaign |
| `'dm'` | DM only — used for monster rolls behind the screen, secret encounter triggers, treasure rolls |
| `'self'` | DM + the player whose character is `actorCharacterId` or `targetCharacterId` — used for private rolls a player makes "in secret" |

Default for most events: `'all'`. DM can make any event private at creation time via the DM-side UI.

## Post-v1 considerations (not in scope now)

- Configurable permission modes (DM picks at campaign creation)
- Co-DM role
- Role transitions (player → DM after handoff)
- "Request edit" workflow for owner-locked fields
- Field-level diff log (who changed what when, beyond audit `updatedBy`)
