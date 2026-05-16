/**
 * scripts/parse-srd-equipment.ts
 *
 * Parses the SRD 5.2.1 EN + FR raw text for equipment :
 *   - Weapons   (44) : tuple-match (damage, damage type, mastery, cost) FR↔EN
 *   - Armor     (12 + Shield) : tuple-match (AC formula, str req, stealth, cost)
 *   - Adventuring Gear (~80) + Ammunition / Arcane Focus / Druidic Focus /
 *     Holy Symbol variants : explicit name map (gear-fr-en.ts)
 *   - Tools     (~25) + Gaming Set + Musical Instrument variants : name map
 *
 * Aussi : extrait Starting Equipment de chaque classe (12) pour brancher les
 * itemIds réels dans ClassSchema.startingEquipment.
 *
 * Discipline FR↔EN : tuple-match strict (fail-loud sur orphelin/collision)
 * pour les tables structurées ; name map fail-loud pour gear/tools.
 *
 * Run: pnpm content:parse-srd-equipment
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ItemSchema, type Item } from '../src/shared/types/content.js';
import { z } from 'zod';
import {
  DAMAGE_TYPE_EN_FR,
  DAMAGE_TYPE_FR_EN,
  DAMAGE_TYPE_SINGULAR_FR_EN,
  MASTERY_FR_EN,
  WEAPON_PROPERTY_EN_FR,
  normalizeMasteryEn,
  normalizeMasteryFr,
  coinCanonicalFromEn,
  coinCanonicalFromFr,
  type CoinCanonical,
} from './maps/weapon-properties-fr-en.js';
import {
  GEAR_TABLE_MAP,
  ARCANE_FOCUS_VARIANTS_MAP,
  DRUIDIC_FOCUS_VARIANTS_MAP,
  HOLY_SYMBOL_VARIANTS_MAP,
  AMMUNITION_VARIANTS_MAP,
  normalizeLabel,
  type GearMapEntry,
} from './maps/gear-fr-en.js';
import {
  TOOLS_MAP,
  GAMING_SET_VARIANTS_MAP,
  MUSICAL_INSTRUMENT_VARIANTS_MAP,
} from './maps/tools-fr-en.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const RAW_DIR = 'content-sources/extracted/raw';
const OUT_DIR = 'content-sources/extracted/srd';
const EN_FILE = join(RAW_DIR, 'SRD_CC_v5.2.1.txt');
const FR_FILE = join(RAW_DIR, 'FR_SRD_CC_v5.2.1.txt');
const SOURCE = 'srd-5.2.1' as const;

// ─── Text helpers ───────────────────────────────────────────────────────────

interface Lines {
  raw: string[];
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

/** Collapse a stretch of consecutive table rows into "joined" candidate strings.
 *  A row is complete when it ends with a cost token (NN po / NN GP / —).
 *  Empty lines or page-break artifacts terminate the current row. */
function _collapseTableBlock(lines: Lines, fromIdx: number, endIdx: number, costRe: RegExp): string[] {
  const out: string[] = [];
  let buf: string[] = [];
  for (let i = fromIdx; i < endIdx; i++) {
    const ln = lines.raw[i];
    const trimmed = ln.trim();
    if (!trimmed) {
      if (buf.length) {
        out.push(buf.join(' '));
        buf = [];
      }
      continue;
    }
    // Drop page-break artifacts.
    if (/^Document de Référence du Système|^System Reference Document/.test(trimmed)) continue;
    if (/^\d{1,3}$/.test(trimmed)) continue;
    buf.push(trimmed);
    // If the buffered text ends with a cost, flush.
    const joined = buf.join(' ');
    if (costRe.test(joined)) {
      out.push(joined);
      buf = [];
    }
  }
  if (buf.length) out.push(buf.join(' '));
  return out;
}

// ─── Number / cost / weight parsing ─────────────────────────────────────────

const EN_COST_RE = /(\d+(?:,\d{3})*)\s*(CP|SP|EP|GP|PP)\s*$/;
const FR_COST_RE = /(\d+(?:[\s ]\d{3})*(?:[.,]\d+)?)\s*(p[caeop])\s*$/;
const _EN_WEIGHT_RE = /(\d+(?:[½¼¾]|\s*\d+\/\d+|[.,]\d+)?|[½¼¾])\s*lb\./;
const _FR_WEIGHT_RE = /(\d+(?:[.,]\d+)?)\s*(g|kg)\b/;

interface CostNum {
  qty: number;
  unit: CoinCanonical;
}

function parseEnCost(s: string): CostNum | null {
  const m = s.match(EN_COST_RE);
  if (!m) return null;
  const qty = Number(m[1].replace(/,/g, ''));
  return { qty, unit: coinCanonicalFromEn(m[2]) };
}
function parseFrCost(s: string): CostNum | null {
  const m = s.match(FR_COST_RE);
  if (!m) return null;
  const qty = Number(m[1].replace(/[\s ]/g, '').replace(',', '.'));
  return { qty, unit: coinCanonicalFromFr(m[2]) };
}

/** EN weight in lb (handles "2 lb.", "1/2 lb.", "½ lb.", "58½ lb."), null if "—". */
function parseEnWeightLb(s: string): number | null {
  if (/—|\bVaries\b/.test(s)) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*([½¼¾])?\s*lb\.|([½¼¾])\s*lb\./);
  if (m) {
    const intPart = m[1] ? Number(m[1].replace(',', '.')) : 0;
    const fracChar = m[2] || m[3];
    const frac = fracChar === '½' ? 0.5 : fracChar === '¼' ? 0.25 : fracChar === '¾' ? 0.75 : 0;
    return intPart + frac;
  }
  // "1/2 lb."
  const f = s.match(/(\d+)\/(\d+)\s*lb\./);
  if (f) return Number(f[1]) / Number(f[2]);
  return null;
}

/** FR weight in kg → lb (1 lb ≈ 0.5 kg per SRD canon, but we just round). */
function parseFrWeightLb(s: string): number | null {
  if (/—|variable/i.test(s)) return null;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(g|kg)\b/);
  if (!m) return null;
  const qty = Number(m[1].replace(',', '.'));
  const lbs = m[2] === 'g' ? qty / 453.592 : qty / 0.453592;
  return Math.round(lbs * 100) / 100;
}

// ─── ID generation ──────────────────────────────────────────────────────────

