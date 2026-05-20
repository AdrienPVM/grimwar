/**
 * scripts/bootstrap-srd-spells.ts — BOOTSTRAP ONE-SHOT (plan 13.10 commit 1)
 *
 * Lit les DEUX .txt SRD (EN + FR) UNE SEULE FOIS et génère
 * `scripts/data/srd-spells.ts` (module TS révisable, devenu source canonique
 * comme les siblings `srd-invocations.ts` / `srd-feats.ts`).
 *
 * ⚠️ Ce script n'est PAS dans la pipeline de build récurrente.
 *    `extract-srd-spells.ts` (TS→JSON) ne relit JAMAIS le texte.
 *    Conforme à la règle « Sources SRD CC légitimes (LOCKED) » (CLAUDE.md) :
 *    .txt SRD = source primaire du bootstrap, lus une seule fois.
 *    Toute source non-SRD (AideDD, PHB) est refusée par construction
 *    (on ne lit que les 2 chemins SRD ci-dessous).
 *
 * Run :
 *   pnpm tsx scripts/bootstrap-srd-spells.ts            # diagnostics + liste fallback (pas d'écriture)
 *   pnpm tsx scripts/bootstrap-srd-spells.ts --emit     # écrit scripts/data/srd-spells.ts
 *
 * Les 4 heuristiques de détection fallback A1 (plan 13.10 commit 1) :
 *   D-1 tables aplaties · D-2 statblocks contaminants ·
 *   longueur anormale (>2× moyenne du champ) · marqueur structurel d'entrée.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { CLASS_FR_TO_EN_ID } from './maps/class-fr-to-en';
import { SRD_SPELLS } from './data/srd-spells';
import { SPELL_NAME_PAIRS } from './data/srd-spell-pairs';
import { checkSpellQuality } from './srd-spell-quality-gate';

// ─── Sources SRD (seules sources autorisées) ────────────────────────────────
const EN_TXT = 'content-sources/extracted/raw/SRD_CC_v5.2.1.txt';
const FR_TXT = 'content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt';
const OUT_MODULE = 'scripts/data/srd-spells.ts';

// Bornes de section (marqueurs de début/fin de la description des sorts).
const EN_START = 'Spell Descriptions';
const EN_END = 'Rules Glossary';
const FR_START = 'Description des sorts';
const FR_END = 'Glossaire de règles';

const EN_FOOTER = 'System Reference Document 5.2.1';
const FR_FOOTER = 'Document de Référence du Système 5.2.1';

const SCHOOLS_EN: Record<string, string> = {
  Abjuration: 'abjuration',
  Conjuration: 'conjuration',
  Divination: 'divination',
  Enchantment: 'enchantment',
  Evocation: 'evocation',
  Illusion: 'illusion',
  Necromancy: 'necromancy',
  Transmutation: 'transmutation',
};
// FR : Invocation (FR) = Conjuration (EN).
const SCHOOLS_FR: Record<string, string> = {
  Abjuration: 'abjuration',
  Invocation: 'conjuration',
  Divination: 'divination',
  Enchantement: 'enchantment',
  Évocation: 'evocation',
  Illusion: 'illusion',
  Nécromancie: 'necromancy',
  Transmutation: 'transmutation',
};

const CLASS_EN_TO_ID: Record<string, string> = {
  Artificer: 'artificer',
  Barbarian: 'barbarian',
  Bard: 'bard',
  Cleric: 'cleric',
  Druid: 'druid',
  Fighter: 'fighter',
  Monk: 'monk',
  Paladin: 'paladin',
  Ranger: 'ranger',
  Rogue: 'rogue',
  Sorcerer: 'sorcerer',
  Warlock: 'warlock',
  Wizard: 'wizard',
};

interface ParsedSpell {
  name: string;
  level: number;
  school: string;
  classIds: string[];
  v: boolean;
  s: boolean;
  m: boolean;
  material: string | null;
  castingTime: string;
  range: string;
  rangeCanon: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  atHigherLevels: string | null;
}

// ─── Helpers texte ───────────────────────────────────────────────────────────

function readLines(path: string): string[] {
  return readFileSync(path, 'utf-8').split('\n');
}

function sliceSection(lines: string[], start: string, end: string): string[] {
  // On prend la DERNIÈRE occurrence de `start` (les premières sont la table des matières).
  let startIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === start) {
      startIdx = i;
      break;
    }
  }
  if (startIdx < 0) throw new Error(`[bootstrap] section start introuvable: "${start}"`);
  let endIdx = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === end) {
      endIdx = i;
      break;
    }
  }
  if (endIdx < 0) throw new Error(`[bootstrap] section end introuvable: "${end}"`);
  return lines.slice(startIdx + 1, endIdx);
}

/** Retire les pieds de page (titre SRD + numéro de page qui suit). */
function stripFooters(lines: string[], footer: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === footer) {
      // Le numéro de page suit immédiatement (ligne purement numérique).
      if (i + 1 < lines.length && /^\d+$/.test(lines[i + 1].trim())) i++;
      continue;
    }
    out.push(lines[i]);
  }
  return out;
}

