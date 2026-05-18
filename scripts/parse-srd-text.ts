/**
 * scripts/parse-srd-text.ts
 *
 * Parses the SRD 5.2.1 plain-text extracts (FR + EN) into structured JSON
 * for classes, subclasses, ancestries, backgrounds, conditions.
 *
 * Strategy
 * ────────
 * Source of truth #1 = SRD CC v5.2.1 PDF (EN canonical, FR official translation).
 * Both files share the SAME ruleset, so FR↔EN mapping is structural (per-entity,
 * by explicit name table — alphabetical order differs across languages).
 *
 * Hand-authored (per Adrien's tolerance for short, stable corpora):
 *   - backgrounds : 4 entries (Acolyte/Criminal/Sage/Soldier)
 *   - conditions  : 15 entries (Blinded → Unconscious)
 *
 * Programmatically extracted from SRD text (label-driven):
 *   - classes     : 12 entries with core traits + features by level
 *   - subclasses  : 12 entries (1 per class in SRD)
 *   - ancestries  : 9 entries (Dragonborn → Tiefling)
 *
 * Subancestries left empty: SRD 2024 expresses sub-races as in-trait choices
 * (lineages, legacies, ancestries) rather than separate entities. Plan 05's
 * wizard can model these as choices within the parent ancestry trait.
 *
 * Run: pnpm content:parse-srd
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ClassSchema,
  SubclassSchema,
  AncestrySchema,
  BackgroundSchema,
  ConditionSchema,
  type ClassEntity,
  type Subclass,
  type Ancestry,
  type Background,
  type Condition,
  type StartingEquipment,
  type StartingEquipmentItemRef,
  type StartingCoins,
  type CoinUnit,
} from '../src/shared/types/content.js';
import { z } from 'zod';
import { resolveStartingItemId } from './maps/starting-equipment-name-map.js';
import { parseEquipment } from './parse-srd-equipment.js';

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const RAW_DIR = 'content-sources/extracted/raw';
const OUT_DIR = 'content-sources/extracted/srd';
const EN_FILE = join(RAW_DIR, 'SRD_CC_v5.2.1.txt');
const FR_FILE = join(RAW_DIR, 'FR_SRD_CC_v5.2.1.txt');
const SOURCE = 'srd-5.2.1' as const;

// ─────────────────────────────────────────────────────────────────────
// FR ↔ EN entity name maps
// (alphabetical order differs across languages — index-mapping does NOT
// work; we identify each entity by its language-specific anchor)
// ─────────────────────────────────────────────────────────────────────

type ClassKey =
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard';

interface ClassMapping {
  id: ClassKey;
  en: string;
  fr: string;
  subclassEn: string;
  subclassFr: string;
  subclassIdSlug: string;
}

const CLASSES: ClassMapping[] = [
  { id: 'barbarian', en: 'Barbarian', fr: 'Barbare', subclassEn: 'Path of the Berserker', subclassFr: 'Voie du Berserker', subclassIdSlug: 'path-of-the-berserker' },
  { id: 'bard', en: 'Bard', fr: 'Barde', subclassEn: 'College of Lore', subclassFr: 'Collège du Savoir', subclassIdSlug: 'college-of-lore' },
  { id: 'cleric', en: 'Cleric', fr: 'Clerc', subclassEn: 'Life Domain', subclassFr: 'Domaine de la Vie', subclassIdSlug: 'life-domain' },
  { id: 'druid', en: 'Druid', fr: 'Druide', subclassEn: 'Circle of the Land', subclassFr: 'Cercle de la Terre', subclassIdSlug: 'circle-of-the-land' },
  { id: 'fighter', en: 'Fighter', fr: 'Guerrier', subclassEn: 'Champion', subclassFr: 'Champion', subclassIdSlug: 'champion' },
  { id: 'monk', en: 'Monk', fr: 'Moine', subclassEn: 'Warrior of the Open Hand', subclassFr: 'Credo de la Paume', subclassIdSlug: 'warrior-of-the-open-hand' },
  { id: 'paladin', en: 'Paladin', fr: 'Paladin', subclassEn: 'Oath of Devotion', subclassFr: 'Serment de Dévotion', subclassIdSlug: 'oath-of-devotion' },
  { id: 'ranger', en: 'Ranger', fr: 'Rôdeur', subclassEn: 'Hunter', subclassFr: 'Chasseur', subclassIdSlug: 'hunter' },
  { id: 'rogue', en: 'Rogue', fr: 'Roublard', subclassEn: 'Thief', subclassFr: 'Voleur', subclassIdSlug: 'thief' },
  { id: 'sorcerer', en: 'Sorcerer', fr: 'Ensorceleur', subclassEn: 'Draconic Sorcery', subclassFr: 'Sorcellerie draconique', subclassIdSlug: 'draconic-sorcery' },
  { id: 'warlock', en: 'Warlock', fr: 'Occultiste', subclassEn: 'Fiend Patron', subclassFr: 'Protecteur Fiélon', subclassIdSlug: 'fiend-patron' },
  { id: 'wizard', en: 'Wizard', fr: 'Magicien', subclassEn: 'Evoker', subclassFr: 'Évocateur', subclassIdSlug: 'evoker' },
];

type AncestryKey =
  | 'dragonborn'
  | 'dwarf'
  | 'elf'
  | 'gnome'
  | 'goliath'
  | 'halfling'
  | 'human'
  | 'orc'
  | 'tiefling';

interface AncestryMapping {
  id: AncestryKey;
  en: string;
  fr: string;
}

const ANCESTRIES: AncestryMapping[] = [
  { id: 'dragonborn', en: 'Dragonborn', fr: 'Drakéide' },
  { id: 'dwarf', en: 'Dwarf', fr: 'Nain' },
  { id: 'elf', en: 'Elf', fr: 'Elfe' },
  { id: 'gnome', en: 'Gnome', fr: 'Gnome' },
  { id: 'goliath', en: 'Goliath', fr: 'Goliath' },
  { id: 'halfling', en: 'Halfling', fr: 'Halfelin' },
  { id: 'human', en: 'Human', fr: 'Humain' },
  { id: 'orc', en: 'Orc', fr: 'Orc' },
  { id: 'tiefling', en: 'Tiefling', fr: 'Tieffelin' },
];

// ─────────────────────────────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────────────────────────────

interface Lines {
  raw: string[]; // 1-indexed-friendly: raw[i] = line i+1 in display
}

function loadLines(text: string): Lines {
  return { raw: text.split(/\r?\n/) };
}

function findIndex(lines: Lines, predicate: (line: string) => boolean, start = 0): number {
  for (let i = start; i < lines.raw.length; i++) {
    if (predicate(lines.raw[i])) return i;
  }
  return -1;
}

/** Joins consecutive non-empty lines into a single paragraph (for label values). */
function joinUntilLabel(lines: Lines, fromIdx: number, isLabel: (line: string) => boolean): { text: string; nextIdx: number } {
  const out: string[] = [];
  let i = fromIdx;
  while (i < lines.raw.length) {
    const ln = lines.raw[i];
    if (isLabel(ln)) break;
    if (ln.trim() === '') break;
    out.push(ln.trim());
    i++;
  }
  return { text: out.join(' ').replace(/\s+/g, ' ').trim(), nextIdx: i };
}

