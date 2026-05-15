# Plan 28 — NPCs récurrents

## Goal
DM creates and manages NPCs (marchands, alliés, contacts, ennemis récurrents) as first-class entities — distinct from monsters (one-off combatants) and PJs (player-owned). Each NPC has a fiche light, can be invoked as an encounter participant when needed, and appears in a campaign NPC directory.

## Context
Read `docs/DATA-MODEL.md`, `docs/PERMISSIONS.md`, the `monsters.json` content schema.

## Prerequisites
Plans 14-24 complete.

## Steps

### Data model + rules
- [ ] 1. Add to `docs/DATA-MODEL.md`:
    ```ts
    campaigns/{campaignId}/npcs/{npcId}: {
      id, name, role: 'merchant' | 'ally' | 'enemy' | 'contact' | 'noble' | 'other',
      location: string,
      shortDescription: string,           // 1-2 sentences
      publicDescription: string,          // Markdown, visible to players
      dmNotes: string,                    // Markdown, DM-only secret
      portrait: { type: 'letter' | 'svg' | 'image', value: string },
      combatStats: {                       // optional — null for non-combat NPCs
        monsterContentId?: string,         // ref to a monster for full stats
        cr?: number, ac?: number, hp?: number,
        notes?: string,
      } | null,
      relationships: Array<{ characterId: string, attitude: 'friendly' | 'neutral' | 'hostile' | 'unknown' }>,
      tags: string[],                      // 'recurring', 'merchant-magic', 'faction-x'...
      visibility: 'all' | 'dm',            // 'dm' means players don't see this NPC at all
      createdBy, createdAt, updatedAt,
    }
    ```
- [ ] 2. Update `firestore.rules`: DM full write. Players read where `visibility === 'all'`, but only the public fields (`name, role, location, shortDescription, publicDescription, portrait, relationships, tags`). `dmNotes` and `combatStats` never visible to players — enforce via rule predicates filtering returned fields (or just query at client and trust rules to fail otherwise — Firestore rules can't filter fields, so the client-side filter is the practical path).

### NPC directory
- [ ] 3. Route `/campaign/:id/npcs` → `<NPCDirectory />`.
- [ ] 4. List NPCs with cards: portrait, name, role chip, location, short description.
- [ ] 5. Filter by role / tag / location.
- [ ] 6. Tap card → `<NPCDetailScreen />` showing public info (and DM-only sections if viewer is DM).

### DM create/edit
- [ ] 7. DM-only "Créer un PNJ" button → `<NPCEditScreen />`:
    - All fields above
    - Linking to monster: search the monsters DB; on link, autofill combatStats from monster
    - Portrait upload to Firebase Storage
    - Visibility toggle (all / dm)
- [ ] 8. Edit/delete from NPC detail screen.

### Encounter integration
- [ ] 9. In `<EncounterCreateModal />` (from plan 24), add "Ajouter un PNJ" alongside "Ajouter un monstre". DM picks from existing NPCs.
- [ ] 10. NPC becomes a participant in the encounter with `type: 'npc'`, `npcId: id`. If linked to a monster, stats come from the monster ref; else from `combatStats` inline.
- [ ] 11. NPCs in combat are DM-controlled like monsters.

### Relationships
- [ ] 12. On NPC detail, "Relations" section: list of PJs with current attitude chip. Tap to edit attitude (DM only) or add new relationship.
- [ ] 13. Optional: surface NPC relationships on character sheet's Âme tab (post-v1, defer).

### Event types
- [ ] 14. Add to `docs/EVENT-LOG.md`:
    - `npc-introduced` (`visibility: 'all'` if visibility=all, else 'dm') — payload: npcId
    - `npc-attitude-changed` — payload: npcId, characterId, before, after

### Tests
- [ ] 15. e2e: DM creates merchant NPC, players see in directory, DM creates secret villain NPC (visibility 'dm'), players don't see them, DM invokes goblin NPC in encounter from saved NPCs.

### Final
- [ ] 16. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 17. Commit: `feat(dm-view): NPCs récurrents (plan 28) — end Sprint 3`
- [ ] 18. Tag v0.0.3

## Definition of Done
- [ ] NPCs collection + rules deployed
- [ ] Directory + create/edit works
- [ ] DM-only NPCs invisible to players
- [ ] NPC invokable in encounters
- [ ] Relationships tracked
- [ ] **End of Sprint 3** — tag v0.0.3

## Notes for next plan
- End of S3. Sprint 4 (maps) starts with plan 29.
- NPCs can later evolve to support "faction" entities (a group of NPCs sharing reputation). Post-v1.