/** Corrige les artefacts cosmétiques d'extraction (espaces parasites). */
function despaceDice(s: string): string {
  // « 4 d6 » → « 4d6 », « 2 d10 » → « 2d10 ».
  return s.replace(/(\d)\s+d(\d)/g, '$1d$2');
}

function fixFrOrdinal(s: string): string {
  // « 3 e » → « 3e », « 1 er » → « 1er » (exposant éclaté reflowé) (D-3).
  return s.replace(/(\d+)\s+(ers?|ères?|èmes?|es?|ème|e)\b/g, '$1$2');
}

const TOUCH_ARTIFACTS = new Set(['Tou c h', 'To u c h', 'T o u c h']);

/** Reflow d'un bloc de prose : déhyphénation + jointure + paragraphes. */
function reflowProse(rawLines: string[]): string {
  const paragraphs: string[] = [];
  let current = '';
  const flush = (): void => {
    const t = current.trim().replace(/\s+/g, ' ');
    if (t) paragraphs.push(t);
    current = '';
  };
  for (const raw of rawLines) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '') {
      flush();
      continue;
    }
    // Nouveau paragraphe : indentation significative en début de ligne.
    if (/^\s{3,}\S/.test(raw) && current.trim() !== '') {
      flush();
    }
    const trimmed = line.trim();
    if (current === '') {
      current = trimmed;
    } else if (/[A-Za-zÀ-ÿ]-$/.test(current)) {
      // Mot coupé en fin de ligne : recoller sans espace.
      current = current.slice(0, -1) + trimmed;
    } else {
      current += ' ' + trimmed;
    }
  }
  flush();
  return paragraphs.join('\n');
}

// ─── Segmentation ──────────────────────────────────────────────────────────

const EN_HEADER_RE =
  /^(Level [1-9] (Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation)|(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation) Cantrip)\b/;
// Cantrip FR : « École mineure (classes » — le « ( » est sur la même ligne (le
// départage de la ligne de NOM est nécessaire car le sort « Illusion mineure »
// se nomme exactement comme un header d'école. Leveled FR : « École du N » (le
// « ( » arrive après l'ordinal éclaté, donc pas exigé ici).
// « mineure » (féminin) sauf « Enchantement mineur » (masculin) → « mineure? ».
const FR_HEADER_RE =
  /^(Abjuration|Invocation|Divination|Enchantement|Évocation|Illusion|Nécromancie|Transmutation) (du \d|mineure? \()/;

interface Block {
  name: string;
  lines: string[]; // header + métadonnées + prose (sans la ligne de nom)
}

// ─── Normalisation des titres « letter-spaced » ───────────────────────────────
// La typographie des PDF SRD applique un letter-spacing aux titres de sort ;
// l'extraction texte le restitue en lettres isolées (« Ts u n a m i »,
// « Te r r e u r », « Tr u e   S e e i ng »). Le mot est délimité par un
// double-espace, les lettres intra-mot par un simple espace. On recolle.
function normalizeSpacedTitle(name: string): string {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return name;
  // Artefact letter-spaced : la majorité des tokens font 1-2 lettres.
  const shortRatio = tokens.filter((t) => t.length <= 2).length / tokens.length;
  if (shortRatio < 0.6) return name;
  return name
    .split(/\s{2,}/) // frontières de mot = double-espace
    .map((word) => word.replace(/\s+/g, '')) // recolle les lettres d'un mot
    .join(' ')
    .trim();
}

// Artefacts small-caps (les dernières lettres rendues en capitales) : pas de
// pattern fiable sans risquer d'abîmer des titres légitimes → table explicite,
// vérifiée contre content-sources/extracted/raw/SRD_CC_v5.2.1.txt.
const TITLE_REPAIR: Record<string, string> = {
  'Acid SplASh': 'Acid Splash', // SRD_CC_v5.2.1.txt:10125 (clean form l.6426)
};

function repairTitle(name: string): string {
  if (TITLE_REPAIR[name]) return TITLE_REPAIR[name];
  return normalizeSpacedTitle(name);
}

function segment(lines: string[], headerRe: RegExp): Block[] {
  const headerIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (headerRe.test(lines[i].trim())) headerIdx.push(i);
  }
  const blocks: Block[] = [];
  for (let k = 0; k < headerIdx.length; k++) {
    const hi = headerIdx[k];
    // Nom = ligne non-vide juste avant le header.
    let nameIdx = hi - 1;
    while (nameIdx >= 0 && lines[nameIdx].trim() === '') nameIdx--;
    const name = repairTitle(lines[nameIdx]?.trim() ?? '');
    // Fin du bloc = juste avant le nom du sort suivant.
    let blockEnd = lines.length;
    if (k + 1 < headerIdx.length) {
      let nextName = headerIdx[k + 1] - 1;
      while (nextName >= 0 && lines[nextName].trim() === '') nextName--;
      blockEnd = nextName;
    }
    blocks.push({ name, lines: lines.slice(hi, blockEnd) });
  }
  return blocks;
}