const APOSTROPHE_RE = /[’']/g;

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(APOSTROPHE_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Weapons parsing ────────────────────────────────────────────────────────

type WeaponCategory =
  | 'simple-melee'
  | 'simple-ranged'
  | 'martial-melee'
  | 'martial-ranged';

const EN_WEAPON_SECTION_HEADERS: Record<string, WeaponCategory> = {
  'Simple Melee Weapons': 'simple-melee',
  'Simple Ranged Weapons': 'simple-ranged',
  'Martial Melee Weapons': 'martial-melee',
  'Martial Ranged Weapons': 'martial-ranged',
};
const FR_WEAPON_SECTION_HEADERS: Record<string, WeaponCategory> = {
  'Armes courantes de corps à corps': 'simple-melee',
  'Armes courantes à distance': 'simple-ranged',
  'Armes de guerre de corps à corps': 'martial-melee',
  'Armes de guerre à distance': 'martial-ranged',
};

interface RawWeaponEn {
  name: string;
  damage: { dice: string; type: string };
  properties: string[];
  mastery: string | null;
  weightLb: number | null;
  cost: CostNum | null;
  category: WeaponCategory;
}
interface RawWeaponFr {
  name: string;
  damage: { dice: string; typeFr: string };
  properties: string[];
  mastery: string | null;
  weightLb: number | null;
  cost: CostNum | null;
  category: WeaponCategory;
}

const EN_MASTERY_TOKEN_RE = /(Cleave|Graze|Nick|Push|Sap|Slow|To\s*p\s*p\s*le|Topple|Vex)/;
const FR_MASTERY_TOKEN_RE =
  /(Coup\s+double|Enchaînement|Écorchure|Ouverture|Poussée|Ralentissement|Renversement|Sape)/;

/** Extract the final weight + cost suffix from an EN row, returning the leading text. */
function splitEnSuffix(joined: string): { lead: string; weightLb: number | null; cost: CostNum | null } {
  const cost = parseEnCost(joined);
  if (!cost) return { lead: joined, weightLb: null, cost: null };
  const costMatch = joined.match(EN_COST_RE)!;
  const beforeCost = joined.slice(0, costMatch.index!).trimEnd();
  const weightLb = parseEnWeightLb(beforeCost);
  // strip the matched weight from the end of "lead"
  let lead = beforeCost;
  const wMatch = beforeCost.match(/(\d+(?:[.,]\d+)?\s*[½¼¾]?\s*lb\.|[½¼¾]\s*lb\.|\d+\/\d+\s*lb\.)\s*$/);
  if (wMatch) lead = beforeCost.slice(0, wMatch.index!).trimEnd();
  return { lead, weightLb, cost };
}
function splitFrSuffix(joined: string): { lead: string; weightLb: number | null; cost: CostNum | null } {
  const cost = parseFrCost(joined);
  if (!cost) return { lead: joined, weightLb: null, cost: null };
  const costMatch = joined.match(FR_COST_RE)!;
  const beforeCost = joined.slice(0, costMatch.index!).trimEnd();
  const weightLb = parseFrWeightLb(beforeCost);
  let lead = beforeCost;
  const wMatch = beforeCost.match(/(\d+(?:[.,]\d+)?\s*(?:g|kg))\s*$/);
  if (wMatch) lead = beforeCost.slice(0, wMatch.index!).trimEnd();
  // Some rows write "5 kg   500 po" — handle leading whitespace.
  return { lead, weightLb, cost };
}

function parseEnWeaponRow(joined: string, category: WeaponCategory): RawWeaponEn {
  // Find damage marker.
  const dmgMatch = joined.match(/(\d+(?:d\d+)?)\s+(Bludgeoning|Piercing|Slashing)/);
  if (!dmgMatch) throw new Error(`EN weapon: cannot find damage in: ${joined}`);
  const name = joined.slice(0, dmgMatch.index!).trim();
  const after = joined.slice(dmgMatch.index! + dmgMatch[0].length).trim();
  const { lead, weightLb, cost } = splitEnSuffix(after);
  // Now lead = properties + mastery.
  // Mastery is one of the 8 tokens (allowing kerning splits "To p p le").
  // Find the LAST occurrence so we don't capture "Sap" that might be inside Properties text.
  let masteryToken: string | null = null;
  let masteryIdx = -1;
  let m: RegExpExecArray | null;
  const re = new RegExp(EN_MASTERY_TOKEN_RE.source, 'g');
  while ((m = re.exec(lead)) !== null) {
    const candidate = m[1];
    const norm = normalizeMasteryEn(candidate);
    if (norm) {
      masteryToken = candidate;
      masteryIdx = m.index;
    }
  }
  // Fallback: row may have "—" instead of mastery (e.g. Mace, Morningstar).
  // The "—" sits inside properties between the last property and the mastery slot.
  let propertiesRaw: string;
  let mastery: string | null;
  if (masteryToken && masteryIdx >= 0) {
    propertiesRaw = lead.slice(0, masteryIdx).trim();
    mastery = normalizeMasteryEn(masteryToken);
  } else {
    // No mastery — should not happen for weapons.
    propertiesRaw = lead.trim();
    mastery = null;
  }
  // Properties: split on commas, drop "—" placeholders.
  const properties = propertiesRaw
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '—' && p !== '-');
  return {
    name: name.replace(/\s+/g, ' ').replace(/(\w)\s(\w)/g, (_, a, b) => /[A-Z]/.test(a) ? a + b : a + ' ' + b),
    damage: { dice: dmgMatch[1], type: dmgMatch[2] },
    properties,
    mastery,
    weightLb,
    cost,
    category,
  };
}

function parseFrWeaponRow(joined: string, category: WeaponCategory): RawWeaponFr {
  const dmgMatch = joined.match(/(\d+(?:d\d+)?)\s+(contondants?|perforants?|tranchants?)/);
  if (!dmgMatch) throw new Error(`FR weapon: cannot find damage in: ${joined}`);
  const name = joined.slice(0, dmgMatch.index!).trim();
  const after = joined.slice(dmgMatch.index! + dmgMatch[0].length).trim();
  const { lead, weightLb, cost } = splitFrSuffix(after);
  let masteryToken: string | null = null;
  let masteryIdx = -1;
  let m: RegExpExecArray | null;
  const re = new RegExp(FR_MASTERY_TOKEN_RE.source, 'g');
  while ((m = re.exec(lead)) !== null) {
    const candidate = m[1];
    const norm = normalizeMasteryFr(candidate);
    if (norm) {
      masteryToken = candidate;
      masteryIdx = m.index;
    }
  }
  let propertiesRaw: string;
  let mastery: string | null;
  if (masteryToken && masteryIdx >= 0) {
    propertiesRaw = lead.slice(0, masteryIdx).trim();
    mastery = normalizeMasteryFr(masteryToken);
  } else {
    propertiesRaw = lead.trim();
    mastery = null;
  }
  const properties = propertiesRaw
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '—' && p !== '-');
  return {
    name: cleanFrSpaces(name),
    damage: { dice: dmgMatch[1], typeFr: dmgMatch[2] },
    properties,
    mastery,
    weightLb,
    cost,
    category,
  };
}

/** Some EN weapon names are kerning-split: "Tr ide nt" → "Trident", "To p p le" inside mastery handled separately. */
function cleanEnWeaponName(name: string): string {
  // Collapse single-space kerning inside word: "Tr ide nt" → "Trident", but preserve real word boundaries.
  // Heuristic: if we see a sequence with multiple single-letter or 2-letter tokens between word chars,
  // collapse them. Simpler: collapse all internal whitespace ONLY when the joined token (no space)
  // matches a known weapon name. Maintain a known list.
  const KNOWN_NAMES = new Set([
    'Trident','Topple','Tepple','Tent','Torch',
  ]);
  const collapsed = name.replace(/\s+/g, '');
  if (KNOWN_NAMES.has(collapsed)) return collapsed;
  // Otherwise normalize multi-spaces.
  return name.replace(/\s+/g, ' ').trim();
}
function cleanFrSpaces(name: string): string {
  // Same heuristic for FR ("Tr ide nt" appears in FR too).
  const KNOWN = new Set(['Trident','Tente','Torche']);
  const collapsed = name.replace(/\s+/g, '');
  if (KNOWN.has(collapsed)) return collapsed;
  return name.replace(/\s+/g, ' ').trim();
}

function parseWeaponsTable(en: Lines, fr: Lines): {
  enRows: RawWeaponEn[];
  frRows: RawWeaponFr[];
} {
  // EN bounds
  const enHeader = findIndex(en, (l) => l.trim() === 'Weapons');
  // We want the SECOND "Weapons" occurrence (header AND table) — the title is line "Weapons" then table starts after column-header lines.
  // Find end of table : next major section.
  const enArmorHeader = findIndex(en, (l) => l.trim() === 'Armor', enHeader);
  // Skip column headers (Name/Damage/Properties/Mastery/Weight/Cost).
  let enStart = enHeader + 1;
  while (enStart < enArmorHeader && /^(Name|Damage|Properties|Mastery|Weight|Cost)/.test(en.raw[enStart])) {
    enStart++;
  }
  // Actually the column header is like "NameDamagePropertiesMastery\nWeightCost". Skip until we see a section header "Simple Melee Weapons".
  enStart = findIndex(en, (l) => l.trim() === 'Simple Melee Weapons', enHeader);
  if (enStart < 0) throw new Error('EN: "Simple Melee Weapons" header not found');

  // FR bounds
  const frHeader = findIndex(fr, (l) => l.trim() === 'Armes');
  const frArmorHeader = findIndex(fr, (l) => l.trim() === 'Armures', frHeader);
  const frStart = findIndex(fr, (l) => l.trim() === 'Armes courantes de corps à corps', frHeader);
  if (frStart < 0) throw new Error('FR: "Armes courantes de corps à corps" header not found');

  const enRows: RawWeaponEn[] = [];
  const frRows: RawWeaponFr[] = [];

  let currentCat: WeaponCategory | null = null;
  // EN block walk
  for (let i = enStart; i < enArmorHeader; i++) {
    const trimmed = en.raw[i].trim();
    if (!trimmed) continue;
    if (EN_WEAPON_SECTION_HEADERS[trimmed]) {
      currentCat = EN_WEAPON_SECTION_HEADERS[trimmed];
      continue;
    }
    if (/^Document|^System Reference|^\d{1,3}$/.test(trimmed)) continue;
    // accumulate until line ends with cost
    let buf = trimmed;
    while (!EN_COST_RE.test(buf) && i + 1 < enArmorHeader) {
      i++;
      const next = en.raw[i].trim();
      if (!next) break;
      if (/^Document|^System Reference|^\d{1,3}$/.test(next)) continue;
      buf += ' ' + next;
    }
    if (!EN_COST_RE.test(buf)) continue;
    if (!currentCat) throw new Error(`EN weapons: row before any section header: ${buf}`);
    enRows.push(parseEnWeaponRow(buf, currentCat));
  }

  currentCat = null;
  for (let i = frStart; i < frArmorHeader; i++) {
    const trimmed = fr.raw[i].trim();
    if (!trimmed) continue;
    if (FR_WEAPON_SECTION_HEADERS[trimmed]) {
      currentCat = FR_WEAPON_SECTION_HEADERS[trimmed];
      continue;
    }
    if (/^Document|^System Reference|^\d{1,3}$/.test(trimmed)) continue;
    let buf = trimmed;
    while (!FR_COST_RE.test(buf) && i + 1 < frArmorHeader) {
      i++;
      const next = fr.raw[i].trim();
      if (!next) break;
      if (/^Document|^System Reference|^\d{1,3}$/.test(next)) continue;
      buf += ' ' + next;
    }
    if (!FR_COST_RE.test(buf)) continue;
    if (!currentCat) throw new Error(`FR weapons: row before any section header: ${buf}`);
    frRows.push(parseFrWeaponRow(buf, currentCat));
  }

  return { enRows, frRows };
}

