# Plan 04 — Content pipeline

## Goal

Every gameplay entity (spells, monsters, items, classes, ancestries, backgrounds, feats, conditions) lives in `public/data/*.json`, **derived from PDFs as source of truth** (SRD 5.1 + Free Rules 2024), enriched with French translations from AideDD, validated against Zod schemas using the `I18n` shape. DMG content extracted privately to user's Firestore. After this plan, the app has real content to consume.

## Context

Read:
- `docs/DATA-MODEL.md` (Public content JSON schemas + i18n shape)
- `docs/I18N.md`
- `CLAUDE.md` (Content source priority — PDF wins)
- `content-sources/README.md`

## Prerequisites

Plans 01, 03 complete. Adrien has provided files:
- `content-sources/aidedd/**/*.html` (FR scrapes)
- `content-sources/pdfs/srd-5.1.pdf`
- `content-sources/pdfs/free-rules-2024.pdf`
- `content-sources/pdfs/dmg.pdf` (private, optional)
- Any other PDFs

If files are missing, BLOCK and ask Adrien.

## Key principle (locked decision)

**PDFs are source of truth #1.** Mechanical fields (level, school, range, damage, AC, HP, components, costs, weights, classes, CR…) come from PDFs. AideDD provides **French translations of names and descriptions only**, mapped onto PDF entity IDs.

In any conflict: **PDF wins**. AideDD overrides only the `name.fr` / `description.fr` fields.

## Steps

### Inventory
- [ ] 1. List all files in `content-sources/`. Group by source. Verify expected PDFs exist; BLOCK on missing.
- [ ] 2. Read 2-3 sample files from each AideDD subfolder. Document the HTML structure (cheerio selectors per entity type) in `scripts/EXTRACTION-NOTES.md`.

### Zod schemas
- [ ] 3. Create `src/shared/types/content.ts` with Zod schemas for:
    - `I18n` shape
    - `Spell`, `Monster`, `Item`, `MagicItem`
    - `Class`, `Subclass`, `Ancestry`, `Subancestry`, `Background`
    - `Feat`, `Condition`, `Rule`
    - All matching `docs/DATA-MODEL.md`
- [ ] 4. Export typed types via `z.infer<typeof XSchema>`.

### PDF extraction (truth #1)
- [ ] 5. Install: `pnpm add -D pdf-parse` (already in package.json).
- [ ] 6. Run `pnpm content:extract-pdf` — extracts raw text from all PDFs to `content-sources/extracted/raw/{pdfname}.txt`.
- [ ] 7. Spot-check the output: open `srd-5.1.txt` and find sections like "Fireball", "Goblin", "Longsword". Make sure they're recognizable.

### SRD/Free Rules parsing
- [ ] 8. Write `scripts/parse-srd-text.ts`:
    - Reads `content-sources/extracted/raw/srd-5.1.txt` and `free-rules-2024.txt`
    - Splits into sections by entity (Spells, Monsters, Equipment, Magic Items, Classes, Races, Backgrounds, Feats, Conditions)
    - For each section, parses entities into structured objects
    - Writes to `content-sources/extracted/srd/{type}.json` and `content-sources/extracted/free-rules/{type}.json`
    - Mechanical fields fully populated. `name.fr` and `description.fr` left empty (filled by AideDD).
- [ ] 9. Run the script. Verify counts. Inspect a few entries per type to confirm mechanics are correct.
- [ ] 10. For entities not parsed cleanly (e.g. complex tables, multi-page monsters), log warnings and add to `scripts/EXTRACTION-NOTES.md` for manual review.

### AideDD parsing (FR translation layer)
- [ ] 11. Install (already in deps): `cheerio`.
- [ ] 12. Run `pnpm content:parse-aidedd` (script already exists, calibrate selectors).
- [ ] 13. For each entity, the AideDD parser extracts:
    - `id` (slug from filename / canonical EN name)
    - `name.fr` (the visible French name)
    - `description.fr` (the descriptive text)
    - `castingTime.fr`, `range.fr`, etc. for spells (these are translations of strings, not mechanics)
- [ ] 14. Output: `content-sources/extracted/aidedd/{type}.json` with arrays of partial entities (FR fields only).