// ─── Parse d'un bloc ─────────────────────────────────────────────────────────

type FieldKey = 'castingTime' | 'range' | 'components' | 'duration';
interface FieldLabels {
  // Préfixe de ligne par champ (apostrophe FR flexible droite/courbe).
  match: { key: FieldKey; re: RegExp }[];
  upcastLevel: string;
  upcastCantrip: string;
}
const EN_LABELS: FieldLabels = {
  match: [
    { key: 'castingTime', re: /^Casting Time:/ },
    { key: 'range', re: /^Range:/ },
    { key: 'components', re: /^Components?:/ },
    { key: 'duration', re: /^Duration:/ },
  ],
  upcastLevel: 'Using a Higher-Level Spell Slot',
  upcastCantrip: 'Cantrip Upgrade',
};
const FR_LABELS: FieldLabels = {
  match: [
    { key: 'castingTime', re: /^Temps d['\u2019]incantation\s*:/ },
    { key: 'range', re: /^Port\u00e9e\s*:/ },
    { key: 'components', re: /^Composantes\s*:/ },
    { key: 'duration', re: /^Dur\u00e9e\s*:/ },
  ],
  upcastLevel: 'Emplacement de niveau sup\u00e9rieur',
  upcastCantrip: 'Am\u00e9lioration de sort mineur',
};

function parseHeaderEN(joined: string): { level: number; school: string; classIds: string[] } {
  const cantrip = joined.match(
    /^(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation) Cantrip \((.+)\)/,
  );
  if (cantrip) {
    return { level: 0, school: SCHOOLS_EN[cantrip[1]], classIds: parseClassesEN(cantrip[2]) };
  }
  const lvl = joined.match(
    /^Level ([1-9]) (Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation) \((.+)\)/,
  );
  if (!lvl) throw new Error(`[bootstrap] header EN non parsé: "${joined}"`);
  return { level: Number(lvl[1]), school: SCHOOLS_EN[lvl[2]], classIds: parseClassesEN(lvl[3]) };
}

function parseClassesEN(s: string): string[] {
  return s
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const id = CLASS_EN_TO_ID[c.replace(/\s+/g, '')];
      if (!id) throw new Error(`[bootstrap] classe EN inconnue: "${c}"`);
      return id;
    });
}

function parseClassesFR(s: string): string[] {
  return s
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const id = CLASS_FR_TO_EN_ID[c.replace(/\s+/g, '').toLowerCase()];
      if (!id) throw new Error(`[bootstrap] classe FR inconnue: "${c}"`);
      return id;
    });
}

function parseHeaderFR(joined: string): { level: number; school: string; classIds: string[] } {
  const j = fixFrOrdinal(joined);
  const paren = j.match(/\(([^)]*)\)/);
  const classIds = paren ? parseClassesFR(paren[1]) : [];
  const cantrip = j.match(
    /^(Abjuration|Invocation|Divination|Enchantement|Évocation|Illusion|Nécromancie|Transmutation) mineure?/,
  );
  if (cantrip) return { level: 0, school: SCHOOLS_FR[cantrip[1]], classIds };
  const lvl = j.match(
    /^(Abjuration|Invocation|Divination|Enchantement|Évocation|Illusion|Nécromancie|Transmutation) du (\d)e/,
  );
  if (!lvl) throw new Error(`[bootstrap] header FR non parsé: "${j}"`);
  return { level: Number(lvl[2]), school: SCHOOLS_FR[lvl[1]], classIds };
}

function parseComponents(value: string): {
  v: boolean;
  s: boolean;
  m: boolean;
  material: string | null;
} {
  const parenIdx = value.indexOf('(');
  const flags = parenIdx >= 0 ? value.slice(0, parenIdx) : value;
  const material =
    parenIdx >= 0 ? value.slice(parenIdx + 1).replace(/\)\s*$/, '').trim() : null;
  const tokens = flags.split(',').map((t) => t.trim().toUpperCase());
  return {
    v: tokens.includes('V'),
    s: tokens.includes('S'),
    m: tokens.includes('M'),
    material: material && material.length > 0 ? material : null,
  };
}

const RANGE_CANON_EN: Record<string, string> = { Self: 'self', Touch: 'touch' };
const RANGE_CANON_FR: Record<string, string> = { personnelle: 'self', contact: 'touch' };

