# 5e variants

Four optional 5e rules togglable per campaign. Stored in `campaigns/{id}.settings.variants`. All default `false` (RAW/SRD strict). Read from active campaign at runtime via `useActiveCampaign().settings.variants`.

```ts
type CampaignVariants = {
  featAtLevel1: boolean;
  flanking: boolean;
  slowHealing: boolean;
  grittyRealism: boolean;
};
```

## featAtLevel1

**What it does** (5e): every character chooses one feat at character creation, in addition to whatever class/background grants.

**Where wired**:
- **Plan 17 (Wizard creation)**: if `featAtLevel1 === true`, add step "Don de départ" between Classe and Caractéristiques. Player picks a feat from `feats.json` (filtered by prerequisites).
- Storage: granted feat goes into `character.featureUsage[featRef]` if it has usage, and any proficiency it grants into `character.extraProficiencies`.
- **Plan 05 (manual form)**: NOT honored — manual form is power-user, the user knows what to add manually.

## flanking

**What it does** (5e): a creature is flanked when at least two of its enemies are on opposite sides. Flanking creatures get advantage on melee attacks.

**Where wired**:
- **Plan 24 (Encounters)** + **Plan 28 (Tokens)**: when computing attack advantage in the encounter combat HUD, check `flanking === true` and compute from positions. Uses `lib/rules/flanking.ts` (returns true/false given attacker, target, allies' positions, grid).
- If no map / no positions available, flanking detection is a no-op (toggle still on but no auto-detection).
- DM can always manually toggle advantage on any roll regardless of variant.

## slowHealing

**What it does** (5e): a long rest restores spent hit dice (rolled) instead of all HP. Gritty alternative.

**Where wired**:
- **Plan 11 (Radial FAB) → Repos long action**: branch on variant.
  - `false`: HP → max, hit dice restored up to floor(max/2).
  - `true`: HP regained = sum of hit dice spent during last rest period rolled + CON mod each; hit dice restored up to floor(max/2).
- Toast says explicitly "Repos long (slow healing)" so the player understands.

## grittyRealism

**What it does** (5e): timing is 8 hours for a short rest and 7 days for a long rest. Slows down adventure pacing dramatically.

**Where wired**:
- **Plan 11 (Radial FAB) → Repos sub-menu**: relabel buttons to "Repos court (8h)" / "Repos long (7 jours)" when variant is on.
- **Plan 23 (Sessions)**: optional session timer / in-game clock displays time differently (minor UX touch).
- No mechanical change beyond labels — the rest effects are the same, only their narrative timing differs.

## Adding a new variant later

Schema migration:
1. Add new boolean field to `CampaignVariants`.
2. Increment `campaigns.schemaVersion`.
3. Default to `false` on read for older docs (migration runs lazily).
4. Wire it where it applies, with a doc note here.

Post-v1 candidates: lingering injuries, hero points, levelling proficiency, healing surges, optional class features 2024.