// ─── Weapons matching FR↔EN ─────────────────────────────────────────────────

function weaponTupleKey(
  damageDice: string,
  damageTypeEn: string,
  masteryEn: string | null,
  cost: CostNum,
): string {
  return `${damageDice}|${damageTypeEn}|${masteryEn ?? '∅'}|${cost.qty}${cost.unit}`;
}

interface MatchedWeapon {
  en: RawWeaponEn;
  fr: RawWeaponFr;
  category: WeaponCategory;
}

function matchWeapons(en: RawWeaponEn[], fr: RawWeaponFr[]): MatchedWeapon[] {
  const matched: MatchedWeapon[] = [];
  // Bucket per-category to ensure tuple uniqueness within a category.
  const cats: WeaponCategory[] = [
    'simple-melee',
    'simple-ranged',
    'martial-melee',
    'martial-ranged',
  ];
  for (const cat of cats) {
    const enCat = en.filter((w) => w.category === cat);
    const frCat = fr.filter((w) => w.category === cat);
    if (enCat.length !== frCat.length) {
      throw new Error(
        `Weapons category ${cat}: EN has ${enCat.length} rows, FR has ${frCat.length}. Aborting.`,
      );
    }
    const enByKey = new Map<string, RawWeaponEn>();
    for (const w of enCat) {
      const key = weaponTupleKey(w.damage.dice, w.damage.type, w.mastery, w.cost!);
      if (enByKey.has(key)) {
        throw new Error(`EN weapons collision in ${cat}: tuple ${key} matches multiple rows.`);
      }
      enByKey.set(key, w);
    }
    for (const fw of frCat) {
      // canonicalize FR damage type (strip plural 's' → singular → EN)
      const dmgTypeEn = canonicalizeFrDamageType(fw.damage.typeFr);
      const masteryFrToken = fw.mastery;
      const masteryEn = masteryFrToken ? MASTERY_FR_EN[masteryFrToken] ?? null : null;
      const key = weaponTupleKey(fw.damage.dice, dmgTypeEn, masteryEn, fw.cost!);
      const enMatch = enByKey.get(key);
      if (!enMatch) {
        throw new Error(
          `FR weapon "${fw.name}" (${cat}, key=${key}) has no EN match. Aborting.`,
        );
      }
      enByKey.delete(key);
      matched.push({ en: enMatch, fr: fw, category: cat });
    }
    if (enByKey.size > 0) {
      const orphans = [...enByKey.values()].map((w) => w.name).join(', ');
      throw new Error(`EN weapons orphan in ${cat}: no FR match for ${orphans}`);
    }
  }
  return matched;
}

function canonicalizeFrDamageType(fr: string): string {
  // Plural form first.
  if (DAMAGE_TYPE_FR_EN[fr]) return DAMAGE_TYPE_FR_EN[fr];
  // Then singular (sarbacane/blowgun "1 perforant").
  if (DAMAGE_TYPE_SINGULAR_FR_EN[fr]) return DAMAGE_TYPE_SINGULAR_FR_EN[fr];
  throw new Error(`Unknown FR damage type: "${fr}"`);
}

// ─── Build Item entities from matched weapons ──────────────────────────────

function buildWeaponItem(m: MatchedWeapon): Item {
  const { en, fr, category } = m;
  const id = slugify(en.name);
  const properties: string[] = [category];
  // Add canonical EN property names (Light, Heavy, Finesse, etc.) — extracted from EN rowProperties.
  for (const p of en.properties) {
    // Strip parenthetical like "(Range 20/60)" → keep base name.
    const base = p.replace(/\s*\(.*\)\s*/, '').trim();
    if (WEAPON_PROPERTY_EN_FR[base]) properties.push(base);
    else if (base) properties.push(base); // keep verbatim; useful for "Versatile (1d8)" → "Versatile"
  }
  // Range from EN properties parenthetical.
  let range: { normal: number; max: number } | undefined;
  for (const p of en.properties) {
    const r = p.match(/Range\s+(\d+)\/(\d+)/);
    if (r) {
      range = { normal: Number(r[1]), max: Number(r[2]) };
      break;
    }
  }
  const damageTypeEn = en.damage.type; // canonical EN
  const damageTypeFrPlural = DAMAGE_TYPE_EN_FR[damageTypeEn];
  // Build damage label (e.g. "Bludgeoning" / "Contondants")
  return {
    id,
    name: { fr: cleanFrSpaces(fr.name), en: cleanEnWeaponName(en.name) },
    category: 'weapon',
    cost: { qty: en.cost!.qty, unit: en.cost!.unit },
    weight: en.weightLb ?? 0,
    description: null,
    damage: {
      dice: en.damage.dice,
      type: damageTypeEn.toLowerCase(),
      typeLabel: { fr: damageTypeFrPlural, en: damageTypeEn },
    },
    properties: [...new Set(properties)],
    range,
    source: SOURCE,
  };
}

// ─── Armor parsing ──────────────────────────────────────────────────────────

interface RawArmorEn {
  name: string;
  acFormula: string; // "11 + Dex modifier", "11 + Dex modifier (max 2)", "16", "+2"
  strength: number | null;
  stealthDisadvantage: boolean;
  weightLb: number | null;
  cost: CostNum | null;
  tier: 'light' | 'medium' | 'heavy' | 'shield';
}
interface RawArmorFr {
  name: string;
  acFormula: string;
  strength: number | null;
  stealthDisadvantage: boolean;
  weightLb: number | null;
  cost: CostNum | null;
  tier: 'light' | 'medium' | 'heavy' | 'shield';
}

const EN_ARMOR_HEADERS: Record<string, RawArmorEn['tier']> = {
  'Light Armor (1 Minute to Don or Doff )': 'light',
  'Light Armor (1 Minute to Don or Doff)': 'light',
  'Medium Armor (5 Minutes to Don and 1 Minute to Doff )': 'medium',
  'Medium Armor (5 Minutes to Don and 1 Minute to Doff)': 'medium',
  'Heavy Armor (10 Minutes to Don and 5 Minutes to Doff )': 'heavy',
  'Heavy Armor (10 Minutes to Don and 5 Minutes to Doff)': 'heavy',
  'Shield (Utilize Action to Don or Doff )': 'shield',
  'Shield (Utilize Action to Don or Doff)': 'shield',
};
const FR_ARMOR_HEADERS: Record<string, RawArmorFr['tier']> = {
  "Armures légères (s’enfile ou se retire en 1 minute)": 'light',
  "Armures intermédiaires (s’enfile en 5 minutes, se retire en 1 minute)": 'medium',
  "Armures lourdes (s’enfile en 10 minutes, se retire en 5 minutes)": 'heavy',
  "Bouclier (s’enfile ou se retire au prix de l’action Utilisation)": 'shield',
};

