# Plan 10 — Sheet Avoir mode

## Goal
Avoir mode shows the inventory (STRICT items DB references — no free strings), categorized, with weight bar, coin section, and add/remove flows that go through the items database.

## Context
Read `docs/DATA-MODEL.md` (inventory shape — STRICT REFERENCE), `CLAUDE.md` (forbidden patterns — no free-string items).

## Prerequisites
Plans 01-06, plus `src/shared/lib/inventory.ts` from plan 04.

## Steps

### Coin section
- [x] 1. `coins-section.tsx` : 5 chips (cu/ar/él/or/pl), tap = mode édition (input numérique), blur ou Enter applique. Total wealth en po affiché (conversion canonique 1pp=10po, 1or=2él=10ar=100cu).

### Weight bar
- [x] 2. `weight-bar.tsx` : fill basé sur `weightTotal / carryingCapacity`. Capacity = `FOR × 7.5 kg` (SRD 2024 Variant Encumbrance, conversion lbs→kg).
- [x] 3. Seuils encumbrance dans `inventory-rules.ts::computeEncumbrance` : `< FOR×2.25` normal / `< FOR×4.5` encombré / `>=` lourd. Variant `grittyRealism` non câblé en S1 (settings vivent sur la campagne en S2) — documenté dans `inventory-rules.ts`, à brancher en plan 14 (settings).

### Inventory list
- [x] 4. `inventory-list.tsx` : groupage Armes / Armures&boucliers / Outils / Sacs&kits / Équipement / Objets magiques / Divers / Inconnus. Search FR-insensible aux accents. Empty state distinct quand inventaire vide vs aucun résultat de recherche.
- [x] 5. Chaque row : nom (`localize`), chips Équipé (gold) / Lié (magic/amethyst), qty `×N` à droite quand > 1.
- [x] 6. Tap → `<ItemDetailModal />` : description (texte + propriétés en chips), Quantité (−/+, floor 1), Notes (textarea sauvée au blur), Équiper/Déséquiper, Lier/Délier, Retirer (avec confirm inline 2-tap).

### Add item flow
- [x] 7. `<AddItemModal />` ouvre depuis le header card. Search dans bundles publics items + magic-items, premiers 50 résultats. Sélection → qty input + bouton Ajouter. Throw silencieux → toast `fumble` (filet de sécurité, n'arrive pas si la sélection vient du bundle).
- [x] 8. Sous-bouton « + Maison » → `<CustomItemForm />` : nom, catégorie (8 options), poids, description. Écrit `users/{uid}/customContent/items/{slug-rand6}` (passe par Zod local), invalide le cache user Dexie, appelle `addItemToInventory(scope='user', scopeId=uid)` qui re-valide via Firestore. Pas de coût ni de propriétés détaillées en S1 (plan 19 enrichira).

### Equip & attune
- [x] 9. `equipped` toggle = patch inventory atomique. AC dérivée recalculée automatiquement par `useInventoryDerived` au prochain rendu (pas de double-write sur la fiche). `computeAcFromArmor` gère armor (acDexMax convention items.json : `null` = full DEX, `0` = no DEX, `N` = cap N) + shield (+2 cumulable).
- [x] 10. `attuned` toggle avec cap 3 vérifié avant patch ; au-delà → toast `fumble` "Limite d'attunement". Magic items qui n'exigent pas attunement masquent le bouton Lier.

### Recompute derived fields
- [x] 11. `useInventoryDerived(character)` : résout chaque item via bundles publics + custom user, retourne `{ resolvedItems, weightTotal, carryingCapacity, encumbranceLevel, acFromArmor, attunedCount, loading, refreshUserItems }`. Items user-scope chargés lazy (no fetch si zéro custom item dans l'inventaire). `refreshUserItems` invalide le cache + re-fetch après création maison.

### Tests
- [x] 12. `__tests__/inventory.test.ts` existant déjà couvre `addItemToInventory` throw sur bad contentId (plan 04, non touché).
- [x] 13. `avoir/__tests__/inventory-rules.test.ts` : 18 cas couvrant `carryingCapacity` (3), `computeEncumbrance` (6), `computeAcFromArmor` (9 — light/medium/heavy/shield/multi-armor/non-équipé/magic ignoré).
- [ ] 14. e2e plan 10 — voir table dette e2e dans plan 09 Notes (option A, plan 13.5 dédié).

### Final
- [x] 15. `pnpm typecheck && pnpm test && pnpm lint` — clean (123/123 tests).
- [x] 16. Commit: `feat(sheet): avoir mode + inventory strict (plan 10)`

## Definition of Done
- [x] Inventory lists, categorizes, tap to detail works
- [x] Add item from items DB works; **adding free strings is impossible** (no UI path exists — pas de free-text input dans AddItemModal sélection)
- [x] Custom item creation (user homebrew) works
- [x] Equip/attune toggles + AC recomputation work
- [x] Weight bar reflects load

## Notes for next plan
- Plan 11 (Radial FAB) places the inventory ADD action in a wedge. La modale `AddItemModal` exposée par `avoir-mode.tsx` peut être réutilisée via un store dédié si on veut l'invoquer depuis le radial, ou plus simplement un event bus partagé entre tabs (à arbitrer plan 11).
- For campaign-scoped homebrew items (DM creates a magic item for the campaign), that's plan 19 (bibliothèque, S2).

### Convention `acDexMax` items.json (LOCKED après plan 10)
- `acDexMax: null` → light armor, full DEX appliqué (pas de cap).
- `acDexMax: 0` → heavy armor, **aucun DEX**.
- `acDexMax: N` (N>0) → medium armor, DEX cappé à N.

Cette convention est testée dans `inventory-rules.test.ts::computeAcFromArmor`. Si le builder de content (plan 02) régresse ce mapping, les tests cassent immédiatement.

### Dette plan 19 — Magic item AC bonus
`computeAcFromArmor` ignore les magic items équipés (cf. test "magic item équipé : ignoré"). Plan 19 (bibliothèque) ajoutera un mapping canonique `magicItemId → { acBonus?, savingThrowBonus? }` lu par le hook pour réintégrer les bonus magiques (Cloak of Protection, Bracers of Defense, etc.). Le hook reste compatible — il appellera juste un `magicItemEffects(item)` helper additif.

### Custom item form — limitations S1 documentées
Le form `CustomItemForm` ne gère que les champs minimaux (name FR, category, weight, description). Pas de coût, pas de propriétés (Versatile, Finesse...), pas de dégâts, pas d'AC base. Pour un objet d'inventaire courant (potion homebrew, focus arcanique perso) c'est suffisant. Pour de vraies armes/armures maison, l'utilisateur devra éditer la doc Firestore directement ou attendre plan 19. Décision tactique : éviter un form de 15 champs qui n'aide personne en S1.

### Refresh user items après création
`invalidateUserContent` ajouté dans `content-loader.ts` (similaire à `invalidatePublicContent`). Appelé par `CustomItemForm` avant `refreshUserItems` du hook. Pas d'onSnapshot sur la collection `users/{uid}/customContent/items` — explicit invalidation suffit puisque le user est l'unique writer.

### Dette e2e consolidée — ligne plan 10 step 14 ajoutée à la table de plan 09 Notes (option A, plan 13.5 dédié).
