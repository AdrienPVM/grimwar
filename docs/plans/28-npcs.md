# Plan 28 — NPCs récurrents

## Goal
DM creates and manages NPCs (marchands, alliés, contacts, ennemis récurrents) as first-class entities — distinct from monsters (one-off combatants) and PJs (player-owned). Each NPC has a fiche light, can be invoked as an encounter participant when needed, and appears in a campaign NPC directory.

## Context
Read `docs/DATA-MODEL.md`, `docs/PERMISSIONS.md`, the `monsters.json` content schema.

## Prerequisites
Plans 14-24 complete.

## Steps

> **Statut (2026-06-25) — livré sauf upload portrait image (différé 28b).**
> Tout le plan est livré et testé (unit + rules-unit + e2e). Seuls deux points
> sont **différés**, chacun bloqué par une infra absente, documentés inline :
> (a) **upload portrait image** (Firebase Storage, step 7) → sous-plan **28b**,
> même blocage que 27b ; le portrait V1 est un glyphe (lettre/emoji), comme les
> PJ. (b) **autofill monstre** (step 7) : `monsters.json` est VIDE (0/332) — le
> lien bestiaire est différé jusqu'au plan SRD-bestiaire ; les stats de combat se
> saisissent à la main (CR/CA/PV/notes), même stopgap que la modale de rencontre.
> Le **tag v0.0.3 + push** restent à valider par Adrien (UAT + sprint close).

### Data model + rules
- [x] 1. Add to `docs/DATA-MODEL.md` (déjà présent ; note V1 ajoutée : masquage
    client de `dmNotes`/`combatStats`, et intégration rencontre sans champ `npcId`
    sur le participant — ajouter `npcId` serait un changement de schéma, sign-off
    Adrien requis ; le combat marche sans back-réf).
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
- [x] 2. `firestore.rules` (bloc `campaigns/{cid}/npcs`) : MJ full write + read (gardé `isDMOf` en tête, comme handouts/sessions). Joueur lit `visibility == 'all'` UNIQUEMENT. `dmNotes`/`combatStats` ne peuvent PAS être filtrés par champ (limite Firestore) → masquage CLIENT (`NpcDetailScreen`), documenté DATA-MODEL.md. 10 cas rules-unit (`tests/firestore-rules.test.ts`, 129/129).

### NPC directory
- [x] 3. Route `/campaigns/:cid/npcs` → `<NpcDirectoryScreen />`. **Déviation** : convention réelle `/campaigns/:cid/...` (le plan écrivait `/campaign/:id`, inexistant).
- [x] 4. Cartes : portrait médaillon, nom, chip de rôle, lieu, résumé (+ badge « Secret » MJ, badge « Combat »).
- [x] 5. Filtres rôle / tag / lieu (`npc-filter.ts`, pur + testé) — facettes dérivées de la liste.
- [x] 6. Tap carte → `<NpcDetailScreen />` (sections publiques + sections MJ masquées client si non-MJ).

### DM create/edit
- [x] 7. Bouton « Nouveau PNJ » MJ → `<NpcEditModal />` : tous les champs, toggle « PNJ combattant » (CR/CA/PV/notes en saisie manuelle), toggle visibilité all/dm. **DIFFÉRÉ** : (a) **upload portrait image** → sous-plan 28b (Firebase Storage absent, même blocage que 27b) — portrait V1 = glyphe ; (b) **autofill depuis un monstre** → `monsters.json` vide (0/332), lien bestiaire différé au plan SRD-bestiaire (saisie manuelle en attendant, même stopgap que la modale de rencontre).
- [x] 8. Édition/suppression depuis le détail (modale d'édition réutilisée + confirm de suppression).

### Encounter integration
- [x] 9. `<EncounterCreateModal />` : section « PNJ » listant les PNJ enregistrés ; le MJ coche ceux à ajouter.
- [x] 10. Le PNJ devient participant `type:'npc'` (déjà dans l'énum) + nom + PV (préremplis de `combatStats.hp`) + `monsterContentId` si lié. **Déviation** : PAS de champ `npcId` sur le participant (le plan le mentionnait) — l'ajouter serait un changement de schéma Firestore (sign-off Adrien). Le combat fonctionne sans back-réf ; portable à un plan dédié si besoin. Documenté DATA-MODEL.md.
- [x] 11. Les PNJ en combat sont contrôlés par le MJ comme les monstres (mécanique de participant identique).

### Relationships
- [x] 12. Détail → section « Relations » : liste des PJ avec chip d'attitude ; `<NpcRelationModal />` MJ pour poser/changer l'attitude (upsert `setNpcAttitude` + event `npc-attitude-changed`). « Ajouter une relation » = poser une attitude sur un PJ sans relation préalable.
- [~] 13. Optionnel (relations sur l'onglet Âme de la fiche) — **différé post-v1** comme prévu par le plan.

### Event types
- [x] 14. `docs/EVENT-LOG.md` + `event-logger.ts` + `event.ts` :
    - `npc-introduced` (visibilité MIRROR du PNJ : `all` si visible, sinon `dm`) — payload : npcId, name. Tiré à la création.
    - `npc-attitude-changed` (visibilité MIRROR) — payload : npcId, characterId, before, after.

### Tests
- [x] 15. e2e (`tests/e2e/npcs-uat.spec.ts`) : MJ crée un marchand PUBLIC + un ennemi SECRET combattant → annuaire MJ montre les deux (badge Secret) ; le joueur ne voit que le public ; détail MJ montre les sections réservées ; MJ invoque le PNJ secret en rencontre. **1 passed** contre l'émulateur. + unit : types (12), service (11), filtre (7), modale d'édition (5), détail/masquage (3), annuaire (2).

### Final
- [x] 16. `pnpm typecheck && pnpm test && pnpm lint` vert (2956 passed) ; `pnpm test:rules` 129/129 ; e2e npcs 1 passed.
- [x] 17. Commit `feat(dm-view): PNJ récurrents (plan 28)`.
- [!] 18. Tag v0.0.3 — **en attente UAT + sprint close Adrien** (le tag marque la fin de S3).

## Definition of Done
- [!] NPCs collection + rules **écrites et validées sur l'émulateur** (rules-unit 10 cas + e2e). **Deploy prod en attente** : `pnpm firebase:deploy:rules` AVANT mise en prod (requiert `firebase login`).
- [x] Directory + create/edit works
- [x] DM-only NPCs invisible to players (rule + rules-unit + e2e)
- [x] NPC invokable in encounters
- [x] Relationships tracked
- [!] **End of Sprint 3** — tag v0.0.3 (en attente UAT + go Adrien)

## Notes for next plan
- **Sous-plan 28b (portrait image)** : ajouter l'upload Firebase Storage du portrait PNJ — mutualisé avec 27b (handouts image). Réactiver `type:'image'` dans `NpcEditModal`, brancher `portrait.value` sur l'URL Storage. `NpcPortrait` rend déjà le glyphe ; le rendu image viendra avec.
- **Lien bestiaire** : quand `monsters.json` sera peuplé (plan SRD-bestiaire), brancher la recherche + autofill `combatStats` depuis un monstre dans `NpcEditModal` (le champ `monsterContentId` existe déjà au schéma).
- **Deploy en attente** : `firestore.rules` (bloc npcs) à `pnpm firebase:deploy:rules` avant prod.
- S3 terminé après le tag. Sprint 4 (cartes) démarre au plan 29.

## Notes for next plan
- End of S3. Sprint 4 (maps) starts with plan 29.
- NPCs can later evolve to support "faction" entities (a group of NPCs sharing reputation). Post-v1.
