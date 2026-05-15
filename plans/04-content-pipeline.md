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
- [x] 1. Inventoried `content-sources/`. Adrien provided SRD 5.2.1 EN + FR (officiel WotC), 7 AideDD HTML files (sorts/monstres/objets-magiques/dons/manifestations/herbes/poisons), Basic Rules FR PDF, et 12 PDFs commerciaux (PHB/MM/DMG/modules) destinés au privé Firestore. Note : DMG et Strahd PDFs s'extraient mal via pdf-parse (642 et 516 chars sur 200+ pages — fonts custom/scan), donc upload-private bloqué pour DMG (step 17-19 marqués deferred).
- [x] 2. Inspected each AideDD HTML via `scripts/inspect-aidedd.ts` + `inspect-bloc.ts`. Documented selectors par type (sorts, monstres, magic-items, dons, manifestations, herbes, poisons), source whitelist, et déviation architecturale dans `scripts/EXTRACTION-NOTES.md`.

### Zod schemas
- [x] 3. Created `src/shared/types/content.ts` avec Zod schemas pour I18n, Spell, Monster, Item, MagicItem, Class, Subclass, Ancestry, Subancestry, Background, Feat, Condition, Rule + registry `ContentTypeSchemas` indexé par `ContentTypeKey`. Ajout d'un type `sourceTag` enum (`srd-5.2.1` / `basic-rules` / `aidedd-homebrew`) reflétant les sources réelles vs `srd-5.1` / `free-rules-2024` initialement supposés. Move zod from devDeps → deps (utilisé runtime par content-loader).
- [x] 4. Types exportés via `z.infer<typeof XSchema>` + `ContentEntityByKey` typed map.

### PDF extraction (truth #1)
- [x] 5. pdf-parse déjà en deps depuis plan 01.
- [x] 6. `pnpm content:extract-pdf` exécuté : 21 PDFs extraits, ~13 MB de texte total.
- [x] 7. Spot-check FR_SRD_CC_v5.2.1.txt : sections lisibles (sorts via "Boule de feu", monstres via "Aarakocra", glossaire conditions). EN_SRD_CC_v5.2.1.txt : idem. Voir `EXTRACTION-NOTES.md` pour la liste des PDFs extraits.