function parseEnArmorRow(joined: string, tier: RawArmorEn['tier']): RawArmorEn {
  // "Padded Armor11 + Dex modifier—Disadvantage8 lb.5 GP"
  // Cost / Weight at the end.
  const { lead, weightLb, cost } = splitEnSuffix(joined);
  if (!cost) throw new Error(`EN armor: no cost in row: ${joined}`);
  // Stealth: ends with "Disadvantage" or "—" or nothing.
  let stealthDisadvantage = false;
  let mid = lead;
  if (/Disadvantage\s*$/.test(mid)) {
    stealthDisadvantage = true;
    mid = mid.replace(/Disadvantage\s*$/, '').trimEnd();
  } else if (/—\s*$/.test(mid)) {
    mid = mid.replace(/—\s*$/, '').trimEnd();
  }
  // Strength: "Str 13" / "Str 15" / "—" / nothing.
  let strength: number | null = null;
  const strMatch = mid.match(/Str\s*(\d+)\s*$/);
  if (strMatch) {
    strength = Number(strMatch[1]);
    mid = mid.slice(0, strMatch.index).trimEnd();
  } else if (/—\s*$/.test(mid)) {
    mid = mid.replace(/—\s*$/, '').trimEnd();
  }
  // What remains: "<name><AC formula>" — find AC formula.
  let acFormula = '';
  let name = '';
  // Patterns:
  //   "Padded Armor11 + Dex modifier"
  //   "Hide Armor12 + Dex modifier (max 2)"
  //   "Chain Mail16"
  //   "Shield+2"
  let acRe = /(\d+\s*\+\s*Dex modifier(?:\s*\(max\s*\d+\))?)\s*$/;
  let m = mid.match(acRe);
  if (m) {
    acFormula = m[1];
    name = mid.slice(0, m.index).trim();
  } else {
    const flat = mid.match(/(\d+|\+\d+)\s*$/);
    if (!flat) throw new Error(`EN armor: cannot parse AC in: ${mid}`);
    acFormula = flat[1];
    name = mid.slice(0, flat.index).trim();
  }
  return {
    name,
    acFormula,
    strength,
    stealthDisadvantage,
    weightLb,
    cost,
    tier,
  };
}
function parseFrArmorRow(joined: string, tier: RawArmorFr['tier']): RawArmorFr {
  const { lead, weightLb, cost } = splitFrSuffix(joined);
  if (!cost) throw new Error(`FR armor: no cost in row: ${joined}`);
  let stealthDisadvantage = false;
  let mid = lead;
  if (/Désavantage\s*$/.test(mid)) {
    stealthDisadvantage = true;
    mid = mid.replace(/Désavantage\s*$/, '').trimEnd();
  } else if (/—\s*$/.test(mid)) {
    mid = mid.replace(/—\s*$/, '').trimEnd();
  }
  let strength: number | null = null;
  const strMatch = mid.match(/For\s*(\d+)\s*$/);
  if (strMatch) {
    strength = Number(strMatch[1]);
    mid = mid.slice(0, strMatch.index).trimEnd();
  } else if (/—\s*$/.test(mid)) {
    mid = mid.replace(/—\s*$/, '').trimEnd();
  }
  let acFormula = '';
  let name = '';
  const acRe = /(\d+\s*\+\s*modificateur de Dex(?:\s*\(max\s*\d+\))?)\s*$/;
  const m = mid.match(acRe);
  if (m) {
    acFormula = m[1];
    name = mid.slice(0, m.index).trim();
  } else {
    const flat = mid.match(/(\d+|\+\d+)\s*$/);
    if (!flat) throw new Error(`FR armor: cannot parse AC in: ${mid}`);
    acFormula = flat[1];
    name = mid.slice(0, flat.index).trim();
  }
  return {
    name,
    acFormula,
    strength,
    stealthDisadvantage,
    weightLb,
    cost,
    tier,
  };
}

function parseArmorTable(en: Lines, fr: Lines): { enRows: RawArmorEn[]; frRows: RawArmorFr[] } {
  // EN bounds — find SECOND "Armor" occurrence (table title), then "To o l s" / "Tools" header.
  const enFirstArmor = findIndex(en, (l) => l.trim() === 'Armor');
  const enToolsHeader = findIndex(en, (l) => /^To\s*o\s*l\s*s$/.test(l.trim()), enFirstArmor);
  if (enToolsHeader < 0) throw new Error('EN: Tools header not found after Armor');
  // Find the FIRST armor section (Light Armor (1 Minute to Don or Doff))
  let enStart = -1;
  for (let i = enFirstArmor; i < enToolsHeader; i++) {
    if (EN_ARMOR_HEADERS[en.raw[i].trim()]) {
      enStart = i;
      break;
    }
  }
  if (enStart < 0) throw new Error('EN: First armor section header not found');

  const frFirstArmor = findIndex(fr, (l) => l.trim() === 'Armures');
  const frToolsHeader = findIndex(fr, (l) => l.trim() === 'Outils', frFirstArmor);
  if (frToolsHeader < 0) throw new Error('FR: Outils header not found after Armures');
  let frStart = -1;
  for (let i = frFirstArmor; i < frToolsHeader; i++) {
    if (FR_ARMOR_HEADERS[fr.raw[i].trim()]) {
      frStart = i;
      break;
    }
  }
  if (frStart < 0) throw new Error('FR: First armor section header not found');

  const enRows: RawArmorEn[] = [];
  const frRows: RawArmorFr[] = [];
  let cur: RawArmorEn['tier'] | null = null;
  for (let i = enStart; i < enToolsHeader; i++) {
    const trimmed = en.raw[i].trim();
    if (!trimmed) continue;
    if (EN_ARMOR_HEADERS[trimmed]) {
      cur = EN_ARMOR_HEADERS[trimmed];
      continue;
    }
    if (/^Document|^System Reference|^\d{1,3}$/.test(trimmed)) continue;
    let buf = trimmed;
    while (!EN_COST_RE.test(buf) && i + 1 < enToolsHeader) {
      i++;
      const next = en.raw[i].trim();
      if (!next) break;
      if (/^Document|^System Reference|^\d{1,3}$/.test(next)) continue;
      buf += ' ' + next;
    }
    if (!EN_COST_RE.test(buf)) continue;
    if (!cur) throw new Error(`EN armor: row before tier header: ${buf}`);
    enRows.push(parseEnArmorRow(buf, cur));
  }
  cur = null;
  for (let i = frStart; i < frToolsHeader; i++) {
    const trimmed = fr.raw[i].trim();
    if (!trimmed) continue;
    if (FR_ARMOR_HEADERS[trimmed]) {
      cur = FR_ARMOR_HEADERS[trimmed];
      continue;
    }
    if (/^Document|^System Reference|^\d{1,3}$/.test(trimmed)) continue;
    let buf = trimmed;
    while (!FR_COST_RE.test(buf) && i + 1 < frToolsHeader) {
      i++;
      const next = fr.raw[i].trim();
      if (!next) break;
      if (/^Document|^System Reference|^\d{1,3}$/.test(next)) continue;
      buf += ' ' + next;
    }
    if (!FR_COST_RE.test(buf)) continue;
    if (!cur) throw new Error(`FR armor: row before tier header: ${buf}`);
    frRows.push(parseFrArmorRow(buf, cur));
  }
  return { enRows, frRows };
}

function armorTupleKey(r: RawArmorEn | RawArmorFr): string {
  // Canonical AC formula : strip whitespace, normalize "modificateur de Dex" → "Dex modifier"
  let ac = r.acFormula
    .replace(/\s+/g, '')
    .replace(/modificateurdeDex/i, 'Dex modifier')
    .replace(/Dexmodifier/i, 'Dex modifier');
  // Now ac is e.g. "11+Dex modifier" or "16" or "+2".
  return `${r.tier}|${ac}|${r.strength ?? '∅'}|${r.stealthDisadvantage}|${r.cost!.qty}${r.cost!.unit}`;
}

interface MatchedArmor {
  en: RawArmorEn;
  fr: RawArmorFr;
}

function matchArmor(en: RawArmorEn[], fr: RawArmorFr[]): MatchedArmor[] {
  if (en.length !== fr.length) {
    throw new Error(`Armor counts differ: EN ${en.length} vs FR ${fr.length}`);
  }
  const matched: MatchedArmor[] = [];
  const enByKey = new Map<string, RawArmorEn>();
  for (const a of en) {
    const k = armorTupleKey(a);
    if (enByKey.has(k)) throw new Error(`EN armor collision: ${k}`);
    enByKey.set(k, a);
  }
  for (const fa of fr) {
    const k = armorTupleKey(fa);
    const ea = enByKey.get(k);
    if (!ea) throw new Error(`FR armor "${fa.name}" no EN match for tuple ${k}`);
    enByKey.delete(k);
    matched.push({ en: ea, fr: fa });
  }
  if (enByKey.size > 0) {
    throw new Error(`EN armor orphans: ${[...enByKey.values()].map((a) => a.name).join(', ')}`);
  }
  return matched;
}

function buildArmorItem(m: MatchedArmor): Item {
  const { en, fr } = m;
  const id = slugify(en.name);
  // Parse AC base + dex max from the formula.
  let acBase: number | undefined;
  let acDexMax: number | null | undefined;
  if (en.tier === 'shield') {
    // "+2" formula
    acBase = 2; // shield bonus
    acDexMax = undefined;
  } else {
    const m2 = en.acFormula.match(/(\d+)(?:\s*\+\s*Dex modifier(?:\s*\(max\s*(\d+)\))?)?/);
    if (m2) {
      acBase = Number(m2[1]);
      if (en.acFormula.includes('Dex modifier')) {
        acDexMax = m2[2] ? Number(m2[2]) : null; // null = no cap
      } else {
        acDexMax = 0; // no Dex bonus (heavy armor)
      }
    }
  }
  return {
    id,
    name: { fr: fr.name, en: en.name },
    category: en.tier === 'shield' ? 'shield' : 'armor',
    cost: { qty: en.cost!.qty, unit: en.cost!.unit },
    weight: en.weightLb ?? 0,
    description: null,
    properties: [`${en.tier}-armor`],
    acBase,
    acDexMax,
    strRequired: en.strength ?? undefined,
    stealthDisadvantage: en.stealthDisadvantage,
    source: SOURCE,
  };
}

// ─── Adventuring Gear / Ammunition / Focuses parsing ────────────────────────

