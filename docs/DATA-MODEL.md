# Data model

## Conceptual model

```
User ──── owns ──── Characters[]
   │                    │
   │                    ├── joins ──► Campaign[]
   │                    │
   │                    └── carries ──► Inventory(items DB refs)
   │
   └─── DMs / Plays ──► Campaign
                         │
                         ├── Memberships ──► User+Character mapping
                         ├── Sessions     ──► attendance, notes
                         ├── Encounters   ──► initiative, monsters, fog
                         ├── Events       ──► auto-log of everything
                         └── CustomContent (campaign-scoped homebrew)

Public content (SRD/Free Rules) ──► bundled JSON, read by everyone
```

## Key invariants

1. **Characters are owned by Users**, not Campaigns. A character can be in multiple campaigns.
2. **DM has full edit authority** on any character in their campaign — enforced by security rules.
3. **All entities have i18n names**: `{ fr: '…', en?: '…' }`. UI resolves via current locale.
4. **All gameplay actions log an event**. Events are append-only.
5. **Inventory items are strict references** — never free strings. References resolve in this priority order: public content → user customContent → campaign customContent.
6. **DMG / PHB / MM content** is private, lives in user's customContent, never bundled.
7. **PDFs are source of truth #1**. AideDD provides FR translations of names/descriptions only.

## i18n entity shape

Every entity that has user-facing prose has an `i18n` shape:

```ts
type I18n = { fr: string; en?: string };
```

Example:

```ts
{
  id: 'fireball',
  name: { fr: 'Boule de feu', en: 'Fireball' },
  description: { fr: 'Une vive lueur jaillit…', en: 'A bright streak flashes…' },
  school: 'evocation',                    // not translated, internal key
  level: 3,
  // …mechanical fields (not translated)
}
```

`src/shared/lib/i18n.ts` exports a `localize(value: I18n, locale: 'fr' | 'en'): string` that returns `value[locale] ?? value.fr`. Always FR fallback.

## Firestore collections

### `users/{userId}`

```ts
{
  uid: string,
  displayName: string | null,
  email: string | null,
  emailVerified: boolean,
  photoURL: string | null,
  isAnonymous: boolean,
  locale: 'fr' | 'en',
  tier: 'free' | 'pro',                   // placeholder, no paywall yet
  settings: {
    reducedMotion: boolean,
    soundOn: boolean,
    diceTheme: 'gold' | 'amethyst' | 'crimson',
    sheetDefaultMode: 'combat' | 'essence' | 'magie' | 'avoir' | 'ame',
    diceMode: 'digital' | 'physical',         // default 'digital'
    followCampaignDiceMode: boolean,          // default true; inerte tant qu'il n'y a pas de campagne (S1 = solo)
  },
  createdAt: Timestamp,
  lastSeenAt: Timestamp,
}
```

### `users/{userId}/characters/{characterId}`

The player owns and edits this. **DMs of joined campaigns can also write** (enforced by rules).