### Merge (PDF wins, AideDD overlays FR translations)
- [ ] 15. Write `scripts/build-public-content.ts`:
    - Loads all SRD + Free Rules extracted JSON (mechanical truth)
    - Loads all AideDD extracted JSON (FR translation overlay)
    - For each PDF entity by ID:
      - Take mechanical fields from PDF version
      - Take `name`, `description`, etc. as `I18n` shape:
        - `fr`: from AideDD if present, else from PDF
        - `en`: from PDF (the canonical English)
      - On any mechanical conflict between AideDD and PDF → log warning, KEEP PDF VALUE
    - Validates the merged result against Zod schemas; fails on validation errors
    - Writes to `public/data/{type}.json`
- [ ] 16. Run `pnpm content:build`. Iterate until all schemas validate.

### Private (DMG) content
- [ ] 17. If `dmg.pdf` exists:
    - Parse to `content-sources/extracted/dmg/{type}.json` (magic items, optional rules, traps, treasure tables…)
    - These are mechanical truth too (from PDF), `name.fr` enriched if a matching AideDD entry exists, else `name.fr = name.en` as fallback
- [ ] 18. Write `scripts/upload-dmg-to-firestore.ts`:
    - Uses Firebase Admin SDK
    - Adrien provides service account key at `firebase-adminsdk-private.json` (gitignored)
    - Reads `content-sources/extracted/dmg/*.json`
    - Writes to `users/${ADRIEN_UID}/customContent/{type}/{id}` with `private: true, source: 'dmg'`
    - Idempotent (set with merge)
- [ ] 19. Adrien runs the upload script once locally. Verify in Firestore Console that documents appear under his UID.

### Items DB strict — runtime resolution
- [ ] 20. Update `src/shared/lib/content-loader.ts`:
    - `loadPublicContent(type)` — public/data/*.json → Dexie cached
    - `loadUserContent(type, userId)` — Firestore `users/{uid}/customContent/{type}` → cached
    - `loadCampaignContent(type, campaignId)` — Firestore `campaigns/{cid}/customContent/{type}` → cached (S2)
    - `resolveContent(type, contentId, scope, scopeId?)` — single lookup respecting scope
    - `searchContent(type, query, locale)` — text search across all scopes
- [ ] 21. Add an inventory utility `src/shared/lib/inventory.ts`:
    - `resolveInventoryItem(item: InventoryItem)`: takes an inventory entry, returns the full item content
    - `addItemToInventory(character, contentId, scope, qty)`: validates the item exists before adding
    - **Throws** if scope=`'public'` and `contentId` is not found in public data — no free strings allowed

### Verification
- [ ] 22. Add a temp debug route `/debug/content` that shows counts per type. Verify expectations:
    - SRD spells: ~320
    - SRD monsters: ~330
    - Items: ~80
    - Magic items (public, SRD): ~150
    - Classes: 12 (or 13 with Artificer in free rules 2024)
    - Ancestries: 9-10
    - Backgrounds: 13-15
    - Conditions: 15
- [ ] 23. Remove debug route.

### i18n strings discovered
- [ ] 24. As content pipeline ran, several UI strings emerged (e.g. school names, ability names, item categories). Add them to `src/shared/lib/i18n.ts` STRINGS map.

### Final
- [ ] 25. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 26. Commit: `feat(content): PDF-truth pipeline + AideDD translations + items DB strict (plan 04)`

## Definition of Done

- [ ] All 26 steps checked
- [ ] `public/data/` contains complete validated JSON for: spells, monsters, items, magic-items, classes, subclasses, ancestries, backgrounds, feats, conditions, rules
- [ ] All public JSON validates against Zod schemas
- [ ] Every entity has `I18n` shape on user-facing prose fields
- [ ] Mechanical fields come from PDF (verified by spot-checking 5-10 entries against the PDF directly)
- [ ] `content-sources/extracted/dmg/` (if it exists) is gitignored
- [ ] DMG content uploaded to private Firestore, readable via `loadUserContent`
- [ ] `inventory.ts` throws on unknown content IDs (test it!)
- [ ] `pnpm typecheck && pnpm test && pnpm lint` green

## Notes for next plan

- Plan 05 (manual character form) consumes `classes`, `ancestries`, `backgrounds`, `feats`, `items`, `spells` from `useContent` hook. Validate all entity IDs reference real content.
- Plan 17 (wizard creation S2) is the proper guided wizard — plan 05 is just a fast manual form so Adrien plays sooner.
- For commercial readiness: at any future schema change, version bumps must include a migration script. Keep schema versions in sync between PDF parser output and runtime types.
- AideDD might break parsing if their site structure changes — re-running `pnpm content:parse-aidedd` is the recovery path.