interface RawGearRow {
  name: string;
  weightLb: number | null;
  cost: CostNum | null;
  varies: boolean; // both weight and cost are "Varies"
}

function parseGearTable(
  lines: Lines,
  fromIdx: number,
  endIdx: number,
  costRe: RegExp,
  weightLabelRe: RegExp,
  variesWord: RegExp,
): RawGearRow[] {
  // Walk lines, accumulate one row at a time. A row ends when we see a cost,
  // OR when we see the special "VariesVaries" / "VariableVariable" string.
  const rows: RawGearRow[] = [];
  let buf: string[] = [];
  for (let i = fromIdx; i < endIdx; i++) {
    const trimmed = lines.raw[i].trim();
    if (!trimmed) {
      if (buf.length) {
        const joined = buf.join(' ');
        const row = parseSingleGearRow(joined, costRe, weightLabelRe, variesWord);
        if (row) rows.push(row);
        buf = [];
      }
      continue;
    }
    if (/^Document|^System Reference|^\d{1,3}$/.test(trimmed)) continue;
    // Column / table headers — skip standalone or concatenated forms.
    if (/^(Item|Objet|Weight|Poids|Cost|Prix|Focus|Focaliseur|Symbol|Symbole)\s*$/.test(trimmed)) continue;
    if (/^(Item\s*Weight\s*Cost|Objet\s*Poids\s*Prix|WeightCost|PoidsPrix|FocusWeightCost|FocaliseurPoidsPrix|SymbolWeightCost|SymbolePoidsPrix)$/i.test(trimmed)) continue;
    // Table title repeated on next page (e.g. "Adventuring Gear" appearing again mid-table).
    if (/^(Adventuring Gear|Matériel d’aventurier|Matériel d'aventurier|Ammunition|Munitions|Arcane Focuses|Focaliseurs arcaniques|Druidic Focuses|Focaliseurs druidiques|Holy Symbols|Symboles sacrés)$/.test(trimmed)) continue;
    buf.push(trimmed);
    const joined = buf.join(' ');
    if (costRe.test(joined) || variesWord.test(joined)) {
      const row = parseSingleGearRow(joined, costRe, weightLabelRe, variesWord);
      if (row) rows.push(row);
      buf = [];
    }
  }
  if (buf.length) {
    const joined = buf.join(' ');
    const row = parseSingleGearRow(joined, costRe, weightLabelRe, variesWord);
    if (row) rows.push(row);
  }
  return rows;
}

function normalizeKerning(s: string): string {
  // Fix kerning splits in unit suffixes : "21 k g" → "21 kg", "5 l b ." → "5 lb.",
  // and known kerned word-fragments. Note : we cannot use \b after the last letter
  // because it's followed by a digit (e.g. "Tente10") — both are word chars,
  // so \b fails. We use lookaheads for digit / whitespace / end.
  return s
    .replace(/(\d)\s+k\s+g(?=\d|\s|$)/g, '$1 kg')
    .replace(/(\d)\s+l\s+b\s*\.\s*/g, '$1 lb. ')
    .replace(/\bTo\s*p\s*p\s*le(?=\d|\s|$)/g, 'Topple')
    .replace(/\bTr\s*ide\s*nt(?=\d|\s|$)/g, 'Trident')
    .replace(/\bTe\s*nt\s*e(?=\d|\s|$)/g, 'Tente')
    .replace(/\bTe\s*nt(?=\d|\s|$)/g, 'Tent')
    .replace(/\bTorc\s*he(?=\d|\s|$)/g, 'Torche')
    .replace(/\bTorc\s*h(?=\d|\s|$)/g, 'Torch')
    .replace(/\bYew\s*w\s*and(?=\d|\s|$)/g, 'Yew wand')
    .replace(/\bBaguette\s*d['’]\s*if(?=\d|\s|$)/g, "Baguette d’if")
    .replace(/\(1\s+er\s+niveau\)/g, '(1er niveau)')
    // "Outre2,5 kg (pleine)2 pa" — strip "(pleine)"/"(full)" so weight regex matches.
    .replace(/\s*\(pleine\)\s*/gi, ' ')
    .replace(/\s*\(full\)\s*/gi, ' ');
}

function parseSingleGearRow(
  joined: string,
  costRe: RegExp,
  weightLabelRe: RegExp,
  variesWord: RegExp,
): RawGearRow | null {
  joined = normalizeKerning(joined);
  // 1) Varies / Variable case : both weight and cost are "Varies" / "Variable"
  if (variesWord.test(joined) && /Varies\s*Varies|Variable\s*Variable/i.test(joined)) {
    const name = joined.replace(/(Varies\s*Varies|Variable\s*Variable).*$/i, '').trim();
    if (!name) return null;
    return { name, weightLb: null, cost: null, varies: true };
  }
  // 2) Varies amount only (e.g. "AmmunitionVariesVaries")
  const varVar = joined.match(/^(.+?)Varies\s*Varies\s*$/);
  if (varVar) {
    return { name: varVar[1].trim(), weightLb: null, cost: null, varies: true };
  }
  const varVarFr = joined.match(/^(.+?)Variable\s*Variable\s*$/);
  if (varVarFr) {
    return { name: varVarFr[1].trim(), weightLb: null, cost: null, varies: true };
  }
  // 3) Standard row: NAME + WEIGHT + COST
  const cost = costRe === EN_COST_RE ? parseEnCost(joined) : parseFrCost(joined);
  if (!cost) return null;
  const costMatch = joined.match(costRe)!;
  let beforeCost = joined.slice(0, costMatch.index!).trimEnd();
  // Weight: capture trailing weight like "5 lb." / "1/2 lb." / "—" / "0,5 kg"
  let weightLb: number | null = null;
  // Try standard
  if (/lb\./.test(beforeCost)) {
    const wMatch = beforeCost.match(/(?:\d+(?:[.,]\d+)?\s*[½¼¾]?\s*lb\.|[½¼¾]\s*lb\.|\d+\/\d+\s*lb\.)\s*$/);
    if (wMatch) {
      weightLb = parseEnWeightLb(wMatch[0]);
      beforeCost = beforeCost.slice(0, wMatch.index!).trimEnd();
    }
  } else if (/\b(g|kg)\b/.test(beforeCost)) {
    const wMatch = beforeCost.match(/(\d+(?:[.,]\d+)?\s*(g|kg))\s*$/);
    if (wMatch) {
      weightLb = parseFrWeightLb(wMatch[0]);
      beforeCost = beforeCost.slice(0, wMatch.index!).trimEnd();
    }
  }
  // "—" weight
  if (weightLb === null && /—\s*$/.test(beforeCost)) {
    beforeCost = beforeCost.replace(/—\s*$/, '').trimEnd();
  }
  // Special "(full)" annotation on Waterskin: "5 lb. (full)" — handle by stripping "(full)" before the weight regex
  // Already handled because "(full)" comes BEFORE the cost in the raw text (see SRD line 8981: "Waterskin5 lb. (full)2 SP")
  // Our parser may miss the weight there. Let's special-case: try matching "(full)" then re-extract.
  // Actually our regex matched "5 lb." correctly (ignored " (full)").
  return { name: beforeCost.trim(), weightLb, cost, varies: false };
}

interface MatchedGear {
  id: string;
  enName: string;
  frName: string;
  enRow: RawGearRow;
  frRow: RawGearRow;
}

function matchGear(
  enRows: RawGearRow[],
  frRows: RawGearRow[],
  map: readonly GearMapEntry[],
  context: string,
): MatchedGear[] {
  // Build lookup tables (normalize names + aliases on both sides).
  const enByName = new Map<string, RawGearRow>();
  const frByName = new Map<string, RawGearRow>();
  for (const r of enRows) enByName.set(normalizeLabel(r.name), r);
  for (const r of frRows) frByName.set(normalizeLabel(r.name), r);
  const matched: MatchedGear[] = [];
  const seenEn = new Set<string>();
  const seenFr = new Set<string>();
  for (const m of map) {
    const enKeys = [m.en, ...(m.enAliases ?? [])].map(normalizeLabel);
    const frKeys = [m.fr, ...(m.frAliases ?? [])].map(normalizeLabel);
    let enRow: RawGearRow | undefined;
    let frRow: RawGearRow | undefined;
    let usedEnKey: string | undefined;
    let usedFrKey: string | undefined;
    for (const k of enKeys) {
      const r = enByName.get(k);
      if (r) {
        enRow = r;
        usedEnKey = k;
        break;
      }
    }
    for (const k of frKeys) {
      const r = frByName.get(k);
      if (r) {
        frRow = r;
        usedFrKey = k;
        break;
      }
    }
    if (!enRow) {
      throw new Error(`${context}: EN entry "${m.en}" (id=${m.id}) not found in PDF.`);
    }
    if (!frRow) {
      throw new Error(`${context}: FR entry "${m.fr}" (id=${m.id}) not found in PDF.`);
    }
    seenEn.add(usedEnKey!);
    seenFr.add(usedFrKey!);
    matched.push({ id: m.id, enName: m.en, frName: m.fr, enRow, frRow });
  }
  // Audit unmatched rows.
  const unmatchedEn = [...enByName.keys()].filter((k) => !seenEn.has(k));
  const unmatchedFr = [...frByName.keys()].filter((k) => !seenFr.has(k));
  if (unmatchedEn.length || unmatchedFr.length) {
    throw new Error(
      `${context}: unmapped rows in PDF.\n  EN unmapped: ${unmatchedEn.join(' | ')}\n  FR unmapped: ${unmatchedFr.join(' | ')}`,
    );
  }
  return matched;
}

function buildGearItem(m: MatchedGear, category: 'gear' | 'pack'): Item {
  // Cost / weight come from EN row primarily (canonical), fallback to FR.
  const cost = m.enRow.cost ?? m.frRow.cost ?? null;
  const weightLb = m.enRow.weightLb ?? m.frRow.weightLb ?? 0;
  return {
    id: m.id,
    name: { fr: m.frName.replace(/['']/g, "'"), en: m.enName.replace(/['']/g, "'") },
    category,
    cost: cost ? { qty: cost.qty, unit: cost.unit } : null,
    weight: weightLb ?? 0,
    description: null,
    properties: m.enRow.varies ? ['varies'] : [],
    source: SOURCE,
  };
}

// ─── Tools parsing ──────────────────────────────────────────────────────────

interface RawToolEn {
  name: string;
  cost: CostNum | null;
  weightLb: number | null;
  ability: string | null;
  varies: boolean;
}
interface RawToolFr {
  name: string;
  cost: CostNum | null;
  weightLb: number | null;
  ability: string | null;
  varies: boolean;
}

const EN_TOOL_HEADER_RE = /^([A-Z][\w’' ()-]+?)\s*\((\d+)\s*GP\)$/;
const EN_TOOL_VARIES_RE = /^([A-Z][\w’' ()-]+?)\s*\(Varies\)$/;
const FR_TOOL_HEADER_RE = /^([A-ZÀÂÉÈÊÎÔÛÇ][\w’'\s()-àâäéèêëîïôùûüç-]+?)\s*\((\d+)\s*po\)$/;
const FR_TOOL_VARIES_RE = /^([A-ZÀÂÉÈÊÎÔÛÇ][\w’'\s()-àâäéèêëîïôùûüç-]+?)\s*\(variable\)$/;

function parseToolsSection(
  lines: Lines,
  fromIdx: number,
  endIdx: number,
  lang: 'en' | 'fr',
): (RawToolEn | RawToolFr)[] {
  const out: (RawToolEn | RawToolFr)[] = [];
  const headerRe = lang === 'en' ? EN_TOOL_HEADER_RE : FR_TOOL_HEADER_RE;
  const variesRe = lang === 'en' ? EN_TOOL_VARIES_RE : FR_TOOL_VARIES_RE;
  const weightLabel = lang === 'en' ? /Weight\s*:\s*([^A-Za-z]*?)(\d+(?:[.,]\d+)?\s*lb\.|—|Varies)/ : /Poids\s*:\s*(\d+(?:[.,]\d+)?\s*(?:g|kg)|—|variable)/;
  const abilityLabel = lang === 'en' ? /Ability\s*:\s*(\w+)/ : /Caractéristique\s*:\s*(\w+)/;
  let i = fromIdx;
  while (i < endIdx) {
    const ln = lines.raw[i].trim();
    let m = ln.match(headerRe);
    let name: string | null = null;
    let costQty: number | null = null;
    let varies = false;
    if (m) {
      name = m[1].trim();
      costQty = Number(m[2]);
    } else {
      m = ln.match(variesRe);
      if (m) {
        name = m[1].trim();
        varies = true;
      }
    }
    if (!name) {
      i++;
      continue;
    }
    // Read the next ~3 lines for Ability + Weight.
    let ability: string | null = null;
    let weightLb: number | null = null;
    for (let j = i + 1; j < Math.min(i + 6, endIdx); j++) {
      const lj = lines.raw[j];
      const am = lj.match(abilityLabel);
      if (am && !ability) ability = am[1];
      const wm = lj.match(weightLabel);
      if (wm) {
        const wv = wm[wm.length - 1] || wm[1];
        if (lang === 'en') weightLb = parseEnWeightLb(wv);
        else weightLb = parseFrWeightLb(wv);
      }
    }
    const cost: CostNum | null = costQty !== null
      ? { qty: costQty, unit: lang === 'en' ? 'gp' : 'gp' }
      : null;
    if (lang === 'en') {
      out.push({ name, cost, weightLb, ability, varies } as RawToolEn);
    } else {
      out.push({ name, cost, weightLb, ability, varies } as RawToolFr);
    }
    i++;
  }
  return out;
}

function buildToolItem(m: MatchedGear): Item {
  // Same shape as gear, but category='tool'.
  const item = buildGearItem(m, 'gear');
  return { ...item, category: 'tool' };
}

// ─── Pack content prose (for documentation only, not items.json) ───────────

// We list the 6 packs in PACK_IDS so the build script can mark them with category='pack'.
const PACK_IDS = new Set([
  'burglars-pack',
  'diplomats-pack',
  'dungeoneers-pack',
  'entertainers-pack',
  'explorers-pack',
  'priests-pack',
  'scholars-pack',
]);

// ─── Main entry — parse + write items.json + return everything for re-use ──

export interface EquipmentParseResult {
  items: Item[];
  /** Map id → label, useful for class/background re-mapping. */
  byId: Map<string, Item>;
}

export async function parseEquipment(): Promise<EquipmentParseResult> {
  console.log('  → loading EN/FR raw text');
  const en = loadLines(await readFile(EN_FILE, 'utf8'));
  const fr = loadLines(await readFile(FR_FILE, 'utf8'));

  console.log('  → parsing weapons (table)');
  const weapons = parseWeaponsTable(en, fr);
  console.log(`     EN: ${weapons.enRows.length} rows, FR: ${weapons.frRows.length} rows`);
  const matchedWeapons = matchWeapons(weapons.enRows, weapons.frRows);
  console.log(`     matched: ${matchedWeapons.length} weapons`);

  console.log('  → parsing armor (table)');
  const armor = parseArmorTable(en, fr);
  console.log(`     EN: ${armor.enRows.length} rows, FR: ${armor.frRows.length} rows`);
  const matchedArmor = matchArmor(armor.enRows, armor.frRows);
  console.log(`     matched: ${matchedArmor.length} armor entries`);

  console.log('  → parsing adventuring gear (table)');
  // EN: find SECOND occurrence of "Adventuring Gear" (table title) — the FIRST one is the prose section header.
  const enGearProseIdx = findIndex(en, (l) => l.trim() === 'Adventuring Gear');
  const enGearTitleIdx = findIndex(en, (l) => l.trim() === 'Adventuring Gear', enGearProseIdx + 1);
  // Table data starts a few lines after the title (skip "Item" + "WeightCost" headers).
  const enGearStart = enGearTitleIdx + 1;
  // Table ends at the next "Ammunition" table title.
  const enGearEnd = findIndex(en, (l) => l.trim() === 'Ammunition', enGearTitleIdx + 1);
  // FR: same logic — find SECOND occurrence of "Matériel d'aventurier".
  const frGearProseIdx = findIndex(fr, (l) => l.trim() === "Matériel d’aventurier");
  const frGearTitleIdx = findIndex(fr, (l) => l.trim() === "Matériel d’aventurier", frGearProseIdx + 1);
  const frGearStart = frGearTitleIdx + 1;
  // FR : the prose section after the table starts with parenthesized cost entries
  // like "Billes (1 po)". The first such pattern marks end of table.
  const frProseRe = /^\S.*\(\d+\s*p[caeop]\)\s*$/;
  const frGearEnd = findIndex(fr, (l) => frProseRe.test(l.trim()), frGearTitleIdx + 1);
  if (enGearStart <= 0 || enGearEnd <= 0) throw new Error(`EN gear bounds not found (prose=${enGearProseIdx}, title=${enGearTitleIdx}, end=${enGearEnd})`);
  if (frGearStart <= 0 || frGearEnd <= 0) throw new Error(`FR gear bounds not found (prose=${frGearProseIdx}, title=${frGearTitleIdx}, end=${frGearEnd})`);
  const enGearRows = parseGearTable(en, enGearStart, enGearEnd, EN_COST_RE, /lb\./, /Varies/);
  const frGearRows = parseGearTable(fr, frGearStart, frGearEnd, FR_COST_RE, /(g|kg)\b/, /Variable/i);
  console.log(`     EN: ${enGearRows.length} gear rows, FR: ${frGearRows.length} gear rows`);
  if (process.env.DEBUG_GEAR) {
    console.log(`--- EN gear (${enGearRows.length}) ---`);
    for (const r of enGearRows) console.log(`  | "${r.name}" | wt=${r.weightLb} | cost=${r.cost?.qty}${r.cost?.unit ?? ''} | varies=${r.varies}`);
    console.log(`--- FR gear (${frGearRows.length}) ---`);
    for (const r of frGearRows) console.log(`  | "${r.name}" | wt=${r.weightLb} | cost=${r.cost?.qty}${r.cost?.unit ?? ''} | varies=${r.varies}`);
  }
  const matchedGear = matchGear(enGearRows, frGearRows, GEAR_TABLE_MAP, 'Adventuring Gear');
  console.log(`     matched: ${matchedGear.length} gear entries`);

  console.log('  → parsing ammunition variants table');
  // EN ammo table: starts at a line "Ammunition" (the table title), then column headers, then 5 rows.
  // Find SECOND "Ammunition" occurrence (after gear).
  const enAmmoTitleIdx = findIndex(en, (l) => l.trim() === 'Ammunition', enGearEnd);
  const enAmmoTableStart = enAmmoTitleIdx + 1;
  // Find next blank or section header (e.g. Antitoxin description starts).
  let enAmmoEnd = findIndex(en, (l) => /^Antitoxin/.test(l.trim()), enAmmoTableStart);
  if (enAmmoEnd < 0) enAmmoEnd = enAmmoTableStart + 12;
  const frAmmoTitleIdx = findIndex(fr, (l) => l.trim() === 'Munitions', frGearEnd);
  const frAmmoTableStart = frAmmoTitleIdx + 1;
  let frAmmoEnd = findIndex(fr, (l) => /^Outre/.test(l.trim()), frAmmoTableStart);
  if (frAmmoEnd < 0) frAmmoEnd = frAmmoTableStart + 14;
  const enAmmoRows = parseAmmunitionRows(en, enAmmoTableStart, enAmmoEnd, 'en');
  const frAmmoRows = parseAmmunitionRows(fr, frAmmoTableStart, frAmmoEnd, 'fr');
  console.log(`     EN: ${enAmmoRows.length} ammo rows, FR: ${frAmmoRows.length} ammo rows`);
  if (process.env.DEBUG_GEAR) {
    for (const r of enAmmoRows) console.log(`  EN-AMMO  | "${r.name}" | wt=${r.weightLb} | cost=${r.cost?.qty}${r.cost?.unit ?? ''}`);
    for (const r of frAmmoRows) console.log(`  FR-AMMO  | "${r.name}" | wt=${r.weightLb} | cost=${r.cost?.qty}${r.cost?.unit ?? ''}`);
  }
  const matchedAmmo = matchGear(enAmmoRows, frAmmoRows, AMMUNITION_VARIANTS_MAP, 'Ammunition variants');

  console.log('  → parsing arcane focus variants');
  const enArcaneStart = findIndex(en, (l) => l.trim() === 'Arcane Focuses');
  const enArcaneEnd = enArcaneStart + 14;
  const frArcaneStart = findIndex(fr, (l) => l.trim() === 'Focaliseurs arcaniques');
  const frArcaneEnd = frArcaneStart + 14;
  const enArcaneRows = parseGearTable(en, enArcaneStart + 1, enArcaneEnd, EN_COST_RE, /lb\./, /Varies/);
  const frArcaneRows = parseGearTable(fr, frArcaneStart + 1, frArcaneEnd, FR_COST_RE, /(g|kg)\b/, /Variable/i);
  if (process.env.DEBUG_GEAR) {
    for (const r of enArcaneRows) console.log(`  EN-ARCANE | "${r.name}" | wt=${r.weightLb} | cost=${r.cost?.qty}${r.cost?.unit ?? ''}`);
    for (const r of frArcaneRows) console.log(`  FR-ARCANE | "${r.name}" | wt=${r.weightLb} | cost=${r.cost?.qty}${r.cost?.unit ?? ''}`);
  }
  const matchedArcane = matchGear(enArcaneRows, frArcaneRows, ARCANE_FOCUS_VARIANTS_MAP, 'Arcane Focuses');

  console.log('  → parsing druidic focus variants');
  const enDruidicStart = findIndex(en, (l) => l.trim() === 'Druidic Focuses');
  const enDruidicEnd = enDruidicStart + 12;
  const frDruidicStart = findIndex(fr, (l) => l.trim() === 'Focaliseurs druidiques');
  const frDruidicEnd = frDruidicStart + 12;
  const enDruidicRows = parseGearTable(en, enDruidicStart + 1, enDruidicEnd, EN_COST_RE, /lb\./, /Varies/);
  const frDruidicRows = parseGearTable(fr, frDruidicStart + 1, frDruidicEnd, FR_COST_RE, /(g|kg)\b/, /Variable/i);
  const matchedDruidic = matchGear(enDruidicRows, frDruidicRows, DRUIDIC_FOCUS_VARIANTS_MAP, 'Druidic Focuses');

  console.log('  → parsing holy symbol variants');
  const enHolyStart = findIndex(en, (l) => l.trim() === 'Holy Symbols');
  const enHolyEnd = enHolyStart + 14;
  const frHolyStart = findIndex(fr, (l) => l.trim() === 'Symboles sacrés');
  const frHolyEnd = frHolyStart + 14;
  const enHolyRows = parseGearTable(en, enHolyStart + 1, enHolyEnd, EN_COST_RE, /lb\./, /Varies/);
  const frHolyRows = parseGearTable(fr, frHolyStart + 1, frHolyEnd, FR_COST_RE, /(g|kg)\b/, /Variable/i);
  const matchedHoly = matchGear(enHolyRows, frHolyRows, HOLY_SYMBOL_VARIANTS_MAP, 'Holy Symbols');

  console.log('  → parsing tools (key:value entries)');
  const enToolsStart = findIndex(en, (l) => /^To\s*o\s*l\s*s$/.test(l.trim()));
  const enToolsEnd = findIndex(en, (l) => l.trim() === 'Adventuring Gear', enToolsStart);
  const frToolsStart = findIndex(fr, (l) => l.trim() === 'Outils');
  const frToolsEnd = findIndex(fr, (l) => l.trim() === "Matériel d’aventurier", frToolsStart);
  const enTools = parseToolsSection(en, enToolsStart, enToolsEnd, 'en');
  const frTools = parseToolsSection(fr, frToolsStart, frToolsEnd, 'fr');
  console.log(`     EN: ${enTools.length} tool entries, FR: ${frTools.length} tool entries`);
  // Convert tool entries to RawGearRow shape for matching.
  const enToolsAsGear: RawGearRow[] = enTools.map((t) => ({
    name: t.name,
    weightLb: t.weightLb,
    cost: t.cost,
    varies: t.varies,
  }));
  const frToolsAsGear: RawGearRow[] = frTools.map((t) => ({
    name: t.name,
    weightLb: t.weightLb,
    cost: t.cost,
    varies: t.varies,
  }));
  const matchedTools = matchGear(enToolsAsGear, frToolsAsGear, TOOLS_MAP, 'Tools');

  // Gaming + Musical variants : these are inline ("Variants: cards (5 SP), ...") — derive from the parent entry's prose.
  // For the items.json, we'll synthesize variant items with their cost/weight from the dict, then attempt PDF cross-check.
  const matchedGamingVariants = synthesizeVariantsFromDict(GAMING_SET_VARIANTS_MAP, GAMING_SET_VARIANTS_INLINE_DATA);
  const matchedMusicVariants = synthesizeVariantsFromDict(MUSICAL_INSTRUMENT_VARIANTS_MAP, MUSICAL_INSTRUMENT_INLINE_DATA);

  // ─── Build Items ─────────────────────────────────────────────────────────
  const items: Item[] = [];
  for (const w of matchedWeapons) items.push(buildWeaponItem(w));
  for (const a of matchedArmor) items.push(buildArmorItem(a));
  for (const g of matchedGear) {
    const cat: 'gear' | 'pack' = PACK_IDS.has(g.id) ? 'pack' : 'gear';
    items.push(buildGearItem(g, cat));
  }
  for (const a of matchedAmmo) items.push(buildGearItem(a, 'gear'));
  for (const f of matchedArcane) items.push(buildGearItem(f, 'gear'));
  for (const f of matchedDruidic) items.push(buildGearItem(f, 'gear'));
  for (const h of matchedHoly) items.push(buildGearItem(h, 'gear'));
  for (const t of matchedTools) items.push(buildToolItem(t));
  for (const g of matchedGamingVariants) items.push(g);
  for (const m of matchedMusicVariants) items.push(m);

  // Synthetic items not in the gear table but referenced by class starting equipment.
  items.push(...synthesizeMandatoryItems());

  // ─── Validate against ItemSchema ─────────────────────────────────────────
  const arrSchema = z.array(ItemSchema);
  const result = arrSchema.safeParse(items);
  if (!result.success) {
    console.error('Validation errors:');
    for (const err of result.error.errors.slice(0, 15)) {
      console.error(`  [${err.path.join('.')}]: ${err.message}`);
    }
    throw new Error(`items.json validation failed (${result.error.errors.length} errors)`);
  }
  console.log(`  ✓ ${items.length} items validated against ItemSchema`);

  // ─── Cross-reference: ID uniqueness ──────────────────────────────────────
  const ids = new Set<string>();
  for (const it of items) {
    if (ids.has(it.id)) throw new Error(`Duplicate item id: ${it.id}`);
    ids.add(it.id);
  }

  // Persist
  await mkdir(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, 'items.json');
  await writeFile(outPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`  → ${outPath} (${items.length} items)`);

  const byId = new Map<string, Item>();
  for (const it of items) byId.set(it.id, it);
  return { items, byId };
}

// ─── Ammunition rows parsing ────────────────────────────────────────────────

function parseAmmunitionRows(lines: Lines, fromIdx: number, endIdx: number, lang: 'en' | 'fr'): RawGearRow[] {
  // EN row e.g. "Arrows20Quiver1 lb.1 GP"
  // Format: NAME + AMOUNT + STORAGE + WEIGHT + COST
  // We only need NAME + WEIGHT + COST to match against AMMUNITION_VARIANTS_MAP.
  const rows: RawGearRow[] = [];
  let buf: string[] = [];
  const costRe = lang === 'en' ? EN_COST_RE : FR_COST_RE;
  for (let i = fromIdx; i < endIdx; i++) {
    const trimmed = lines.raw[i].trim();
    if (!trimmed) continue;
    if (/^Document|^System Reference|^\d{1,3}$/.test(trimmed)) continue;
    if (/^(Type|Ty\s*p\s*e|Amount|Quantité|Storage|Rangement|Weight|Poids|Cost|Prix)\s*$/.test(trimmed)) continue;
    // Concatenated header line (e.g. "Ty p eAmountStorageWeightCost" / "Ty p eQuantitéRangementPoidsPrix").
    if (/^Ty\s*p\s*e.*(Cost|Prix)\s*$/.test(trimmed)) continue;
    buf.push(trimmed);
    const joined = buf.join(' ');
    if (costRe.test(joined)) {
      const cost = lang === 'en' ? parseEnCost(joined) : parseFrCost(joined);
      const costMatch = joined.match(costRe)!;
      const before = joined.slice(0, costMatch.index!).trimEnd();
      // Capture trailing weight
      let weightLb: number | null = null;
      let beforeWeight = before;
      if (lang === 'en') {
        const wMatch = before.match(/(?:\d+(?:[.,]\d+)?\s*[½¼¾]?\s*lb\.|[½¼¾]\s*lb\.)\s*$/);
        if (wMatch) {
          weightLb = parseEnWeightLb(wMatch[0]);
          beforeWeight = before.slice(0, wMatch.index!).trimEnd();
        }
      } else {
        const wMatch = before.match(/(\d+(?:[.,]\d+)?\s*(g|kg))\s*$/);
        if (wMatch) {
          weightLb = parseFrWeightLb(wMatch[0]);
          beforeWeight = before.slice(0, wMatch.index!).trimEnd();
        }
      }
      // Now beforeWeight = NAME + AMOUNT + STORAGE — strip from the right two tokens (storage + amount).
      // Storage is a NAME word (Quiver/Case/Pouch/Carquois/Étui/Sacoche). Amount is digits.
      // Strip storage word: the LAST capitalized word.
      let stripped = beforeWeight;
      const storageRe = lang === 'en'
        ? /(?:Quiver|Case|Pouch)\s*$/
        : /(?:Carquois|Étui|Sacoche)\s*$/;
      stripped = stripped.replace(storageRe, '').trim();
      // Strip the trailing amount digits.
      stripped = stripped.replace(/\s*\d+\s*$/, '').trim();
      rows.push({ name: stripped, weightLb, cost, varies: false });
      buf = [];
    }
  }
  return rows;
}

// ─── Gaming Set + Musical Instrument inline variants ────────────────────────
// These don't appear in a table — they're listed inline in the parent's "Variants: ..." prose.
// To avoid re-parsing prose, we hard-code the EN variants' canonical (cost, weight) here from the SRD.
// FR side comes from the dict (gear-fr-en.ts via tools-fr-en.ts).

interface InlineVariant {
  id: string;
  costQty: number;
  costUnit: CoinCanonical;
  weightLb: number;
}
const GAMING_SET_VARIANTS_INLINE_DATA: InlineVariant[] = [
  { id: 'gaming-set-dice', costQty: 1, costUnit: 'sp', weightLb: 0 },
  { id: 'gaming-set-dragonchess', costQty: 1, costUnit: 'gp', weightLb: 0 },
  { id: 'gaming-set-playing-cards', costQty: 5, costUnit: 'sp', weightLb: 0 },
  { id: 'gaming-set-three-dragon-ante', costQty: 1, costUnit: 'gp', weightLb: 0 },
];
const MUSICAL_INSTRUMENT_INLINE_DATA: InlineVariant[] = [
  { id: 'musical-instrument-bagpipes', costQty: 30, costUnit: 'gp', weightLb: 6 },
  { id: 'musical-instrument-drum', costQty: 6, costUnit: 'gp', weightLb: 3 },
  { id: 'musical-instrument-dulcimer', costQty: 25, costUnit: 'gp', weightLb: 10 },
  { id: 'musical-instrument-flute', costQty: 2, costUnit: 'gp', weightLb: 1 },
  { id: 'musical-instrument-horn', costQty: 3, costUnit: 'gp', weightLb: 2 },
  { id: 'musical-instrument-lute', costQty: 35, costUnit: 'gp', weightLb: 2 },
  { id: 'musical-instrument-lyre', costQty: 30, costUnit: 'gp', weightLb: 2 },
  { id: 'musical-instrument-pan-flute', costQty: 12, costUnit: 'gp', weightLb: 2 },
  { id: 'musical-instrument-shawm', costQty: 2, costUnit: 'gp', weightLb: 1 },
  { id: 'musical-instrument-viol', costQty: 30, costUnit: 'gp', weightLb: 1 },
];

/**
 * Synthetic items referenced by class startingEquipment but absent from the
 * Adventuring Gear / Tools tables :
 *   - 'spellbook' : Wizard class feature item (described in Wizard prose : 3 lb).
 *   - 'artisans-tools' : "any one Artisan's Tools" placeholder (Monk choice).
 * Documented in EXTRACTION-NOTES.md.
 */
function synthesizeMandatoryItems(): Item[] {
  return [
    {
      id: 'spellbook',
      name: { fr: 'Livre de sorts', en: 'Spellbook' },
      category: 'gear',
      cost: null,
      weight: 3,
      description: {
        fr: 'Le livre de sorts du Magicien, octroyé par son aptitude de classe Spellcasting. Tiny, 100 pages, lisible uniquement par le propriétaire ou via Identification.',
        en: "A Wizard's spellbook, granted by their Spellcasting class feature. Tiny object, 100 pages, readable only by the owner or via Identify.",
      },
      properties: ['class-feature'],
      source: SOURCE,
    },
    {
      id: 'artisans-tools',
      name: { fr: "Outils d’artisan (au choix)", en: "Artisan’s Tools (choice)" },
      category: 'tool',
      cost: null,
      weight: 0,
      description: {
        fr: "Placeholder pour « Outils d’artisan au choix » (Moine SRD). À remplacer par un outil spécifique à la création du personnage.",
        en: "Placeholder for 'any Artisan's Tools' (Monk SRD). Replace with a specific tool at character creation.",
      },
      properties: ['placeholder', 'choice'],
      source: SOURCE,
    },
  ];
}

function synthesizeVariantsFromDict(
  map: readonly GearMapEntry[],
  data: InlineVariant[],
): Item[] {
  const dataById = new Map(data.map((d) => [d.id, d]));
  const items: Item[] = [];
  for (const m of map) {
    const d = dataById.get(m.id);
    if (!d) {
      throw new Error(`Variant ${m.id} missing inline data`);
    }
    items.push({
      id: m.id,
      name: { fr: m.fr, en: m.en },
      category: 'tool',
      cost: { qty: d.costQty, unit: d.costUnit },
      weight: d.weightLb,
      description: null,
      properties: ['variant'],
      source: SOURCE,
    });
  }
  return items;
}

// ─── Standalone CLI ─────────────────────────────────────────────────────────

// Run only when invoked as the script entry point (not when imported).
const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  const argv = process.argv[1].replace(/\\/g, '/');
  const meta = import.meta.url.replace(/^file:\/\/\/?/, '').replace(/\\/g, '/');
  return meta.endsWith(argv) || argv.endsWith(meta) || meta.includes('parse-srd-equipment');
})();
if (invokedDirectly && process.argv[1]?.includes('parse-srd-equipment')) {
  parseEquipment().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