```ts
{
  id: string,
  name: string,                            // not i18n — players choose their own name
  status: 'alive' | 'dead',                // sticky; flip via deathSaves or DM revive
  
  // Mechanical refs (all keys, resolve via content)
  // Multi-class supported v1: an array of classes with per-class levels.
  // v2 (plan 13.7): chaque entrée porte ses 7 sous-choix SRD niveau 1.
  classes: Array<{
    classId: string,
    subclassId: string | null,
    level: number,                         // class level (1-20)
    // Sous-choix L1 SRD 5.2.1 (plan 13.7 §0.1). Sentinelles si non-applicable.
    clericDivineOrder: 'protector' | 'thaumaturge' | null,
    druidPrimalOrder: 'magician' | 'warden' | null,
    fighterFightingStyle: 'archery' | 'defense' | 'great-weapon-fighting' | 'two-weapon-fighting' | null,
    weaponMasteries: string[],             // weapon ids (count selon la classe)
    expertiseSkills: string[],             // skill ids (Roublard L1 = 2)
    eldritchInvocations: string[],         // invocation ids (Warlock L1 = 1)
    wizardSpellbookL1: string[],           // 6 spell ids inscrits (Wizard L1)
  }>,
  totalLevel: number,                      // denormalized sum (for fast queries + 5e prof bonus)
  primaryClassId: string,                  // for saves proficiency (5e rule: only first class grants saves)

  ancestryId: string,
  // v2 (plan 13.7) : sous-objet groupé pour les sous-choix d'ascendance L1.
  // Discriminé sémantiquement par ancestryId (la validation conditionnelle vit
  // dans wizard-validation.ts, pas dans Zod). Sentinelles `null` si non-applicable.
  ancestrySubChoices: {
    dragonAncestry: 'black' | 'blue' | 'brass' | 'bronze' | 'copper' | 'gold' | 'green' | 'red' | 'silver' | 'white' | null,
    tieflingLegacy: 'abyssal' | 'chthonic' | 'infernal' | null,
    elfLineage: 'drow' | 'high-elf' | 'wood-elf' | null,
    gnomeLineage: 'forest' | 'rock' | null,
    goliathAncestry: 'cloud' | 'fire' | 'frost' | 'hill' | 'stone' | 'storm' | null,
    ancestryCastingAbility: 'int' | 'sag' | 'cha' | null,
    ancestryExtraSkill: string | null,     // skill id (Elfe Sens Aiguisés, Humain Skillful)
    ancestrySize: 'small' | 'medium' | null,
  },
  // v2 (plan 13.7) : retiré, remplacé par `ancestrySubChoices.{elfLineage|gnomeLineage|...}`.
  // subancestryId: string | null,
  backgroundId: string,
  extraLanguages: string[],                // v2 (plan 13.7) : racine, agrège plusieurs sources
  
  experience: number,
  alignment: string,                       // e.g. 'NB'
  
  // Abilities
  abilities: { for: number, dex: number, con: number, int: number, sag: number, cha: number },
  saves: { for: boolean, dex: boolean, con: boolean, int: boolean, sag: boolean, cha: boolean },
  skills: { [skillKey: string]: 0 | 1 | 2 },     // 0 = none, 1 = prof, 2 = expert

  // Combat state
  hp: { current: number, max: number, temp: number },
  ac: number,                              // cached calculation
  speed: number,
  initiative: number,
  hitDice: Array<{ classId: string, current: number, max: number, die: 'd6' | 'd8' | 'd10' | 'd12' }>,
  deathSaves: { success: number, fail: number },
  conditions: string[],                    // refs to conditions content
  inspiration: boolean,
  exhaustion: number,                      // 0-6
  currentConcentration: { spellId: string, slotLevel: number } | null,

  // Resources (per-class)
  classResources: {
    [resourceId: string]: { current: number, max: number, restoresOn: 'short' | 'long' },
  },

  // Magic (multi-class spellcasters use 5e unified slot table from sum of caster levels)
  spellSlots: { [level: string]: { current: number, max: number } },
  // Per-class prepared/known lists (multi-class wizards/clerics keep them separate)
  preparedSpells: { [classId: string]: string[] },
  knownSpells: { [classId: string]: string[] },
  spellcastingAbility: { [classId: string]: 'int' | 'sag' | 'cha' | null },

  // Inventory — STRICT references
  inventory: {
    items: Array<{
      contentId: string,
      contentScope: 'public' | 'user' | 'campaign',
      contentSource?: string,              // for 'campaign', the campaignId
      qty: number,
      equipped: boolean,
      attuned: boolean,
      notes: string,                       // player's notes, FR free text — allowed here
    }>,
    coins: { cu: number, ar: number, el: number, or: number, pl: number },
    weightCache: number,
  },

  // Personality (Âme mode) — FR free text, allowed
  personality: {
    trait: string,
    ideal: string,
    bond: string,
    flaw: string,
    backstory: string,
  },

  // Features (refs to content + per-character usage state)
  featureUsage: {
    [featureRef: string]: { current: number, max: number, restoresOn: 'short' | 'long' },
  },
  
  // Proficiencies (refs)
  extraProficiencies: {
    armor: string[],
    weapons: string[],
    tools: string[],
    languages: string[],
  },

  // Campaign membership tracking
  presentInCampaigns: string[],            // campaignIds the player has joined this PJ into
  homeCampaignId: string | null,           // currently focused

  // Stats (campaign-aggregated; per-campaign stats live on the membership)
  stats: {
    totalRolls: number,
    totalD20Sum: number,
    crits: number,
    fumbles: number,
    skillUses: { [skillKey: string]: number },
  },

  // Portrait
  portrait: { type: 'letter' | 'svg' | 'image', value: string },

  // Meta
  schemaVersion: number,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedBy: string,                       // userId — for audit (DM edit vs player edit)
}
```