function canonRange(raw: string, lang: 'en' | 'fr'): string {
  const r = raw.trim();
  if (lang === 'en') {
    if (RANGE_CANON_EN[r]) return RANGE_CANON_EN[r];
    const ft = r.match(/^(\d+) feet$/);
    if (ft) return `${Math.round(Number(ft[1]) * 0.3 * 10) / 10}m`;
    const mi = r.match(/^(\d+) miles?$/);
    if (mi) return `${Number(mi[1]) * 1.5}km`;
    return r.toLowerCase().replace(/\s+/g, '');
  }
  if (RANGE_CANON_FR[r]) return RANGE_CANON_FR[r];
  const m = r.match(/^([\d,]+) m$/);
  if (m) return `${Number(m[1].replace(',', '.'))}m`;
  const km = r.match(/^([\d,]+) km$/);
  if (km) return `${Number(km[1].replace(',', '.'))}km`;
  return r.toLowerCase().replace(/\s+/g, '');
}

function parseBlock(block: Block, lang: 'en' | 'fr'): ParsedSpell {
  const labels = lang === 'en' ? EN_LABELS : FR_LABELS;
  const lines = block.lines.slice(1); // saute la ligne header-école

  // 1) Header (peut wrapper jusqu'au ")").
  let headerJoined = block.lines[0].trim();
  let i = 0;
  while (!headerJoined.includes(')') && i < lines.length) {
    headerJoined += ' ' + lines[i].trim();
    i++;
  }
  headerJoined = headerJoined.replace(/\s+/g, ' ').trim();

  const isLabel = (line: string): FieldKey | null => {
    const t = line.trim();
    for (const { key, re } of labels.match) if (re.test(t)) return key;
    return null;
  };

  // 2) Métadonnées : on accumule à partir de la 1re ligne de label.
  const fieldLines = lines.slice(i);
  const fields: Record<string, string> = {};
  let cur: string | null = null;
  let proseStart = fieldLines.length;
  for (let j = 0; j < fieldLines.length; j++) {
    const lab = isLabel(fieldLines[j]);
    if (lab) {
      cur = lab;
      const colon = fieldLines[j].indexOf(':');
      fields[lab] = fieldLines[j].slice(colon + 1).trim();
    } else if (cur) {
      // Continuation d'un champ tant qu'on n'a pas franchi « Duration ».
      if (cur === 'duration') {
        proseStart = j;
        break;
      }
      fields[cur] += ' ' + fieldLines[j].trim();
    }
  }
  const proseLines = fieldLines.slice(proseStart);

  // 3) Prose + upcast.
  const upRe = new RegExp('^\\s*(' + labels.upcastLevel + '|' + labels.upcastCantrip + ')\\.?');
  let upcastIdx = -1;
  for (let j = 0; j < proseLines.length; j++) {
    if (upRe.test(proseLines[j])) {
      upcastIdx = j;
      break;
    }
  }
  const descLines = upcastIdx >= 0 ? proseLines.slice(0, upcastIdx) : proseLines;
  const upLines = upcastIdx >= 0 ? proseLines.slice(upcastIdx) : [];

  let description = reflowProse(descLines);
  let atHigherLevels = upLines.length ? reflowProse(upLines) : null;
  if (lang === 'fr') {
    description = fixFrOrdinal(description);
    if (atHigherLevels) atHigherLevels = fixFrOrdinal(atHigherLevels);
  }
  description = despaceDice(description);
  if (atHigherLevels) atHigherLevels = despaceDice(atHigherLevels);

  const header = lang === 'en' ? parseHeaderEN(headerJoined) : parseHeaderFR(headerJoined);
  const comps = parseComponents(fields.components ?? '');
  let rangeRaw = (fields.range ?? '').trim();
  if (TOUCH_ARTIFACTS.has(rangeRaw)) rangeRaw = 'Touch';
  const castingTime = (fields.castingTime ?? '').replace(/\s+/g, ' ').trim();
  const duration = (fields.duration ?? '').replace(/\s+/g, ' ').trim();

  return {
    name: block.name,
    level: header.level,
    school: header.school,
    classIds: 'classIds' in header ? header.classIds : [],
    v: comps.v,
    s: comps.s,
    m: comps.m,
    material: comps.material,
    castingTime,
    range: rangeRaw,
    rangeCanon: canonRange(rangeRaw, lang),
    duration,
    concentration: /concentration/i.test(duration),
    ritual: /ritual|rituel/i.test(castingTime),
    description,
    atHigherLevels,
  };
}

// ─── Slug (id) ────────────────────────────────────────────────────────────────