/** Joins lines until next paragraph break (blank line) or feature header. */
function joinFeatureBody(
  lines: Lines,
  fromIdx: number,
  stopAt: (line: string) => boolean,
  endIdx: number = lines.raw.length,
): { text: string; nextIdx: number } {
  const out: string[] = [];
  let i = fromIdx;
  const limit = Math.min(endIdx, lines.raw.length);
  while (i < limit) {
    const ln = lines.raw[i];
    if (stopAt(ln)) break;
    out.push(ln);
    i++;
  }
  // Collapse internal whitespace, strip pdf "System Reference Document 5.2.1" and lone page numbers,
  // and rejoin words split across line breaks ("déni- cher" → "dénicher").
  const cleaned = out
    .filter((l) => !/^System Reference Document/.test(l))
    .filter((l) => !/^Document de Référence du Système/.test(l))
    .filter((l) => !/^\d{1,3}$/.test(l.trim()))
    .join(' ')
    .replace(/([a-zà-ÿ])-\s+([a-zà-ÿ])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
  return { text: cleaned, nextIdx: i };
}

// ─────────────────────────────────────────────────────────────────────
// Class core-traits parser
// ─────────────────────────────────────────────────────────────────────

interface CoreTraits {
  primaryAbility: string;
  hitPointDie: string;
  saveProficiencies: string;
  skillProficiencies: string;
  weaponProficiencies: string;
  toolProficiencies: string;
  armorTraining: string;
  startingEquipment: string;
}

const ALL_EN_LABEL_LINES = new Set<string>([
  'Primary Ability',
  'Hit Point Die',
  'Saving Throw',
  'Saving Throw ',
  'Proficiencies',
  'Skill Proficiencies',
  'Weapon Proficiencies',
  'Tool Proficiencies',
  'Armor Training',
  'Starting Equipment',
]);

function parseEnCoreTraits(lines: Lines, startIdx: number, endIdx: number): CoreTraits {
  // EN format: "<Label>" line, then value line(s) (multiline OK), until next label or "Becoming a X ...".
  const result: Partial<CoreTraits> = {};
  let i = startIdx;
  while (i < endIdx) {
    const ln = lines.raw[i].trim();

    if (ln === 'Primary Ability') {
      const j = joinUntilLabel(lines, i + 1, isEnLabelLike);
      result.primaryAbility = j.text;
      i = j.nextIdx;
    } else if (ln === 'Hit Point Die') {
      const j = joinUntilLabel(lines, i + 1, isEnLabelLike);
      result.hitPointDie = j.text;
      i = j.nextIdx;
    } else if (ln === 'Saving Throw' || ln === 'Saving Throw ') {
      // Skip the next "Proficiencies" continuation line
      let next = i + 1;
      if ((lines.raw[next] || '').trim() === 'Proficiencies') next++;
      const j = joinUntilLabel(lines, next, isEnLabelLike);
      result.saveProficiencies = j.text;
      i = j.nextIdx;
    } else if (ln === 'Skill Proficiencies') {
      const j = joinUntilLabel(lines, i + 1, isEnLabelLike);
      result.skillProficiencies = j.text;
      i = j.nextIdx;
    } else if (ln === 'Weapon Proficiencies') {
      const j = joinUntilLabel(lines, i + 1, isEnLabelLike);
      result.weaponProficiencies = j.text;
      i = j.nextIdx;
    } else if (ln === 'Tool Proficiencies') {
      const j = joinUntilLabel(lines, i + 1, isEnLabelLike);
      result.toolProficiencies = j.text;
      i = j.nextIdx;
    } else if (ln === 'Armor Training') {
      const j = joinUntilLabel(lines, i + 1, isEnLabelLike);
      result.armorTraining = j.text;
      i = j.nextIdx;
    } else if (ln === 'Starting Equipment') {
      const j = joinUntilLabel(lines, i + 1, isEnLabelLike);
      result.startingEquipment = j.text;
      i = j.nextIdx;
    } else {
      i++;
    }
  }
  return {
    primaryAbility: result.primaryAbility ?? '',
    hitPointDie: result.hitPointDie ?? '',
    saveProficiencies: result.saveProficiencies ?? '',
    skillProficiencies: result.skillProficiencies ?? '',
    weaponProficiencies: result.weaponProficiencies ?? '',
    toolProficiencies: result.toolProficiencies ?? '',
    armorTraining: result.armorTraining ?? '',
    startingEquipment: result.startingEquipment ?? '',
  };
}

function isEnLabelLike(ln: string): boolean {
  const t = ln.trim();
  return ALL_EN_LABEL_LINES.has(t) || /^Becoming a /.test(t) || /Class Features$/.test(t);
}

// ─────────────────────────────────────────────────────────────────────
// Starting Equipment parser (per class)
// ─────────────────────────────────────────────────────────────────────

const COIN_RE = /^(\d+)\s*(CP|SP|EP|GP|PP)$/i;

/** Strip the "Choose A or B/C: " prefix from the raw text. */
function stripChoosePrefix(s: string): string {
  return s
    .replace(/^Choose\s+A,\s*B,?\s*or\s+C\s*:\s*/i, '')
    .replace(/^Choose\s+A\s+or\s+B\s*:\s*/i, '')
    .replace(/^Choose\s+A\s+or\s+B,\s*or\s+C\s*:\s*/i, '');
}

/** Split the joined text into options A, B, [C]. Each option starts with "(X) ". */
function splitChoiceOptions(s: string): string[] {
  // Split on "; or (X)" / "; (X)" boundaries.
  const parts = s.split(/\s*;\s*(?:or\s+)?(?=\([A-C]\))/);
  return parts.map((p) => p.trim());
}

/** Parse one option string like "(A) Greataxe, 4 Handaxes, Explorer's Pack, and 15 GP". */
function parseStartingEquipmentOption(raw: string, source: string): {
  items: StartingEquipmentItemRef[];
  coins: StartingCoins | null;
} {
  // Strip the "(A) " / "(B) " / "(C) " prefix.
  const stripped = raw.replace(/^\([A-C]\)\s*/, '').trim();
  // Tokenize on commas + " and " (handle Oxford comma "...item, and 15 GP").
  // Replace " and " with ", " to unify, then split on commas.
  const flat = stripped.replace(/,?\s+and\s+/g, ', ').replace(/\s+/g, ' ').trim();
  const tokens = flat.split(/,\s*/).map((t) => t.trim()).filter((t) => t.length > 0);
  const items: StartingEquipmentItemRef[] = [];
  let coins: StartingCoins | null = null;
  for (const token of tokens) {
    // Detect "<N> GP" / "<N> SP" coin token.
    const cm = token.match(COIN_RE);
    if (cm) {
      coins = {
        qty: Number(cm[1]),
        unit: cm[2].toLowerCase() as CoinUnit,
      };
      continue;
    }
    // Detect "<N> <itemName>" (qty prefix, e.g. "4 Handaxes" or "8 Javelins" or "20 Arrows").
    let qty = 1;
    let name = token;
    const qm = token.match(/^(\d+)\s+(.+)$/);
    if (qm) {
      qty = Number(qm[1]);
      name = qm[2];
    }
    // Strip parenthetical descriptor like "Book (occult lore)" → "Book".
    // BUT keep parenthetical for "Druidic Focus (Quarterstaff)" / "Arcane Focus (crystal)" etc.
    const focusKeep = /^(Druidic Focus|Arcane Focus)\s*\(/.test(name);
    let resolveName = name;
    if (!focusKeep) {
      resolveName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    }
    // Strip descriptive suffixes that don't change item identity.
    resolveName = resolveName
      .replace(/\s+of your choice\b.*$/i, '')
      .replace(/\s+chosen for the tool proficiency above\b.*$/i, '')
      .trim();
    // Handle "X or Y" choice tokens by resolving to the first option (canonical).
    if (/\s+or\s+/.test(resolveName)) {
      const firstOpt = resolveName.split(/\s+or\s+/)[0].trim();
      resolveName = firstOpt;
    }
    // Resolve via map.
    const itemId = resolveStartingItemId(resolveName);
    if (!itemId) {
      throw new Error(
        `[${source}] Unknown starting equipment token: "${token}" (resolved to "${resolveName}"). Add it to scripts/maps/starting-equipment-name-map.ts.`,
      );
    }
    items.push({ itemId, qty });
  }
  return { items, coins };
}

/** Walk a class section, find the Starting Equipment block, parse to StartingEquipment. */
function extractStartingEquipment(en: Lines, section: ClassSection, validItemIds: Set<string>): StartingEquipment {
  // Find "Starting Equipment" label inside the EN class core-traits block.
  const labelIdx = findIndex(
    en,
    (l) => l.trim() === 'Starting Equipment',
    section.enClassStart,
  );
  if (labelIdx < 0 || labelIdx >= section.enCoreTraitsEnd) {
    throw new Error(`EN: Starting Equipment label not found in class section (${section.cls.id})`);
  }
  // Accumulate lines after the label until "Becoming a X" marker.
  const out: string[] = [];
  for (let i = labelIdx + 1; i < section.enCoreTraitsEnd; i++) {
    const ln = en.raw[i];
    if (/^Becoming a /.test(ln.trim())) break;
    out.push(ln.trim());
  }
  const joined = out.join(' ').replace(/\s+/g, ' ').trim();
  // Normalize kerning + line-wrap artifacts:
  //   "110   G P" → "110 GP", "En- tertainer’s" → "Entertainer’s", "Short sword" handled in resolver.
  const normalized = joined
    .replace(/([A-Za-zà-ÿ])-\s+([a-zà-ÿ])/g, '$1$2') // line-wrap hyphenation (En- tertainer → Entertainer)
    .replace(/(\d+)\s+G\s+P\b/g, '$1 GP')
    .replace(/(\d+)\s+S\s+P\b/g, '$1 SP')
    .replace(/(\d+)\s+C\s+P\b/g, '$1 CP');
  const text = stripChoosePrefix(normalized);
  const optionsText = splitChoiceOptions(text);
  const parsed = optionsText.map((opt) => parseStartingEquipmentOption(opt, `class:${section.cls.id}`));

  // Cross-validate that every itemId exists in items.json.
  for (const opt of parsed) {
    for (const it of opt.items) {
      if (!validItemIds.has(it.itemId)) {
        throw new Error(
          `[class:${section.cls.id}] startingEquipment references unknown itemId "${it.itemId}". Cross-check with items.json.`,
        );
      }
    }
  }

  if (parsed.length === 0) {
    throw new Error(`[class:${section.cls.id}] startingEquipment parsed 0 options from text: "${text}"`);
  }
  return { options: parsed };
}

// ─────────────────────────────────────────────────────────────────────
// Class features parser (EN + FR share structure; only header marker differs)
// ─────────────────────────────────────────────────────────────────────

interface RawFeature {
  level: number;
  name: string;
  description: string;
}

const EN_FEATURE_HEADER = /^Level (\d+):\s*(.+)$/;
const FR_FEATURE_HEADER = /^Niveau (\d+)\s*:\s*(.+)$/;

function parseFeatures(lines: Lines, startIdx: number, endIdx: number, headerRe: RegExp): RawFeature[] {
  const features: RawFeature[] = [];
  let i = startIdx;
  while (i < endIdx) {
    const m = lines.raw[i].match(headerRe);
    if (!m) {
      i++;
      continue;
    }
    const level = Number(m[1]);
    let name = m[2];
    // Wrapped title detection: previous line ends with space + next line is short + starts lowercase.
    // Example: "Niveau 9 : Communication avec " + "le  protecteur" → "Communication avec le protecteur".
    let cur = i + 1;
    while (/\s$/.test(name) && cur < endIdx) {
      const nextLine = lines.raw[cur];
      if (!nextLine || headerRe.test(nextLine)) break;
      const trimmed = nextLine.trim();
      // Title continuation: short, starts with lowercase word (FR articles, EN prepositions).
      if (trimmed.length < 60 && /^[a-zà-ÿ]/.test(trimmed)) {
        name = name + ' ' + trimmed;
        cur++;
      } else {
        break;
      }
    }
    name = name.replace(/\s+/g, ' ').trim();
    // Read description until next feature header or section break.
    const body = joinFeatureBody(lines, cur, (l) => headerRe.test(l), endIdx);
    features.push({ level, name, description: body.text });
    i = body.nextIdx;
  }
  return features;
}

// ─────────────────────────────────────────────────────────────────────
// Class section bounds
// ─────────────────────────────────────────────────────────────────────

interface ClassSection {
  cls: ClassMapping;
  // EN bounds
  enClassStart: number; // line "Barbarian" itself
  enCoreTraitsEnd: number; // line index where "Becoming a X..." starts
  enFeaturesStart: number; // line where "Level 1:" first appears (class features)
  enSubclassStart: number; // line where "Path of the Berserker" / subclass content starts
  enClassEnd: number; // line where next class begins
  // FR bounds (mirror)
  frClassStart: number;
  frCoreTraitsEnd: number;
  frFeaturesStart: number;
  frSubclassStart: number;
  frClassEnd: number;
}

function findClassSections(en: Lines, fr: Lines): ClassSection[] {
  // EN anchors: "Core <Class> Traits" — class header is line above.
  const enAnchors = new Map<ClassKey, number>();
  for (const cls of CLASSES) {
    const i = findIndex(en, (l) => l.trim() === `Core ${cls.en} Traits`);
    if (i < 0) throw new Error(`EN: Core ${cls.en} Traits not found`);
    enAnchors.set(cls.id, i);
  }
  // FR anchors: "Traits de base du <Class>" / "Traits de base de l'<Class>"
  const frAnchors = new Map<ClassKey, number>();
  for (const cls of CLASSES) {
    const variants = [
      `Traits de base du ${cls.fr}`,
      `Traits de base de l’${cls.fr}`,
      `Traits de base de la ${cls.fr}`,
    ];
    const i = findIndex(fr, (l) => variants.includes(l.trim()));
    if (i < 0) throw new Error(`FR: Traits de base ${cls.fr} not found (variants tried: ${variants.join(' | ')})`);
    frAnchors.set(cls.id, i);
  }

  // Sort EN anchors by line position to derive contiguous bounds.
  const enSorted = [...enAnchors.entries()].sort((a, b) => a[1] - b[1]);
  const frSorted = [...frAnchors.entries()].sort((a, b) => a[1] - b[1]);

  // EN: end of last class = "Character Origins" line.
  const enCharOriginsIdx = findIndex(en, (l) => l.trim() === 'Character Origins');
  // FR: end of last class = "Origines des personnages" line (note: "des" not "de").
  const frOriginsIdx = findIndex(fr, (l) => l.trim() === 'Origines des') !== -1
    ? findIndex(fr, (l) => l.trim() === 'Origines des')
    : findIndex(fr, (l) => l.trim() === 'Origines des personnages');
  if (enCharOriginsIdx < 0) throw new Error('EN: Character Origins not found');
  if (frOriginsIdx < 0) throw new Error('FR: Origines des personnages not found');

  const sections: ClassSection[] = [];
  for (const cls of CLASSES) {
    const enAnchor = enAnchors.get(cls.id)!;
    const frAnchor = frAnchors.get(cls.id)!;

    const enIdx = enSorted.findIndex(([k]) => k === cls.id);
    const frIdx = frSorted.findIndex(([k]) => k === cls.id);
    const enEnd = enIdx + 1 < enSorted.length ? enSorted[enIdx + 1][1] - 1 : enCharOriginsIdx;
    const frEnd = frIdx + 1 < frSorted.length ? frSorted[frIdx + 1][1] - 1 : frOriginsIdx;

    // Class header is the line above the "Core ... Traits" anchor for EN,
    // and 2 lines above for FR (FR has page-break + page number above sometimes).
    const enClassStart = enAnchor - 1; // line "Barbarian"
    const frClassStart = frAnchor - 1; // line "Barbare"

    // Becoming line marks end of core traits block in both languages.
    const enBecomingIdx = findIndex(en, (l) => /^Becoming a /.test(l.trim()), enAnchor);
    const frBecomingIdx = findIndex(fr, (l) => /^Devenir /.test(l.trim()), frAnchor);

    // Class Features header marks start of feature list.
    const enFeaturesHeader = findIndex(en, (l) => l.trim() === `${cls.en} Class Features`, enAnchor);
    const frFeaturesHeader = findIndex(fr, (l) => /^Aptitudes de classe /.test(l.trim()), frAnchor);

    // First "Level N:" inside class features is the class features start.
    const enFeaturesStart = enFeaturesHeader >= 0 ? enFeaturesHeader : enBecomingIdx;
    const frFeaturesStart = frFeaturesHeader >= 0 ? frFeaturesHeader : frBecomingIdx;

    // Subclass marker
    const enSubclassMarker = findIndex(en, (l) => l.trim().startsWith(`${cls.en} Subclass:`), enAnchor);
    const frSubclassMarker = findIndex(fr, (l) => /^Sous-classe (de |d’)/.test(l.trim()), frAnchor);

    sections.push({
      cls,
      enClassStart,
      enCoreTraitsEnd: enBecomingIdx > 0 ? enBecomingIdx : enAnchor + 30,
      enFeaturesStart,
      enSubclassStart: enSubclassMarker > 0 ? enSubclassMarker : enEnd,
      enClassEnd: enEnd,
      frClassStart,
      frCoreTraitsEnd: frBecomingIdx > 0 ? frBecomingIdx : frAnchor + 30,
      frFeaturesStart,
      frSubclassStart: frSubclassMarker > 0 ? frSubclassMarker : frEnd,
      frClassEnd: frEnd,
    });
  }
  return sections;
}

// ─────────────────────────────────────────────────────────────────────
// Build ClassEntity from a ClassSection
// ─────────────────────────────────────────────────────────────────────

type AbilityCode = 'for' | 'dex' | 'con' | 'int' | 'sag' | 'cha';

function abilitiesFromText(text: string): AbilityCode[] {
  // Find any of the 6 ability words (FR or EN) in any order.
  const tokens: AbilityCode[] = [];
  const lower = text.toLowerCase();
  const checks: [string, AbilityCode][] = [
    ['strength', 'for'],
    ['force', 'for'],
    ['dexterity', 'dex'],
    ['dextérité', 'dex'],
    ['constitution', 'con'],
    ['intelligence', 'int'],
    ['wisdom', 'sag'],
    ['sagesse', 'sag'],
    ['charisma', 'cha'],
    ['charisme', 'cha'],
  ];
  for (const [word, code] of checks) {
    if (lower.includes(word) && !tokens.includes(code)) tokens.push(code);
  }
  return tokens;
}

function hitDieFromText(text: string): 'd6' | 'd8' | 'd10' | 'd12' {
  const m = text.match(/[dD](6|8|10|12)/);
  if (!m) throw new Error(`Cannot parse hit die from: ${text}`);
  return `d${m[1]}` as 'd6' | 'd8' | 'd10' | 'd12';
}

function parseSkillChoices(en: string): { count: number; from: string[] } {
  // EN patterns:
  //   "Choose 2: Animal Handling, Athletics, ..."
  //   "Choose any 3 skills (see “Playing the Game”)"
  let m = en.match(/Choose\s+(?:any\s+)?(\d+)\s*(?:skills?)?\s*[::]?\s*(.*)/i);
  if (!m) {
    return { count: 0, from: [] };
  }
  const count = Number(m[1]);
  const tail = m[2].replace(/\(see.*?\)/g, '').trim();
  if (!tail || /^\(.*\)$/.test(tail)) {
    return { count, from: [] };
  }
  // Split on commas / "or" / " and "
  const parts = tail
    .split(/,| or | and /)
    .map((p) => p.replace(/[.;:]+$/, '').trim())
    .filter((p) => p.length > 0 && p.length < 40);
  return { count, from: parts };
}

const SPELLCASTING_BY_CLASS: Record<ClassKey, ClassEntity['spellcasting']> = {
  barbarian: null,
  bard: { ability: 'cha', progression: 'full' },
  cleric: { ability: 'sag', progression: 'full' },
  druid: { ability: 'sag', progression: 'full' },
  fighter: null,
  monk: null,
  paladin: { ability: 'cha', progression: 'half' },
  ranger: { ability: 'sag', progression: 'half' },
  rogue: null,
  sorcerer: { ability: 'cha', progression: 'full' },
  warlock: { ability: 'cha', progression: 'pact' },
  wizard: { ability: 'int', progression: 'full' },
};

function buildClassEntity(section: ClassSection, en: Lines, fr: Lines, validItemIds: Set<string>): ClassEntity {
  const cls = section.cls;

  // Core traits (both languages).
  const enTraits = parseEnCoreTraits(en, section.enClassStart + 2, section.enCoreTraitsEnd);

  // Features (class only, NOT subclass — bounded by subclass marker).
  const enFeatures = parseFeatures(en, section.enFeaturesStart + 1, section.enSubclassStart, EN_FEATURE_HEADER);
  const frFeatures = parseFeatures(fr, section.frFeaturesStart + 1, section.frSubclassStart, FR_FEATURE_HEADER);

  // Description: paragraph between class header and core traits header.
  // For SRD 2024 there's none — the class header is immediately followed by "Core X Traits".
  // We'll synthesize from the "Becoming a X..." section as a placeholder.
  const becomingIdx = section.enCoreTraitsEnd;
  const enDescription = (() => {
    // Take 1-2 lines after "Becoming a X ..." marker.
    const paragraph = joinFeatureBody(en, becomingIdx, (l) => /^As a Level 1 Character/.test(l.trim()) || /^Becoming/.test(l.trim()));
    return paragraph.text || `${cls.en} class from the SRD 5.2.1.`;
  })();
  const frDescription = (() => {
    const paragraph = joinFeatureBody(fr, section.frCoreTraitsEnd, (l) => /^En tant que personnage de niveau 1/.test(l.trim()));
    return paragraph.text || `Classe de ${cls.fr} issue du SRD 5.2.1.`;
  })();

  // Build i18n features (zip EN+FR by index — same level/order in both).
  const features: ClassEntity['features'] = [];
  const minLen = Math.min(enFeatures.length, frFeatures.length);
  for (let k = 0; k < minLen; k++) {
    const enF = enFeatures[k];
    const frF = frFeatures[k];
    if (enF.level !== frF.level) continue; // skip drift, log later
    features.push({
      level: enF.level,
      name: { fr: frF.name, en: enF.name },
      description: { fr: frF.description, en: enF.description },
    });
  }

  const startingEquipment = extractStartingEquipment(en, section, validItemIds);

  return {
    id: cls.id,
    name: { fr: cls.fr, en: cls.en },
    hitDie: hitDieFromText(enTraits.hitPointDie),
    primaryAbility: abilitiesFromText(enTraits.primaryAbility),
    saveProficiencies: abilitiesFromText(enTraits.saveProficiencies),
    armorProficiencies: enTraits.armorTraining
      .split(/[,;]| and | or /)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 60),
    weaponProficiencies: enTraits.weaponProficiencies
      .split(/[,;]| and | or /)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 60),
    toolProficiencies: enTraits.toolProficiencies
      .split(/[,;]| and | or /)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 80),
    skillChoices: parseSkillChoices(enTraits.skillProficiencies),
    spellcasting: SPELLCASTING_BY_CLASS[cls.id],
    startingEquipment,
    description: { fr: frDescription.slice(0, 4000), en: enDescription.slice(0, 4000) },
    features,
    // weaponMasteryCount défaut 0 — les valeurs réelles (2 pour Barb/Pal/Rgr/Rog,
    // 3 pour Fighter) sont injectées par `extract-srd-weapon-mastery.ts` qui
    // enrichit le bundle à part. Le `superRefine` du schéma exige le champ
    // mais accepte 0 comme valeur valide.
    weaponMasteryCount: 0,
    source: SOURCE,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Subclass builder
// ─────────────────────────────────────────────────────────────────────

function buildSubclass(section: ClassSection, en: Lines, fr: Lines): Subclass {
  const cls = section.cls;
  const enFeatures = parseFeatures(en, section.enSubclassStart, section.enClassEnd, EN_FEATURE_HEADER);
  const frFeatures = parseFeatures(fr, section.frSubclassStart, section.frClassEnd, FR_FEATURE_HEADER);

  const enDesc = (() => {
    const j = joinFeatureBody(en, section.enSubclassStart + 2, (l) => EN_FEATURE_HEADER.test(l));
    return j.text || `${cls.subclassEn} subclass from the SRD 5.2.1.`;
  })();
  const frDesc = (() => {
    const j = joinFeatureBody(fr, section.frSubclassStart + 2, (l) => FR_FEATURE_HEADER.test(l));
    return j.text || `Sous-classe ${cls.subclassFr} issue du SRD 5.2.1.`;
  })();

  const features: Subclass['features'] = [];
  const minLen = Math.min(enFeatures.length, frFeatures.length);
  for (let k = 0; k < minLen; k++) {
    const enF = enFeatures[k];
    const frF = frFeatures[k];
    if (enF.level !== frF.level) continue;
    features.push({
      level: enF.level,
      name: { fr: frF.name, en: enF.name },
      description: { fr: frF.description, en: enF.description },
    });
  }

  return {
    id: cls.subclassIdSlug,
    classId: cls.id,
    name: { fr: cls.subclassFr, en: cls.subclassEn },
    description: { fr: frDesc.slice(0, 4000), en: enDesc.slice(0, 4000) },
    features,
    source: SOURCE,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Ancestry parser
// ─────────────────────────────────────────────────────────────────────

const EN_ANCESTRY_TRAIT_HEADER = /^\s+([A-Z][\w’' ()-]+?)\.\s+(.+)/;
const FR_ANCESTRY_TRAIT_HEADER = /^\s*([A-ZÀÁÂÄÆÇÈÉÊËÎÏÔŒÙÛÜŸ][\w’'\sàâäéèêëîïôöùûüçœÆÇ()-]+?)\.\s+(.+)/;

function parseSize(text: string): 'tiny' | 'small' | 'medium' | 'large' {
  const lower = text.toLowerCase();
  if (lower.includes('small')) return 'small';
  if (lower.includes('large')) return 'large';
  if (lower.includes('petite') || lower.startsWith('p ')) return 'small';
  if (lower.startsWith('tg')) return 'large';
  // Default to medium for any "Medium" / "M" / unknown.
  return 'medium';
}

function parseSpeedFeet(text: string): number {
  // EN: "30 feet" / "35 feet" — FR: "9 m" / "10,50 m"
  const enMatch = text.match(/(\d+)\s*feet/);
  if (enMatch) return Number(enMatch[1]);
  const frMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m\b/);
  if (frMatch) {
    const meters = Number(frMatch[1].replace(',', '.'));
    return Math.round(meters / 0.3); // 1.5m ≈ 5ft
  }
  return 30;
}

function parseAncestrySpeciesEn(lines: Lines, ancestry: AncestryMapping, sectionStart: number, sectionEnd: number): {
  size: string;
  speed: string;
  traits: { name: string; description: string }[];
} {
  const startIdx = findIndex(lines, (l) => l.trim() === ancestry.en, sectionStart);
  if (startIdx < 0 || startIdx >= sectionEnd) {
    throw new Error(`EN ancestry not found: ${ancestry.en} in [${sectionStart}, ${sectionEnd}]`);
  }
  // Bounds end: next ancestry header or sectionEnd.
  const ancestryNames = new Set(ANCESTRIES.filter((a) => a.id !== ancestry.id).map((a) => a.en));
  let endIdx = sectionEnd;
  for (let i = startIdx + 1; i < sectionEnd; i++) {
    if (ancestryNames.has(lines.raw[i].trim())) {
      endIdx = i;
      break;
    }
  }

  // Read header lines: "Creature Type:", "Size:", "Speed:"
  let size = '';
  let speed = '';
  for (let i = startIdx + 1; i < Math.min(startIdx + 8, endIdx); i++) {
    const ln = lines.raw[i].trim();
    if (ln.startsWith('Size:')) size = ln.slice(5).trim();
    else if (ln.startsWith('Speed:')) speed = ln.slice(6).trim();
  }

  // Traits: lines matching "    <Name>. <text>" until end.
  const traits: { name: string; description: string }[] = [];
  let i = startIdx + 5;
  while (i < endIdx) {
    const ln = lines.raw[i];
    const m = ln.match(EN_ANCESTRY_TRAIT_HEADER);
    if (m && m[1].trim().split(' ').length <= 4) {
      const name = m[1].trim();
      const body = joinFeatureBody(
        lines,
        i,
        (l) => l.match(EN_ANCESTRY_TRAIT_HEADER) !== null && l !== ln,
        endIdx,
      );
      const desc = body.text.replace(/^.*?\.\s*/, '').trim();
      traits.push({ name, description: desc });
      i = body.nextIdx > i ? body.nextIdx : i + 1;
    } else {
      i++;
    }
  }
  return { size, speed, traits };
}

function parseAncestrySpeciesFr(lines: Lines, ancestry: AncestryMapping, sectionStart: number, sectionEnd: number): {
  size: string;
  speed: string;
  traits: { name: string; description: string }[];
} {
  const startIdx = findIndex(lines, (l) => l.trim() === ancestry.fr, sectionStart);
  if (startIdx < 0 || startIdx >= sectionEnd) {
    throw new Error(`FR ancestry not found: ${ancestry.fr} in [${sectionStart}, ${sectionEnd}]`);
  }
  const ancestryNames = new Set(ANCESTRIES.filter((a) => a.id !== ancestry.id).map((a) => a.fr));
  let endIdx = sectionEnd;
  for (let i = startIdx + 1; i < sectionEnd; i++) {
    if (ancestryNames.has(lines.raw[i].trim())) {
      endIdx = i;
      break;
    }
  }

  let size = '';
  let speed = '';
  for (let i = startIdx + 1; i < Math.min(startIdx + 8, endIdx); i++) {
    const ln = lines.raw[i].trim();
    if (ln.startsWith('Catégorie de taille')) size = ln.replace(/^Catégorie de taille\s*:\s*/, '').trim();
    else if (ln.startsWith('Vitesse')) speed = ln.replace(/^Vitesse\s*:\s*/, '').trim();
  }

  const traits: { name: string; description: string }[] = [];
  let i = startIdx + 5;
  while (i < endIdx) {
    const ln = lines.raw[i];
    const m = ln.match(FR_ANCESTRY_TRAIT_HEADER);
    if (m && m[1].trim().split(' ').length <= 4) {
      const name = m[1].trim();
      const body = joinFeatureBody(
        lines,
        i,
        (l) => l.match(FR_ANCESTRY_TRAIT_HEADER) !== null && l !== ln,
        endIdx,
      );
      const desc = body.text.replace(/^.*?\.\s*/, '').trim();
      traits.push({ name, description: desc });
      i = body.nextIdx > i ? body.nextIdx : i + 1;
    } else {
      i++;
    }
  }
  return { size, speed, traits };
}

function buildAncestries(en: Lines, fr: Lines): Ancestry[] {
  const enStart = findIndex(en, (l) => l.trim() === 'Character Species');
  const enEnd = findIndex(en, (l) => l.trim() === 'Feats', enStart);
  const frStart = findIndex(fr, (l) => l.trim() === 'Espèces des personnages');
  const frEnd = findIndex(fr, (l) => l.trim() === 'Dons', frStart);

  if (enStart < 0 || enEnd < 0) throw new Error('EN species section not found');
  if (frStart < 0 || frEnd < 0) throw new Error('FR species section not found');

  const out: Ancestry[] = [];
  for (const a of ANCESTRIES) {
    const enParsed = parseAncestrySpeciesEn(en, a, enStart, enEnd);
    const frParsed = parseAncestrySpeciesFr(fr, a, frStart, frEnd);
    out.push({
      id: a.id,
      name: { fr: a.fr, en: a.en },
      size: parseSize(enParsed.size || frParsed.size),
      speed: parseSpeedFeet(enParsed.speed || frParsed.speed),
      description: {
        fr: `Espèce ${a.fr} (SRD 5.2.1).`,
        en: `${a.en} species (SRD 5.2.1).`,
      },
      abilityScoreIncrease: [], // SRD 2024: ASI is on backgrounds, not species
      traits: zipTraits(enParsed.traits, frParsed.traits),
      languages: ['common'],
      source: SOURCE,
      // Sous-objet enrichi à part par `scripts/extract-srd-ancestries.ts`
      // (dragonAncestries / tieflingLegacies / elfLineages / gnomeLineages /
      // giantAncestries / versatileFeatIds / skillfulOptions). Ce parseur
      // texte legacy ne les peuple pas — sentinelle vide volontaire.
      options: {},
    });
  }
  return out;
}

// Ancestry traits are listed alphabetically within each language, so the
// alphabets differ (Darkvision/Stonecunning in EN vs. Connaissance/Vision in FR).
// Index-based pairing is wrong; we'd need per-ancestry FR↔EN name maps to align.
// Until plan 34 provides those maps, ship FR-only for traits — EN is optional in
// I18nSchema, app default language is FR, so this is harmless and avoids wrong pairs.
function zipTraits(
  _enTraits: { name: string; description: string }[],
  frTraits: { name: string; description: string }[],
): { name: { fr: string }; description: { fr: string } }[] {
  return frTraits.map((t) => ({
    name: { fr: t.name },
    description: { fr: t.description },
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Hand-authored: Backgrounds (SRD 2024 — 4 entries)
// ─────────────────────────────────────────────────────────────────────

function handAuthorBackgrounds(validItemIds: Set<string>): Background[] {
  // Helper qui valide chaque itemId au build (fail-loud).
  const ref = (itemId: string, qty: number = 1): StartingEquipmentItemRef => {
    if (!validItemIds.has(itemId)) {
      throw new Error(`Background equipment references unknown itemId "${itemId}". Update items DB or fix reference.`);
    }
    return { itemId, qty };
  };
  return [
    {
      id: 'acolyte',
      name: { fr: 'Acolyte', en: 'Acolyte' },
      description: {
        fr: "L'Acolyte sert un dieu, un panthéon ou une cause sacrée. Élevé au sein d'un temple ou d'un ordre religieux, l'Acolyte connaît les rituels, la liturgie et les écrits sacrés.",
        en: 'An Acolyte serves a god, pantheon, or sacred cause. Raised in a temple or religious order, the Acolyte knows the rites, liturgy, and sacred writings.',
      },
      skillProficiencies: ['Insight', 'Religion'],
      toolProficiencies: ['calligraphers-supplies'],
      languages: 0,
      // SRD prose: Calligrapher’s Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP.
      equipment: [
        ref('calligraphers-supplies'),
        ref('book'), // book of prayers
        ref('holy-symbol'),
        ref('parchment', 10),
        ref('robe'),
      ],
      startingCoins: { qty: 8, unit: 'gp' },
      feature: {
        name: { fr: 'Don : Initié à la magie (Clerc)', en: 'Feat: Magic Initiate (Cleric)' },
        description: {
          fr: "L'Acolyte reçoit le don d'origines Initié à la magie (Clerc), qui octroie deux sorts mineurs et un sort de niveau 1 puisés dans la liste de Clerc.",
          en: 'The Acolyte gains the Magic Initiate (Cleric) Origin feat, which grants two cantrips and one level-1 spell from the Cleric list.',
        },
      },
      source: SOURCE,
    },
    {
      id: 'criminal',
      name: { fr: 'Criminel', en: 'Criminal' },
      description: {
        fr: "Le Criminel a appris à survivre par la débrouillardise dans les bas-fonds : pickpocket, contrebandier ou cambrioleur, vous évoluez dans les marges de la société.",
        en: 'The Criminal has survived by their wits in the underworld: pickpocket, smuggler, or burglar, you operate in the margins of society.',
      },
      skillProficiencies: ['Sleight of Hand', 'Stealth'],
      toolProficiencies: ['thieves-tools'],
      languages: 0,
      // SRD prose: 2 Daggers, Thieves’ Tools, Crowbar, 2 Pouches, Traveler’s Clothes, 16 GP.
      equipment: [
        ref('dagger', 2),
        ref('thieves-tools'),
        ref('crowbar'),
        ref('pouch', 2),
        ref('clothes-travelers'),
      ],
      startingCoins: { qty: 16, unit: 'gp' },
      feature: {
        name: { fr: 'Don : Vigilant', en: 'Feat: Alert' },
        description: {
          fr: "Le Criminel reçoit le don d'origines Vigilant : ajoutez votre bonus de maîtrise à vos jets d'Initiative et échangez votre rang d'initiative avec un allié consentant.",
          en: 'The Criminal gains the Alert Origin feat: add your Proficiency Bonus to Initiative rolls and swap your initiative count with a willing ally.',
        },
      },
      source: SOURCE,
    },
    {
      id: 'sage',
      name: { fr: 'Sage', en: 'Sage' },
      description: {
        fr: "Le Sage a passé des années à étudier les écrits anciens, à voyager entre bibliothèques et académies, et à interroger des érudits sur les mystères du monde.",
        en: 'The Sage has spent years studying ancient writings, travelling between libraries and academies, and questioning scholars about the mysteries of the world.',
      },
      skillProficiencies: ['Arcana', 'History'],
      toolProficiencies: ['calligraphers-supplies'],
      languages: 0,
      // SRD prose: Quarterstaff, Calligrapher’s Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP.
      equipment: [
        ref('quarterstaff'),
        ref('calligraphers-supplies'),
        ref('book'),
        ref('parchment', 8),
        ref('robe'),
      ],
      startingCoins: { qty: 8, unit: 'gp' },
      feature: {
        name: { fr: 'Don : Initié à la magie (Magicien)', en: 'Feat: Magic Initiate (Wizard)' },
        description: {
          fr: 'Le Sage reçoit le don Initié à la magie (Magicien), qui octroie deux sorts mineurs et un sort de niveau 1 puisés dans la liste de Magicien.',
          en: 'The Sage gains the Magic Initiate (Wizard) feat, granting two cantrips and one level-1 spell from the Wizard list.',
        },
      },
      source: SOURCE,
    },
    {
      id: 'soldier',
      name: { fr: 'Soldat', en: 'Soldier' },
      description: {
        fr: "Le Soldat a servi dans une armée, une milice ou une bande mercenaire. Vous connaissez le poids du commandement, la discipline du rang, et la brutalité du champ de bataille.",
        en: 'The Soldier served in an army, militia, or mercenary band. You know the weight of command, the discipline of rank, and the brutality of the battlefield.',
      },
      skillProficiencies: ['Athletics', 'Intimidation'],
      toolProficiencies: ['gaming-set'],
      languages: 0,
      // SRD prose: Spear, Shortbow, 20 Arrows, Gaming Set, Healer’s Kit, Quiver, Traveler’s Clothes, 14 GP.
      equipment: [
        ref('spear'),
        ref('shortbow'),
        ref('ammunition-arrows', 20),
        ref('gaming-set'),
        ref('healers-kit'),
        ref('quiver'),
        ref('clothes-travelers'),
      ],
      startingCoins: { qty: 14, unit: 'gp' },
      feature: {
        name: { fr: 'Don : Sauvagerie martiale', en: 'Feat: Savage Attacker' },
        description: {
          fr: "Le Soldat reçoit le don Sauvagerie martiale : une fois par tour, vous pouvez relancer les dés de dégâts d'une attaque d'arme et garder le meilleur résultat.",
          en: 'The Soldier gains the Savage Attacker feat: once per turn, you can reroll the damage dice of one weapon attack and use the higher result.',
        },
      },
      source: SOURCE,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────
// Hand-authored: Conditions (SRD 2024 — 15 entries)
// ─────────────────────────────────────────────────────────────────────

function handAuthorConditions(): Condition[] {
  return [
    {
      id: 'blinded',
      name: { fr: 'Aveuglé', en: 'Blinded' },
      description: {
        fr: "Tant que vous avez l'état Aveuglé, vous ne voyez rien et ratez automatiquement tout test de caractéristique reposant sur la vue. Les jets d'attaque contre vous ont l'Avantage, et vos jets d'attaque subissent le Désavantage.",
        en: "While you have the Blinded condition, you can't see and automatically fail any ability check that requires sight. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.",
      },
      source: SOURCE,
    },
    {
      id: 'charmed',
      name: { fr: 'Charmé', en: 'Charmed' },
      description: {
        fr: "Tant que vous avez l'état Charmé, vous ne pouvez pas attaquer votre charmeur ni le cibler avec des aptitudes ou effets magiques qui infligent des dégâts. Le charmeur a l'Avantage aux tests de caractéristique d'interaction sociale avec vous.",
        en: "While you have the Charmed condition, you can't attack the charmer or target the charmer with damaging abilities or magical effects. The charmer has Advantage on any ability check to interact with you socially.",
      },
      source: SOURCE,
    },
    {
      id: 'deafened',
      name: { fr: 'Assourdi', en: 'Deafened' },
      description: {
        fr: "Tant que vous avez l'état Assourdi, vous n'entendez rien et ratez automatiquement tout test de caractéristique reposant sur l'ouïe.",
        en: "While you have the Deafened condition, you can't hear and automatically fail any ability check that requires hearing.",
      },
      source: SOURCE,
    },
    {
      id: 'exhaustion',
      name: { fr: 'Épuisement', en: 'Exhaustion' },
      description: {
        fr: "Tant que vous avez l'état Épuisement, vous accumulez des niveaux d'Épuisement (cumulables). Lorsque vous effectuez un Test d20, le résultat est réduit de 2 fois votre niveau actuel d'Épuisement. Votre Vitesse est réduite de 1,50 m × votre niveau d'Épuisement. À 6 niveaux, vous mourez. Terminer un Repos long retire 1 niveau.",
        en: 'While you have the Exhaustion condition, you accumulate Exhaustion levels. When you make a D20 Test, the roll is reduced by 2 times your Exhaustion level. Your Speed is reduced by 5 feet × your Exhaustion level. You die at level 6. Finishing a Long Rest removes 1 level.',
      },
      source: SOURCE,
    },
    {
      id: 'frightened',
      name: { fr: 'Effrayé', en: 'Frightened' },
      description: {
        fr: "Tant que vous avez l'état Effrayé, vous subissez le Désavantage aux tests de caractéristique et aux jets d'attaque tant que la source de votre effroi est dans votre champ de vision. Vous ne pouvez pas vous rapprocher volontairement de la source de votre effroi.",
        en: 'While you have the Frightened condition, you have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight. You can’t willingly move closer to the source of fear.',
      },
      source: SOURCE,
    },
    {
      id: 'grappled',
      name: { fr: 'Agrippé', en: 'Grappled' },
      description: {
        fr: "Tant que vous avez l'état Agrippé, votre Vitesse est de 0 et ne peut pas augmenter. Vous subissez le Désavantage aux jets d'attaque contre toute cible autre que celui qui vous agrippe. Celui qui vous agrippe peut vous traîner ou vous porter, mais chaque mètre de déplacement lui coûte 30 cm supplémentaires.",
        en: "While you have the Grappled condition, your Speed is 0 and can't increase. You have Disadvantage on attack rolls against any target other than the grappler. The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot.",
      },
      source: SOURCE,
    },
    {
      id: 'incapacitated',
      name: { fr: 'Neutralisé', en: 'Incapacitated' },
      description: {
        fr: "Tant que vous avez l'état Neutralisé, vous ne pouvez entreprendre aucune action, action Bonus ou Réaction. Votre Concentration est rompue. Vous ne pouvez pas parler. Si vous êtes Neutralisé au moment de lancer l'Initiative, vous subissez le Désavantage à ce jet.",
        en: "While you have the Incapacitated condition, you can't take any action, Bonus Action, or Reaction. Your Concentration is broken. You can't speak. If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll.",
      },
      source: SOURCE,
    },
    {
      id: 'invisible',
      name: { fr: 'Invisible', en: 'Invisible' },
      description: {
        fr: "Tant que vous avez l'état Invisible, vous obtenez l'Avantage à l'Initiative. Vous n'êtes pas affecté par tout effet qui requiert que sa cible soit visible, sauf si son créateur peut vous voir d'une manière quelconque. Les jets d'attaque contre vous subissent le Désavantage et vos jets d'attaque ont l'Avantage.",
        en: "While you have the Invisible condition, you have Advantage on Initiative rolls. You aren't affected by any effect that requires its target to be seen unless the effect's creator can somehow see you. Attack rolls against you have Disadvantage, and your attack rolls have Advantage.",
      },
      source: SOURCE,
    },
    {
      id: 'paralyzed',
      name: { fr: 'Paralysé', en: 'Paralyzed' },
      description: {
        fr: "Tant que vous avez l'état Paralysé, vous subissez l'état Neutralisé. Votre Vitesse est de 0. Vous ratez automatiquement les jets de sauvegarde de Force et de Dextérité. Les jets d'attaque contre vous ont l'Avantage. Tout jet d'attaque qui vous touche est un Coup critique si l'assaillant est dans un rayon de 1,50 m de vous.",
        en: 'While you have the Paralyzed condition, you have the Incapacitated condition. Your Speed is 0. You automatically fail Strength and Dexterity saving throws. Attack rolls against you have Advantage. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.',
      },
      source: SOURCE,
    },
    {
      id: 'petrified',
      name: { fr: 'Pétrifié', en: 'Petrified' },
      description: {
        fr: "Tant que vous avez l'état Pétrifié, vous êtes transformé, vous-même et tous les objets non magiques que vous portez, en une substance solide et inanimée (généralement de la pierre). Votre poids est multiplié par dix, vous ne vieillissez plus, vous subissez l'état Neutralisé et votre Vitesse est de 0. Vous ratez automatiquement les jets de sauvegarde de Force et de Dextérité, les attaques contre vous ont l'Avantage, vous bénéficiez de la Résistance à tous les dégâts et de l'Immunité à l'état Empoisonné.",
        en: 'While you have the Petrified condition, you are transformed (along with any nonmagical objects you are wearing and carrying) into a solid inanimate substance (usually stone). Your weight is multiplied by ten and you cease aging. You have the Incapacitated condition and your Speed is 0. You automatically fail Strength and Dexterity saving throws, attack rolls against you have Advantage, you have Resistance to all damage, and you have Immunity to the Poisoned condition.',
      },
      source: SOURCE,
    },
    {
      id: 'poisoned',
      name: { fr: 'Empoisonné', en: 'Poisoned' },
      description: {
        fr: "Tant que vous avez l'état Empoisonné, vous subissez le Désavantage aux jets d'attaque et aux tests de caractéristique.",
        en: 'While you have the Poisoned condition, you have Disadvantage on attack rolls and ability checks.',
      },
      source: SOURCE,
    },
    {
      id: 'prone',
      name: { fr: 'À terre', en: 'Prone' },
      description: {
        fr: "Tant que vous avez l'état À terre, vos seuls modes de déplacement sont ramper ou consacrer la moitié de votre Vitesse (arrondi à l'inférieur) à vous relever pour mettre fin à l'état. Vous subissez le Désavantage aux jets d'attaque. Les attaques contre vous ont l'Avantage si l'assaillant est à 1,50 m ou moins, sinon Désavantage.",
        en: 'While you have the Prone condition, your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself and end the condition. You have Disadvantage on attack rolls. Attacks against you have Advantage if the attacker is within 5 feet, otherwise Disadvantage.',
      },
      source: SOURCE,
    },
    {
      id: 'restrained',
      name: { fr: 'Entravé', en: 'Restrained' },
      description: {
        fr: "Tant que vous avez l'état Entravé, votre Vitesse est de 0 et ne peut pas augmenter. Les jets d'attaque contre vous ont l'Avantage et vos jets d'attaque subissent le Désavantage. Vous subissez le Désavantage aux jets de sauvegarde de Dextérité.",
        en: "While you have the Restrained condition, your Speed is 0 and can't increase. Attack rolls against you have Advantage, and your attack rolls have Disadvantage. You have Disadvantage on Dexterity saving throws.",
      },
      source: SOURCE,
    },
    {
      id: 'stunned',
      name: { fr: 'Étourdi', en: 'Stunned' },
      description: {
        fr: "Tant que vous avez l'état Étourdi, vous subissez l'état Neutralisé. Vous ratez automatiquement les jets de sauvegarde de Force et de Dextérité. Les jets d'attaque contre vous ont l'Avantage.",
        en: 'While you have the Stunned condition, you have the Incapacitated condition. You automatically fail Strength and Dexterity saving throws. Attack rolls against you have Advantage.',
      },
      source: SOURCE,
    },
    {
      id: 'unconscious',
      name: { fr: 'Inconscient', en: 'Unconscious' },
      description: {
        fr: "Tant que vous avez l'état Inconscient, vous subissez les états Neutralisé et À terre, et vous lâchez tout ce que vous tenez. Quand l'état prend fin, vous restez À terre. Votre Vitesse est de 0. Les attaques contre vous ont l'Avantage. Vous ratez automatiquement les jets de sauvegarde de Force et de Dextérité. Tout jet d'attaque qui vous touche est un Coup critique si l'assaillant est à 1,50 m ou moins. Vous êtes inconscient de votre environnement.",
        en: "While you have the Unconscious condition, you have the Incapacitated and Prone conditions, and you drop whatever you're holding. When the condition ends, you remain Prone. Your Speed is 0. Attack rolls against you have Advantage. You automatically fail Strength and Dexterity saving throws. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you. You're unaware of your surroundings.",
      },
      source: SOURCE,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

interface ParseSummary {
  classes: number;
  subclasses: number;
  ancestries: number;
  subancestries: number;
  backgrounds: number;
  conditions: number;
  rules: number;
  items: number;
  errors: string[];
}

async function writeJsonValidated<T>(name: string, data: T[], schema: z.ZodType<T>, summary: ParseSummary): Promise<void> {
  const result = z.array(schema).safeParse(data);
  const outPath = join(OUT_DIR, `${name}.json`);
  if (!result.success) {
    summary.errors.push(`${name}: ${result.error.errors.length} validation errors`);
    const sampled = result.error.errors.slice(0, 5);
    for (const e of sampled) {
      summary.errors.push(`  [${e.path.join('.')}]: ${e.message}`);
    }
    // Filter to valid only.
    const valid = data.filter((d) => schema.safeParse(d).success);
    await writeFile(outPath, JSON.stringify(valid, null, 2), 'utf8');
    console.log(`  → ${outPath}: ${valid.length}/${data.length} valid (${data.length - valid.length} dropped)`);
  } else {
    await writeFile(outPath, JSON.stringify(result.data, null, 2), 'utf8');
    console.log(`  ✓ ${outPath}: ${result.data.length} entities`);
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Loading SRD raw text...');
  const enText = await readFile(EN_FILE, 'utf8');
  const frText = await readFile(FR_FILE, 'utf8');
  const en = loadLines(enText);
  const fr = loadLines(frText);
  console.log(`  EN: ${en.raw.length} lines, FR: ${fr.raw.length} lines`);

  const summary: ParseSummary = {
    classes: 0,
    subclasses: 0,
    ancestries: 0,
    subancestries: 0,
    backgrounds: 0,
    conditions: 0,
    rules: 0,
    items: 0,
    errors: [],
  };

  console.log('\nMapping class sections...');
  const sections = findClassSections(en, fr);
  console.log(`  Found ${sections.length} class sections`);

  console.log('\nParsing equipment first (required for class startingEquipment cross-references)...');
  const equipmentResult = await parseEquipment();
  const validItemIds = new Set<string>(equipmentResult.byId.keys());
  console.log(`  ✓ ${validItemIds.size} item IDs available for cross-reference`);

  console.log('\nBuilding classes...');
  const classes = sections.map((s) => buildClassEntity(s, en, fr, validItemIds));
  await writeJsonValidated('classes', classes, ClassSchema, summary);
  summary.classes = classes.length;

  console.log('\nBuilding subclasses...');
  const subclasses = sections.map((s) => buildSubclass(s, en, fr));
  await writeJsonValidated('subclasses', subclasses, SubclassSchema, summary);
  summary.subclasses = subclasses.length;

  console.log('\nBuilding ancestries...');
  const ancestries = buildAncestries(en, fr);
  await writeJsonValidated('ancestries', ancestries, AncestrySchema, summary);
  summary.ancestries = ancestries.length;

  console.log('\nWriting subancestries (intentionally empty — SRD 2024 uses in-trait choices)...');
  await writeJsonValidated('subancestries', [], z.never(), summary);

  console.log('\nWriting hand-authored backgrounds (with itemId references)...');
  const backgrounds = handAuthorBackgrounds(validItemIds);
  await writeJsonValidated('backgrounds', backgrounds, BackgroundSchema, summary);
  summary.backgrounds = backgrounds.length;

  console.log('\nWriting hand-authored conditions...');
  const conditions = handAuthorConditions();
  await writeJsonValidated('conditions', conditions, ConditionSchema, summary);
  summary.conditions = conditions.length;

  // items.json was already written by parseEquipment() above (190 items). Keep it.
  // rules deferred to a follow-up session — keep stub.
  console.log('\nWriting deferred stub (rules)...');
  await writeFile(join(OUT_DIR, 'rules.json'), '[]\n', 'utf8');
  summary.items = equipmentResult.items.length;

  console.log('\n──────────────────────────────────────────');
  console.log(`Summary:`);
  console.log(`  classes      : ${summary.classes}`);
  console.log(`  subclasses   : ${summary.subclasses}`);
  console.log(`  ancestries   : ${summary.ancestries}`);
  console.log(`  subancestries: 0 (intentional)`);
  console.log(`  backgrounds  : ${summary.backgrounds}`);
  console.log(`  conditions   : ${summary.conditions}`);
  console.log(`  items        : ${summary.items}`);
  console.log(`  rules        : 0 (deferred, see EXTRACTION-NOTES.md)`);
  if (summary.errors.length > 0) {
    console.log(`\n⚠ Errors:`);
    for (const e of summary.errors) console.log(`  ${e}`);
    process.exit(1);
  }
  console.log('──────────────────────────────────────────');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