#### Multi-class derived values

5e multi-class rules baked into helpers in `src/shared/lib/rules/multiclass.ts`:
- `totalLevel = sum(classes[].level)`
- `proficiencyBonus(totalLevel)` — standard table
- `maxHp` = sum across classes of `(level === 1 ? maxHitDie : avgHitDie) + conMod * level`
- `casterLevel` = sum of (full-casters × 1) + (half-casters × 0.5 floor) + (third-casters × 0.33 floor)
- Spell slots derived from `casterLevel` via the 5e multi-class table (not per-class tables)
- Save proficiencies: ONLY from `primaryClassId` (first class taken)
- Each subsequent class grants only the "Multi-class proficiencies" subset (per SRD)

#### Character status — alive vs dead

- `status: 'alive'` is default
- When `hp.current === 0` AND `deathSaves.fail === 3`: client sets `status: 'dead'` + logs `death` event
- Dead characters: sheet enters **read-only mode** (no rolls, no edits, no level-up). Read-only for owner AND DM.
- **DM revive**: a DM-only button on a dead character's sheet → flips `status: 'alive'`, sets `hp.current = 1`, resets `deathSaves`, logs `revival` event (visibility: 'all')
- A dead character cannot be removed from `presentInCampaigns` automatically — DM/owner decides whether to retire

#### Dice mode resolution

Helper `effectiveDiceMode(user, campaign | null)` lives in `src/shared/lib/rules/dice-mode.ts` :

```ts
function effectiveDiceMode(
  user: { settings: { diceMode: 'digital' | 'physical'; followCampaignDiceMode: boolean } },
  campaign: { settings: { diceMode: 'digital' | 'physical' } } | null,
): 'digital' | 'physical' {
  if (!campaign) return user.settings.diceMode;                       // S1 / solo
  if (user.settings.followCampaignDiceMode) return campaign.settings.diceMode;
  return user.settings.diceMode;                                      // override personnel
}
```

- En S1, il n'y a pas de campagne → toujours `user.settings.diceMode`.
- En S2+, le défaut est de suivre la campagne (`followCampaignDiceMode: true`) : le MJ décide pour la table. Un joueur peut décrocher (`followCampaignDiceMode: false`) pour utiliser son propre mode (ex. un joueur en distanciel sans dés physiques).

Le mode physique :
- L'app affiche la formule à lancer (`1d20`, `2d6+3`, etc.).
- Le joueur saisit la/les face(s) brute(s) (valeur par dé, validation stricte 1..N).
- L'app applique modificateurs, détecte nat 20 / nat 1 sur les d20, gère avantage/désavantage (2 saisies, garde la bonne).
- Saisir est **optionnel** : le joueur peut « Passer » et fermer sans rien logger.
- Les dégâts produits remontent au MJ qui sélectionne la cible et applique. **Le joueur ne cible jamais.** Hand-off MJ implémenté en plan 24 (encounters S3) ; en S1, résultat local-only (toast + historique).

### `users/{userId}/customContent/{type}/{contentId}`

Private user homebrew + DMG extracts. `type` ∈ `spells | monsters | items | magicItems | feats | rules`.

```ts
{
  // …standard entity schema for the type
  source: 'dmg' | 'phb' | 'mm' | 'homebrew' | string,
  private: true,
  createdAt: Timestamp,
}
```

### `campaigns/{campaignId}` (V1 schema — JALON 4.0.1)

Source de vérité Zod : `src/shared/types/campaign.ts > CampaignSchema`.
Divergences délibérées vs la première rédaction de ce doc (S2 brouillon)
sont tracées dans `plans/MVP-V1-DECISIONS-PRISES.md > [JALON-4.0]` :
`gmIds[]` (array, anticipe co-MJ 4C) au lieu de `dmUserId`, settings
simplifiés (drop de `permissionMode`/`allowHomebrew`/`startingLevel`/`enableSpectators`),
`inviteToken` (lien URL) déféré à 4.0.5.