function slug(frName: string): string {
  return frName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Heuristiques fallback A1 ──────────────────────────────────────────────────

// Marqueurs spécifiques aux statblocks de créature. Un sort normal peut citer
// « Hit Points » isolément — la contamination est un CLUSTER (≥3 marqueurs).
const STATBLOCK_MARKERS = [
  /\bArmor Class\b/,
  /\bHit Points\b\s*\d/,
  /\bSpeed\b\s*\d?\d* ?ft/,
  /\bSTR\b[\s\S]{0,40}\bDEX\b[\s\S]{0,40}\bCON\b/,
  /\bChallenge\b\s*\d/,
  /\bProficiency Bonus\b/,
  /\bSenses\b/,
  /\bInitiative\b\s*[+-]/,
];
function statblockMarkerCount(text: string): number {
  return STATBLOCK_MARKERS.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
}
const TABLE_GLUED_RE = /\dd\d{1,2}[A-Za-zÀ-ÿ]/; // « 1d10Comportement » = table aplatie
const NAME_ARTIFACT_RE = /(\b[A-Za-z] [A-Za-z]\b)|([a-z][A-Z])/; // lettres espacées / casse interne

function fingerprint(s: ParsedSpell): string {
  return [
    s.level,
    s.school,
    [...s.classIds].sort().join(','),
    `${s.v ? 'V' : ''}${s.s ? 'S' : ''}${s.m ? 'M' : ''}`,
    s.concentration ? 'C' : '',
    s.ritual ? 'R' : '',
  ].join('|');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  // ─── GATE DURE : valide le module ÉMIS (post-corrections), pas le parse brut. ──
  // (le parse brut contient les bleeds/inversions par construction ; la gate qualité
  //  s'applique au livrable corrigé, et est aussi câblée en test CI permanent.)
  if (process.argv.includes('--gate')) {
    const { violations, band, median } = checkSpellQuality(SRD_SPELLS);
    console.log(`[gate] ${SRD_SPELLS.length} sorts · médiane FR/EN=${median.toFixed(3)} · bande [${band[0].toFixed(2)}, ${band[1].toFixed(2)}]`);
    if (violations.length) {
      console.error(`\n❌ [gate] ${violations.length} violation(s) qualité :`);
      for (const v of violations) console.error(`  • ${v}`);
      process.exit(1);
    }
    console.log('✅ [gate] aucune violation (plancher de longueur + ratio FR/EN).');
    return;
  }

  const emit = process.argv.includes('--emit');

  const enBlocks = segment(stripFooters(sliceSection(readLines(EN_TXT), EN_START, EN_END), EN_FOOTER), EN_HEADER_RE);
  const frBlocks = segment(stripFooters(sliceSection(readLines(FR_TXT), FR_START, FR_END), FR_FOOTER), FR_HEADER_RE);

  const enSpells = enBlocks.map((b) => parseBlock(b, 'en'));
  const frSpells = frBlocks.map((b) => parseBlock(b, 'fr'));

  console.log(`[bootstrap] segmentation : ${enSpells.length} EN · ${frSpells.length} FR`);

  // ─── Pairing par NOM via rename map FR↔EN (INTRANT déterministe) ──────────────
  // Le pairing par empreinte structurelle s'est avéré insuffisant : 2 collisions de
  // range tiraient à pile ou face et produisaient des inversions EN↔FR. On apparie
  // désormais par nom via `SPELL_NAME_PAIRS` (table hand-corrigée), avec gate de
  // complétude DURE des deux côtés. `frByFp` reste construit pour le diag --collisions.
  const frByFp = new Map<string, ParsedSpell[]>();
  for (const fr of frSpells) {
    const fp = fingerprint(fr);
    (frByFp.get(fp) ?? frByFp.set(fp, []).get(fp)!).push(fr);
  }
  const enByName = new Map<string, ParsedSpell>();
  for (const en of enSpells) {
    if (enByName.has(en.name)) throw new Error(`[bootstrap] doublon de nom EN segmenté: "${en.name}"`);
    enByName.set(en.name, en);
  }
  const frByName = new Map<string, ParsedSpell>();
  for (const fr of frSpells) {
    if (frByName.has(fr.name)) throw new Error(`[bootstrap] doublon de nom FR segmenté: "${fr.name}"`);
    frByName.set(fr.name, fr);
  }

  const paired: { en: ParsedSpell; fr: ParsedSpell }[] = [];
  const usedEn = new Set<string>();
  const usedFr = new Set<ParsedSpell>();
  for (const [enName, frName] of SPELL_NAME_PAIRS) {
    const en = enByName.get(enName);
    const fr = frByName.get(frName);
    if (!en) throw new Error(`[bootstrap] PAIRING GATE — nom EN de la map absent du parse: "${enName}"`);
    if (!fr) throw new Error(`[bootstrap] PAIRING GATE — nom FR de la map absent du parse: "${frName}"`);
    usedEn.add(enName);
    usedFr.add(fr);
    paired.push({ en, fr });
  }
  // Gate de complétude : aucun bloc segmenté ne doit échapper à la map.
  const enUncovered = enSpells.filter((e) => !usedEn.has(e.name)).map((e) => e.name);
  const frUncovered = frSpells.filter((f) => !usedFr.has(f)).map((f) => f.name);
  if (enUncovered.length || frUncovered.length) {
    throw new Error(
      `[bootstrap] PAIRING GATE — blocs non couverts par la rename map :\n` +
        `  EN orphelins (${enUncovered.length}): ${enUncovered.join(', ')}\n` +
        `  FR orphelins (${frUncovered.length}): ${frUncovered.join(', ')}`,
    );
  }
  const unpaired: ParsedSpell[] = []; // toujours vide sous pairing par nom (gate dure)

  console.log(`[bootstrap] pairing par nom : ${paired.length} appariés · 0 orphelin (gate complétude OK)`);

  if (process.argv.includes('--diag')) {
    const frFree = frSpells.filter((f) => !usedFr.has(f));
    for (const en of unpaired) {
      console.log(`\nEN  ${en.name}  fp=[${fingerprint(en)}]  range=${en.rangeCanon}`);
      for (const fr of frFree.filter((f) => f.level === en.level && f.school === en.school)) {
        console.log(`  FR? ${fr.name}  fp=[${fingerprint(fr)}]  range=${fr.rangeCanon}`);
      }
    }
    return;
  }

  // ─── DIAG --collisions : groupes de collision d'empreinte (source des inversions) ──
  // Le pairing par empreinte tire à pile ou face quand >1 candidat FR partage
  // la même empreinte ET la même portée. Ces groupes sont le risque d'inversion.
  if (process.argv.includes('--collisions')) {
    const enByFp = new Map<string, ParsedSpell[]>();
    for (const en of enSpells) (enByFp.get(fingerprint(en)) ?? enByFp.set(fingerprint(en), []).get(fingerprint(en))!).push(en);
    let ambiguous = 0;
    for (const [fp, ens] of enByFp) {
      const frs = frByFp.get(fp) ?? [];
      if (ens.length < 2 && frs.length < 2) continue;
      // Départage par portée : un groupe est AMBIGU si ≥2 membres partagent une portée.
      const enRanges = ens.map((e) => e.rangeCanon);
      const dupRange = enRanges.some((r, i) => enRanges.indexOf(r) !== i);
      const flag = dupRange ? '⚠ AMBIGU (range non discriminant)' : 'résolu par range';
      if (dupRange) ambiguous++;
      console.log(`\nfp=[${fp}] — ${flag}`);
      for (const e of ens) console.log(`  EN ${e.name}  range=${e.rangeCanon}`);
      for (const f of frs) console.log(`  FR ${f.name}  range=${f.rangeCanon}`);
    }
    console.log(`\n[collisions] groupes ambigus (inversion possible) = ${ambiguous}`);
    return;
  }

  // ─── DIAG --emit-pairs : dump des paires (EN name, FR name) issues du pairing courant ──
  // Sert UNE FOIS à amorcer la rename map FR↔EN (scripts/data/srd-spell-pairs.ts),
  // ensuite hand-corrigée pour les 2 inversions, puis devenue l'INTRANT du pairing.
  if (process.argv.includes('--emit-pairs')) {
    const rows = paired
      .map(({ en, fr }) => ({ en: en.name, fr: fr.name }))
      .sort((a, b) => a.en.localeCompare(b.en));
    for (const r of rows) console.log(`  [${JSON.stringify(r.en)}, ${JSON.stringify(r.fr)}],`);
    return;
  }

  // ─── DIAG --ratio : détecteur de ratio EN/FR par sort ──────────────────────────
  // Chaque sort comparé À SA PROPRE traduction (pas à une moyenne globale).
  // Le FR SRD est régulièrement plus long que l'EN ; on mesure la distribution
  // empirique (médiane + MAD) et on flague les sorts hors bande robuste, plus
  // tout champ vide/quasi-vide (signature d'un bleed de colonne qui a aspiré le
  // texte vers le sort voisin).
  if (process.argv.includes('--ratio')) {
    const ratios = paired
      .filter((p) => p.en.description.length > 50 && p.fr.description.length > 50)
      .map((p) => p.fr.description.length / p.en.description.length);
    const sorted = [...ratios].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mad =
      [...ratios].map((r) => Math.abs(r - median)).sort((a, b) => a - b)[Math.floor(ratios.length / 2)];
    const lo = median - 4 * mad;
    const hi = median + 4 * mad;
    console.log(`[ratio] médiane FR/EN=${median.toFixed(3)} · MAD=${mad.toFixed(3)} · bande robuste [${lo.toFixed(3)}, ${hi.toFixed(3)}] (médiane ±4·MAD)`);

    interface RatioFlag {
      id: string;
      nameFr: string;
      nameEn: string;
      enLen: number;
      frLen: number;
      ratio: number;
      kind: string;
    }
    const flags: RatioFlag[] = [];
    for (const { en, fr } of paired) {
      const enLen = en.description.length;
      const frLen = fr.description.length;
      // Champ vide / quasi-vide : signature directe d'un bleed.
      if (enLen < 50 || frLen < 50) {
        flags.push({ id: slug(fr.name), nameFr: fr.name, nameEn: en.name, enLen, frLen, ratio: frLen / (enLen || 1), kind: enLen < 50 ? 'EN quasi-vide' : 'FR quasi-vide' });
        continue;
      }
      const ratio = frLen / enLen;
      if (ratio < lo) flags.push({ id: slug(fr.name), nameFr: fr.name, nameEn: en.name, enLen, frLen, ratio, kind: 'EN gonflé (bleed/statblock EN ?)' });
      else if (ratio > hi) flags.push({ id: slug(fr.name), nameFr: fr.name, nameEn: en.name, enLen, frLen, ratio, kind: 'FR gonflé (bleed/statblock FR ?)' });
    }
    flags.sort((a, b) => a.ratio - b.ratio);
    console.log(`\n[ratio] === sorts hors bande / champ vide : ${flags.length} ===`);
    for (const f of flags)
      console.log(`  • ${f.nameFr} / ${f.nameEn} [${f.id}] — ${f.kind} — EN=${f.enLen} FR=${f.frLen} ratio=${f.ratio.toFixed(2)}`);
    return;
  }

  // Moyennes de longueur (pour heuristique « longueur anormale »).
  const descLens = paired.map((p) => p.fr.description.length);
  const upLens = paired.map((p) => p.fr.atHigherLevels?.length ?? 0).filter((n) => n > 0);
  const meanDesc = descLens.reduce((a, b) => a + b, 0) / descLens.length;
  const meanUp = upLens.reduce((a, b) => a + b, 0) / (upLens.length || 1);

  // Détection fallback.
  interface Candidate {
    id: string;
    nameFr: string;
    nameEn: string;
    reasons: string[];
  }
  const candidates: Candidate[] = [];
  for (const { en, fr } of paired) {
    const reasons: string[] = [];
    const allText = `${en.description} ${en.atHigherLevels ?? ''} ${fr.description} ${fr.atHigherLevels ?? ''}`;
    if (TABLE_GLUED_RE.test(en.description) || TABLE_GLUED_RE.test(fr.description))
      reasons.push('D-1 table aplatie');
    const sb = statblockMarkerCount(allText);
    if (sb >= 3) reasons.push(`D-2 statblock contaminant (${sb} marqueurs)`);
    if (en.description.length > 2 * meanDesc || fr.description.length > 2 * meanDesc)
      reasons.push(`longueur description anormale (${Math.max(en.description.length, fr.description.length)} > 2×${Math.round(meanDesc)})`);
    if ((en.atHigherLevels && en.atHigherLevels.length > 2 * meanUp) || (fr.atHigherLevels && fr.atHigherLevels.length > 2 * meanUp))
      reasons.push(`longueur upcast anormale (> 2×${Math.round(meanUp)})`);
    if (NAME_ARTIFACT_RE.test(en.name)) reasons.push(`nom EN artefacté ("${en.name}")`);
    if (NAME_ARTIFACT_RE.test(fr.name)) reasons.push(`nom FR artefacté ("${fr.name}")`);
    // Troncature mid-phrase RÉELLE : fin de champ sur ponctuation de liaison
    // (virgule / point-virgule / deux-points) ou trait d'union = phrase coupée
    // → perte de contenu .txt à une coupure de colonne (vérifier PDF).
    // NB : une fin sur lettre nue est cosmétique (point final perdu / item de
    //      liste à puces) — contenu complet, PAS flaggé (faux positifs écartés
    //      après vérif Chill Touch / Guards and Wards / Control Water / Ice Knife).
    const truncated = (t: string): boolean => /[,;:-]$/.test(t.trim());
    if (truncated(en.description) || truncated(fr.description))
      reasons.push('tronqué mid-phrase (perte .txt — vérifier PDF)');
    if (reasons.length) candidates.push({ id: slug(fr.name), nameFr: fr.name, nameEn: en.name, reasons });
  }

  candidates.sort((a, b) => a.nameFr.localeCompare(b.nameFr));

  const isLengthOnly = (c: Candidate): boolean => c.reasons.every((r) => r.startsWith('longueur'));
  const tierA = candidates.filter((c) => !isLengthOnly(c)); // défaut structurel confirmé → A1
  const tierB = candidates.filter(isLengthOnly); // anomalie de longueur seule → revue (souvent légitime)

  console.log(`\n[bootstrap] === TIER A — défaut confirmé, fallback A1 requis : ${tierA.length} ===`);
  for (const c of tierA) console.log(`  • ${c.nameFr} / ${c.nameEn} [${c.id}] — ${c.reasons.join(' ; ')}`);
  console.log(`\n[bootstrap] === TIER B — anomalie de longueur (revue, souvent prose longue légitime) : ${tierB.length} ===`);
  for (const c of tierB) console.log(`  • ${c.nameFr} / ${c.nameEn} [${c.id}] — ${c.reasons.join(' ; ')}`);
  console.log(`\n[bootstrap] total candidats=${candidates.length} (A=${tierA.length} défauts · B=${tierB.length} revue-longueur)`);
  console.log(`[bootstrap] moyennes : description=${Math.round(meanDesc)} car · upcast=${Math.round(meanUp)} car`);

  if (unpaired.length) {
    console.log(`\n[bootstrap] ⚠ EN orphelins (pairing échoué) :`);
    for (const u of unpaired) console.log(`  • ${u.name} (L${u.level} ${u.school} ${u.classIds.join('/')})`);
  }

  const dumpArg = process.argv.find((a) => a.startsWith('--dump='));
  if (dumpArg) {
    const needle = dumpArg.slice('--dump='.length).toLowerCase();
    for (const { en, fr } of paired.filter(
      (p) => p.en.name.toLowerCase().includes(needle) || p.fr.name.toLowerCase().includes(needle),
    )) {
      console.log('\n══════════════════════════════════════════════');
      console.log(JSON.stringify({ en, fr }, null, 2));
    }
    return;
  }

  if (!emit) {
    console.log('\n[bootstrap] mode diagnostic (pas d\'écriture). Relancer avec --emit pour générer le module.');
    return;
  }

  // Génération du module TS.
  const entries = paired
    .map(({ en, fr }) => ({
      id: slug(fr.name),
      nameFr: fr.name,
      nameEn: en.name,
      level: en.level,
      school: en.school,
      castingTimeFr: fr.castingTime,
      castingTimeEn: en.castingTime,
      rangeFr: fr.range,
      rangeEn: en.range,
      v: en.v,
      s: en.s,
      m: en.m,
      materialFr: fr.material,
      materialEn: en.material,
      durationFr: fr.duration,
      durationEn: en.duration,
      concentration: en.concentration,
      ritual: en.ritual,
      descriptionFr: fr.description,
      descriptionEn: en.description,
      atHigherFr: fr.atHigherLevels,
      atHigherEn: en.atHigherLevels,
      classes: en.classIds,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const body = entries
    .map((e) => {
      const j = (v: string | null): string => (v === null ? 'null' : JSON.stringify(v));
      const material =
        e.m && (e.materialFr || e.materialEn)
          ? `, material: { fr: ${j(e.materialFr)}, en: ${j(e.materialEn)} }`
          : '';
      const atHigher =
        e.atHigherFr || e.atHigherEn
          ? `{ fr: ${j(e.atHigherFr)}, en: ${j(e.atHigherEn)} }`
          : 'null';
      return `  {
    id: ${JSON.stringify(e.id)},
    name: { fr: ${j(e.nameFr)}, en: ${j(e.nameEn)} },
    level: ${e.level},
    school: ${JSON.stringify(e.school)},
    castingTime: { fr: ${j(e.castingTimeFr)}, en: ${j(e.castingTimeEn)} },
    range: { fr: ${j(e.rangeFr)}, en: ${j(e.rangeEn)} },
    components: { v: ${e.v}, s: ${e.s}, m: ${e.m}${material} },
    duration: { fr: ${j(e.durationFr)}, en: ${j(e.durationEn)} },
    concentration: ${e.concentration},
    ritual: ${e.ritual},
    description: { fr: ${j(e.descriptionFr)}, en: ${j(e.descriptionEn)} },
    atHigherLevels: ${atHigher},
    classes: ${JSON.stringify(e.classes)},
    source: 'srd-5.2.1',
  },`;
    })
    .join('\n');

  const module = `/**
 * SRD 5.2.1 — Sorts, bilingue (FR + EN). ${entries.length} entrées.
 *
 * ⚠️ GÉNÉRÉ par \`scripts/bootstrap-srd-spells.ts\` (one-shot) depuis
 *    \`content-sources/extracted/raw/{SRD,FR_SRD}_CC_v5.2.1.txt\`.
 *    Devenu source CANONIQUE (révisable à la main) : l'extracteur récurrent
 *    \`extract-srd-spells.ts\` importe ce module et ne relit jamais le texte.
 *    Conforme à « Sources SRD CC légitimes (LOCKED) » (CLAUDE.md).
 *
 * Corrections fallback A1 (parser garbled) : annoter chaque entrée corrigée à la
 * main d'un commentaire \`// fallback A1 — vérifié contre FR_SRD_CC_v5.2.1.txt:LIGNE\`.
 */
import type { Spell } from '../../src/shared/types/content';

export const SRD_SPELLS: Spell[] = [
${body}
];

export const SRD_SPELLS_COUNTS = {
  total: ${entries.length},
} as const;
`;

  writeFileSync(OUT_MODULE, module, 'utf-8');
  console.log(`\n[bootstrap] ✅ écrit ${OUT_MODULE} (${entries.length} sorts).`);
}

main();