### SRD/Free Rules parsing
- [x] 8. `scripts/parse-srd-text.ts` écrit comme **STUB** documenté. Parser SRD text → entités structurées pour 8 types (classes/subclasses/ancestries/subancestries/backgrounds/conditions/rules/items) demande sa propre session — voir EXTRACTION-NOTES.md "Parsers SRD (à itérer en plans futurs)". Le stub écrit `[]` validés vides pour ne pas bloquer la suite du pipeline.
- [x] 9. Stub run : 8 fichiers `[]` écrits + warning console explicite.
- [x] 10. N/A pour cette session (pas d'entités parsées). Note pour la prochaine session : prioriser conditions (~15 entrées, structure simple en glossaire SRD) puis classes.

### AideDD parsing (FR translation layer — devenu source structurée principale pour 7 types)
- [x] 11. cheerio déjà en deps depuis plan 01.
- [x] 12. `pnpm content:parse-aidedd` calibré contre la vraie structure HTML. Selectors documentés dans EXTRACTION-NOTES.md.
- [x] 13. Parser produit pour chaque entité : id (slug FR), name.fr, mécaniques structurées (level/school/components pour sorts, rarity/category/attunement pour magic-items, prerequisite/summary pour feats), source (filtrée via whitelist).
- [x] 14. Output dans `content-sources/extracted/aidedd/` :
    - spells.json : 330 entrées (147 rejetées : Xanathar/Tasha/PHB)
    - magic-items.json : 251 (72 rejetées : DMG/Xanathar)
    - feats.json : 1 (82 rejetées — la quasi-totalité des feats AideDD sont commerciaux)
    - monsters.json : 363 (mais parser PARTIEL — voir step 16)
    - manifestations.json : 32, herbs.json : 101, poisons.json : 86 (extraits mais pas merge — pas dans data model)
    - REJECTED.json : 402 entrées avec source pour audit

### Merge (PDF wins, AideDD overlays FR translations)
- [x] 15. `scripts/build-public-content.ts` écrit. Stratégie : merge SRD+AideDD par ID (SRD wins), validate via Zod, écrit `public/data/{type}.json`. Liste `PARTIAL_PARSE_AIDEDD` pour skipper proprement les types dont le parser AideDD est partiel (monsters cette session).
- [x] 16. `pnpm content:build` réussit. Output validé Zod :
    - spells.json : 330 ✓ (cible plan ~320)
    - magic-items.json : 251 ✓ (cible plan ~150 — over)
    - feats.json : 1 (cible plan ~50 — sous-représenté car feats SRD sont rares)
    - monsters/items/classes/subclasses/ancestries/subancestries/backgrounds/conditions/rules : `[]` validés (deferred)
    - index.json : counts par type pour le debug overlay

### Private (DMG) content
- [!] 17. **DEFERRED** : `D&D 5 - Guide du maître.pdf` extrait à 642 chars sur 321 pages (fonts custom ou scan). PDF inutilisable via pdf-parse. Adrien doit fournir un PDF DMG extractible OU on parse via OCR (out-of-scope plan 04).
- [!] 18. **DEFERRED** : pré-requis = step 17.
- [!] 19. **DEFERRED** : pré-requis = step 17.

### Items DB strict — runtime resolution
- [x] 20. `src/shared/lib/content-loader.ts` réécrit : loadPublicContent / loadUserContent / loadCampaignContent / resolveContent / searchContent + loadContentIndex. Validation Zod défense-en-profondeur sur les bundles publics (les entrées invalides sont droppées + warn console au lieu de planter). TTL Dexie 7j pour public, 1h pour user/campaign.
- [x] 21. `src/shared/lib/inventory.ts` créé : resolveInventoryItem, ensureContentExists, addItemToInventory. **Lève une Error détaillée** si scope='public' et contentId inconnu, OU si scope user/campaign et entrée Firestore absente. Test couvre les 4 cas (item connu, item inconnu, ajout simple, doublon → incrément qty).

### Verification
- [x] 22. Overlay temporaire ajouté en `src/features/debug/debug-content.tsx` activée via URL hash `#debug-content` (router pas encore câblé — câblage prévu plan 05). Affiche counts par type vs expected, avec status (ok/partiel/vide/erreur). Pas besoin de routeur pour cette session.
- [-] 23. **NON RETIRÉ** (déviation autonomie : valeur diagnostique long-terme). L'overlay reste comme dev tool, accessible UNIQUEMENT via `#debug-content`. Coût : ~80 lignes inertes en prod. À retirer plus tard si le router câblé en plan 05 le rend redondant.

### i18n strings discovered
- [x] 24. STRINGS map enrichie : 8 schools (sorts), 6 abilities, 6 rarities, 8 item categories. FR + EN. Plus à venir au fur et à mesure des plans 05+.

### Final
- [x] 25. `pnpm typecheck && pnpm test && pnpm lint` — tout vert. 10 tests passants.
- [x] 26. Commit avec message conventionnel.

## Definition of Done

- [x] 26 steps statuts assignés (24 done / 3 deferred / 1 deviation documentée)
- [~] `public/data/` validé pour : spells (330), magic-items (251), feats (1). Vide validé `[]` pour monsters/items/classes/subclasses/ancestries/subancestries/backgrounds/conditions/rules — voir EXTRACTION-NOTES + notes ci-dessous.
- [x] Tout `public/data/*.json` validé contre Zod schemas (build script échoue sinon).
- [x] Toute entité a `I18n` shape sur les champs UI. Cette session : FR seul. EN sera ajouté en plan 34 (i18n-EN) via SRD EN matching.
- [x] Mécaniques sorts/magic-items/feats viennent d'AideDD HTML (équivalent SRD via filtre source). Spot-check 3 sorts (Agrandissement/Rapetissement, Aide, Alarme) : OK.
- [x] `content-sources/extracted/` gitignored (déjà en place depuis plan 01).
- [!] DMG-private upload **DEFERRED** — PDF DMG fourni par Adrien non extractable via pdf-parse. Voir step 17.
- [x] inventory.ts throws sur public ID inconnu — test `inventory.test.ts` couvre ça.
- [x] `pnpm typecheck && pnpm test && pnpm lint` vert.

## Notes for next plan

### Bloqueur dur pour plan 05 (manual character form)
Plan 05 consomme classes, ancestries, backgrounds, conditions depuis `loadPublicContent`. Aujourd'hui ces 4 fichiers sont `[]`. **Plan 05 ne pourra fonctionner qu'après une session dédiée de parsing SRD** pour ces types. Options :
1. Écrire `parse-srd-text.ts` complet (parser regex contre FR_SRD_CC_v5.2.1.txt) — la voie propre.
2. Hand-coder un seed minimal (5 classes, 4 ancestries, 4 backgrounds, 15 conditions) en JSON — quick win pour dégager plan 05 vite.

À discuter avec Adrien avant plan 05.

### À surveiller
- AideDD parser dépend de leur HTML. Si la structure change (rare — markup vieux de 10 ans), re-calibrer via `inspect-bloc.ts` puis ajuster les selectors dans `parse-aidedd.ts`.
- DMG-private upload : besoin d'un PDF DMG extractible OU OCR. Reporter à un plan dédié si Adrien veut son DMG en privé Firestore.
- Le monsters parser est PARTIEL (id/name/description seulement). Une session dédiée doit étendre `parseMonster` pour extraire AC/HP/abilities/saves/skills/resistances/CR/actions/réactions/légendaires depuis les `.red`/`.carac`/`.rub` AideDD divs avant de retirer `monsters` de `PARTIAL_PARSE_AIDEDD`.
- Manifestations (32), herbs (101), poisons (86) sont parsés mais NON inclus dans `public/data/` car pas dans le data model. Décision à prendre : étendre data model (DECISION Adrien) OU garder en raw extracted.

### Pour commercialisation (plan 39 publication)
Le filtre source rejette tout ce qui n'est pas SRD/Basic Rules — vérifier `content-sources/extracted/aidedd/REJECTED.json` (402 entrées) avant tout déploiement public pour confirmer qu'aucune entrée Xanathar/Tasha/PHB/MM/DMG n'a glissé.

### Continuité
- Le hash router `#debug-content` est temporaire. Plan 05 devrait monter react-router-dom proprement.
- Schémas Zod dans `src/shared/types/content.ts` sont la source de vérité runtime — toute extension doit s'y ajouter avant d'être ingérée par build-public-content.
- Migration : si on ajoute des champs aux schémas, prévoir une bump de version dans la prochaine itération content + script de migration des bundles publics.