```ts
{
  id: string,
  name: string,                            // max 80 chars
  description: string,                     // FR, max 2000 chars
  gmIds: string[],                         // 1..8 UIDs; contient toujours createdBy
  createdBy: string,                       // UID créateur (immuable)
  inviteCode: string,                      // 6-char [A-Z2-9] − [01IO], e.g. 'KTL4M2'
  settings: {
    language: 'fr' | 'en',                 // default 'fr'
    diceMode: 'digital' | 'physical',      // default 'digital'
    variants: {
      featAtLevel1: boolean,               // default false — wizard ajoute feat-pick step L1
      flanking: boolean,                   // default false — combat HUD auto-détecte flanking sur la map (S4)
      slowHealing: boolean,                // default false — long rest restaure hit-dice, pas full HP
      grittyRealism: boolean,              // default false — short = 8h, long = 7j
    },
  },
  status: 'active' | 'paused' | 'archived',
  schemaVersion: 1,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**Champs déférés post-V1** (ré-introduits quand un consommateur réel apparaît) :
- `settings.permissionMode` — locked « dm-full » V1, plus de mode V1.5+
- `settings.allowHomebrew` — remplacé par le système custom-content (JALON 3)
- `settings.startingLevel` — hors-scope V1 (le wizard pose le perso à L1)
- `settings.enableSpectators` — pas de rôle spectator en V1
- `inviteToken` (lien URL invite) — 4.0.5 (UI invite par lien)

### `campaigns/{campaignId}/members/{userId}` (V1 schema — JALON 4.0.1)

Un doc par utilisateur dans la campagne. Doc ID = `userId` (lookup direct
`/members/{auth.uid}` côté rules sans index).

Source de vérité Zod : `src/shared/types/campaign.ts > MembershipSchema`.
Subcollection nommée `members` (et non `memberships`) — voir
`[JALON-4.0]` dans les décisions V1.

```ts
{
  userId: string,
  role: 'gm' | 'member',
  characterId: string | null,              // PJ du membre, null pour le MJ ou si pas encore choisi
  joinedAt: Timestamp,
  schemaVersion: 1,
}
```

**Champs déférés post-V1** :
- `characterOwnerId` — redondant tant que les fiches restent player-owned (1 PJ ⇒ 1 owner = userId)
- `status: 'active'|'invited'|'left'` — V1 utilise présence/absence du doc (kick = delete)
- `stats.*` (sessionsAttended, rollsInCampaign, critsInCampaign, deathsInCampaign) — la collection events portera ces métriques quand JALON 22 (event-log) livrera

### `campaigns/{campaignId}/sessions/{sessionId}`

```ts
{
  id: string,
  number: number,                          // 1, 2, 3…
  title: string,
  plannedDate: Timestamp | null,
  startedAt: Timestamp | null,
  endedAt: Timestamp | null,
  status: 'planned' | 'active' | 'completed' | 'cancelled',
  attendance: string[],                    // userIds who attended
  notes: string,                           // Markdown, DM-written, FR
  // The journal entry for this session is compiled from events; stored in journalCompiled when session ends
  journalCompiled: string | null,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### `campaigns/{campaignId}/events/{eventId}`

Append-only log. See `docs/EVENT-LOG.md` for the full event types.

```ts
{
  id: string,
  kind: EventKind,                         // 'roll' | 'hp-change' | 'condition' | 'spell-cast' | …
  actorUserId: string,                     // who triggered the event
  actorCharacterId: string | null,         // null if DM did it without a character context
  targetCharacterId: string | null,        // for events with a target
  sessionId: string | null,                // current session, if any
  encounterId: string | null,              // current encounter, if any
  payload: Record<string, unknown>,        // kind-specific data
  visibility: 'all' | 'dm' | 'self',       // who can read this event
  createdAt: Timestamp,
}
```

### `campaigns/{campaignId}/encounters/{encounterId}`

```ts
{
  id: string,
  name: string,
  sessionId: string | null,
  status: 'planned' | 'active' | 'completed' | 'aborted',
  round: number,
  turnIndex: number,
  participants: Array<{
    type: 'player' | 'monster' | 'npc',
    characterId: string | null,            // for players
    monsterContentId: string | null,       // for monsters (ref to public/user/campaign content)
    instanceId: string,                    // unique within encounter
    name: string,
    initiative: number,
    currentHp: number,
    maxHp: number,
    tempHp: number,
    conditions: string[],
    position: { x: number, y: number } | null,    // map coords
    notes: string,
  }>,
  mapId: string | null,
  fogState: Record<string, boolean> | null,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  startedAt: Timestamp | null,
  endedAt: Timestamp | null,
}
```

### `campaigns/{campaignId}/customContent/{type}/{contentId}`

Campaign-scoped homebrew. Visible to all members of the campaign. Items added to inventory reference these with `contentScope: 'campaign'`.

```ts
{
  // …standard entity schema for the type
  source: 'campaign-homebrew',
  createdBy: string,                       // DM userId
  createdAt: Timestamp,
}
```

### `campaigns/{campaignId}/maps/{mapId}` (S4)

```ts
{
  id: string,
  name: string,
  importSource: 'dd2vtt' | 'image' | 'custom',
  // dd2vtt-derived fields
  width: number, height: number,           // pixels
  pixelsPerGrid: number,
  imageData: string,                       // Storage URL
  walls: Array<{ x1, y1, x2, y2 }>,
  lights: Array<{ x, y, color, radius, intensity }>,
  portals: Array<{ ... }>,
  // grimwar-added
  fogState: Record<string, boolean> | null,
  createdAt: Timestamp,
}
```

### `campaigns/{campaignId}/handouts/{handoutId}` (S3, plan 27)

DM-to-player documents sent during sessions.

```ts
{
  id: string,
  title: string,
  type: 'image' | 'text' | 'mixed',
  content: {
    text?: string,                          // Markdown, FR
    imageUrl?: string,                      // Firebase Storage URL
  },
  recipients: string[] | 'all',             // userIds, or 'all' = everyone except DM
  revealedTo: string[],                     // userIds who have opened it
  visibility: 'sent' | 'revealed' | 'archived',
  createdBy: string,                        // DM userId
  createdAt: Timestamp,
}
```

### `campaigns/{campaignId}/npcs/{npcId}` (S3, plan 28)

Recurring NPCs — distinct from one-off monsters and player-owned PJs.

```ts
{
  id: string,
  name: string,
  role: 'merchant' | 'ally' | 'enemy' | 'contact' | 'noble' | 'other',
  location: string,
  shortDescription: string,                  // 1-2 sentences
  publicDescription: string,                 // Markdown, FR, visible to players
  dmNotes: string,                           // Markdown, DM-only secret
  portrait: { type: 'letter' | 'svg' | 'image', value: string },
  combatStats: {
    monsterContentId?: string,               // ref to a monster for full stat block
    cr?: number, ac?: number, hp?: number,
    notes?: string,
  } | null,
  relationships: Array<{
    characterId: string,
    attitude: 'friendly' | 'neutral' | 'hostile' | 'unknown',
  }>,
  tags: string[],
  visibility: 'all' | 'dm',                  // 'dm' = players don't see this NPC at all
  createdBy, createdAt, updatedAt,
}
```

### `publicStats/{slug}` (S5, plan 39)

Public, no-auth-required snapshot of a campaign's aggregated stats. Computed by Cloud Function, cached.

```ts
{
  slug: string,                              // primary key
  campaignId: string,
  campaignName: string,
  dmName: string | null,                     // null if anonymized
  startedAt: Timestamp,
  lastComputedAt: Timestamp,
  stats: {
    totalSessions: number,
    totalEvents: number,
    totalRolls: number,
    criticalHits: number,
    fumbles: number,
    monstersDefeated: number,
    deaths: Array<{ characterName: string, sessionNumber: number, cause: string }>,
    topSpells: Array<{ spellId: string, spellName: I18n, castCount: number }>,
    topSkills: Array<{ skillId: string, useCount: number }>,
    partyComposition: Array<{ class: I18n, count: number }>,
    sessionsTimeline: Array<{ number: number, date: Timestamp, encounters: number, deaths: number }>,
    mvps: Array<{ characterName: string, crits: number, kills: number }>,
  },
  ogImageUrl: string | null,
}
```

### `publicStatsSlugs/{slug}` — lookup index for slug uniqueness

```ts
{ slug: string, campaignId: string, createdAt: Timestamp }
```

### Invitation lookup index

To resolve `inviteCode` → campaign without exposing campaigns globally, we use a top-level lookup collection:

### `inviteCodes/{code}` (V1 schema — JALON 4.0.1)

Source de vérité Zod : `src/shared/types/campaign.ts > InviteCodeLookupSchema`.

```ts
{
  code: string,                            // 6-char [A-Z2-9] − [01IO] (primary key)
  campaignId: string,
  createdBy: string,                       // UID du MJ créateur
  createdAt: Timestamp,
}
```

**Lecture** : tout utilisateur authentifié peut lire par code (chemin de jonction).
**Écriture** : seul un GM de la campagne référencée peut créer/supprimer (rules
4.0.2). Un seul code actif par campagne — rotation manuelle (deferred V1.5+).

**Champs déférés post-V1** :
- `expiresAt` — pas d'expiration auto V1, MJ rotate manuellement si suspicion de fuite
- `uses` / `maxUses` — pas de cap d'usage V1, le code reste valide tant que le MJ ne le rotate pas

## Public content JSON (bundled in `public/data/`)

These are committed to the repo and shipped with the app. **PDFs are the source of truth**; AideDD provides FR translations of names/descriptions only.

### `spells.json`

```ts
type Spell = {
  id: string,                              // slug, e.g. 'fireball' — based on EN name
  name: I18n,                              // { fr: 'Boule de feu', en: 'Fireball' }
  level: number,                           // 0 = cantrip
  school: 'abjuration' | 'invocation' | 'divination' | 'enchantment'
        | 'evocation' | 'illusion' | 'necromancy' | 'transmutation',
  castingTime: I18n,
  range: I18n,
  components: { v: boolean, s: boolean, m: boolean, material?: I18n },
  duration: I18n,
  concentration: boolean,
  ritual: boolean,
  description: I18n,
  atHigherLevels: I18n | null,
  classes: string[],                       // class ids
  source: 'srd' | 'free-rules-2024',
};
```

### `monsters.json`

```ts
type Monster = {
  id: string,
  name: I18n,
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan',
  type: string,                            // not translated, internal key
  alignment: I18n,
  ac: number, acDetail: I18n | null,
  hp: { avg: number, formula: string },
  speed: { walk?, fly?, swim?, climb?, burrow? },
  abilities: { for, dex, con, int, sag, cha },
  saves: Partial<Record<keyof abilities, number>>,
  skills: Record<string, number>,
  resistances: string[], immunities: string[], vulnerabilities: string[],
  conditionImmunities: string[],
  senses: { darkvision?, blindsight?, tremorsense?, truesight?, passivePerception },
  languages: string[],
  cr: number, xp: number,
  traits: Array<{ name: I18n, description: I18n }>,
  actions: Array<{ name: I18n, description: I18n }>,
  reactions: Array<{ name: I18n, description: I18n }> | null,
  legendaryActions: Array<{ name: I18n, description: I18n }> | null,
  source: 'srd' | 'free-rules-2024',
};
```

### `items.json` / `magic-items.json`

```ts
type Item = {
  id: string,
  name: I18n,
  category: 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'pack' | 'mount' | 'vehicle',
  cost: { qty: number, unit: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' },
  weight: number,                          // kg
  description: I18n | null,
  damage?: { dice: string, type: string, typeLabel: I18n },
  properties?: string[],                   // refs to item-properties.json
  range?: { normal: number, max: number },
  acBase?: number, acDexMax?: number, strRequired?: number, stealthDisadvantage?: boolean,
  source: 'srd' | 'free-rules-2024',
};

type MagicItem = Item & {
  rarity: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary' | 'artifact',
  attunement: false | true | I18n,        // i18n for "by a wizard"
  magicDescription: I18n,
};
```

### `classes.json`, `ancestries.json`, `backgrounds.json`, `feats.json`, `conditions.json`, `rules.json`

Standard 5e entities with `I18n` shape for prose fields. Mechanical data unchanged.

## Local cache (Dexie)

```ts
class GrimWarDB extends Dexie {
  content: Table<{ id: string, type: string, data: unknown, fetchedAt: number }, [string, string]>;
  diceHistory: Table<{
    id: string,
    characterId: string,
    label: string,
    total: number,
    rolls: number[],                       // (legacy) valeurs naturelles retenues
    kind: string,
    timestamp: number,
    // Plan 12 — dice mode dual
    mode: 'digital' | 'physical',
    rawFaces: number[],                    // faces brutes saisies (physical) ou rollées (digital)
    keptFaces: number[],                   // sous-ensemble retenu (advantage/disadvantage)
    crit: boolean,
    fumble: boolean,
  }, string>;
  settings: Table<{ key: string, value: unknown }, string>;
  
  constructor() {
    super('grimwar');
    this.version(1).stores({
      content: '[type+id], type',
      diceHistory: 'id, characterId, timestamp',
      settings: 'key',
    });
  }
}
```

## Firestore indexes

See `firestore.indexes.json` for the canonical list. Required:
- `users/{uid}/characters` — order by `updatedAt DESC`
- `campaigns` — `dmUserId ASC`, `updatedAt DESC` (DM dashboard)
- `campaigns/{id}/memberships` — `userId ASC`
- `campaigns/{id}/events` — `createdAt DESC`, `sessionId ASC + createdAt DESC`, `actorCharacterId ASC + createdAt DESC`
- `campaigns/{id}/sessions` — `number ASC`
- `inviteCodes` — primary lookup by code

## Security model

See `firestore.rules` and `docs/PERMISSIONS.md` for the full rules. Summary:

- `users/{uid}/**` — only that user can read/write
- `campaigns/{id}` — DM has full write; members have read; non-members have NO access
- `campaigns/{id}/memberships/**` — DM full write; members read only their own + DM's; outside no access
- `campaigns/{id}/events/**` — DM read all; members read their own (visibility filter); append-only via Cloud Function or rules
- `campaigns/{id}/customContent/**` — DM full write; members read
- `users/{uid}/characters/{cid}` — owner full write; DMs of campaigns the character is joined into can write (see PERMISSIONS.md for the exact predicate)
- `inviteCodes/{code}` — authenticated users can read by code; only DMs can create/delete their codes

## Migration strategy

`schemaVersion` field on every top-level document (`users`, `campaigns`, `characters`). Migrations run lazily on read:

```ts
function migrateCharacter(raw: unknown): Character {
  let doc = raw as Character & { schemaVersion: number };
  if (doc.schemaVersion < 2) doc = migrateV1ToV2(doc);
  if (doc.schemaVersion < 3) doc = migrateV2ToV3(doc);
  return doc;
}
```

### v1 → v2 (plan 13.7, 2026-05-17)

Helper : `src/features/sheet/upgrade-character-v1-to-v2.ts`. Appelé par `useCharacter` à la lecture Firestore — si `schemaVersion === 1`, le doc est upgradé en mémoire avec sentinelles + ré-écrit immédiatement (`setDoc` fire-and-forget).

**Ce que la migration ajoute** :
- `ancestrySubChoices: { ... }` (sous-objet groupé, 8 champs `null` par défaut).
- `extraLanguages: []` à la racine.
- Sur chaque entrée de `classes[]` : 7 sous-choix de classe (sentinelles `null` / `[]`).
- `schemaVersion: 2`.

**Ce que la migration retire** : `subancestryId` (SRD ne modélise pas les lignages comme sous-ascendances ; les vrais sous-choix sont dans `ancestrySubChoices`).

**Décisions actées** :
- **Pas de step de rattrapage UI** dans le wizard pour compléter les vieilles fiches : les rares fiches v1 (Lyralei + persos UAT) sont supprimées et recréées à neuf. Construire un mécanisme de migration UI pour 3 fiches jetables = sur-effort rejeté.
- **Tolérance des sentinelles dans tous les modes de fiche** (Combat / Magie / Essence / Avoir / Âme) : robustesse non négociable.
- **Wizard durci** : `wizard-validation.ts` (étendu en 13.8/13.9) refuse de submit un perso avec un sous-choix SRD requis en sentinelle. Garantie : on ne crée jamais de perso SRD-incomplet.
- **firestore.rules option (b) tolérante** : `characterShapeOK` accepte v1 ET v2 en shape-only. Aucun deploy rules urgent.

Migration documentée dans ce fichier (pas de `docs/MIGRATIONS.md` séparé pour le moment ; le pattern est suffisamment simple pour vivre ici).
