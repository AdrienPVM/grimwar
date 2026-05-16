/**
 * Canonical dicts SRD 5.2.1 EN ↔ FR — armes & armures.
 *
 * STRICTEMENT FERMÉS — toute valeur hors de ces sets fait échouer le parser
 * (fail-loud). Pas de fuzzy matching. Pas de complétion implicite.
 *
 * Source : tableaux "Weapons" / "Armor" du SRD 5.2.1 EN + leur miroir FR.
 */

// ─── Damage types ────────────────────────────────────────────────────────────

export const DAMAGE_TYPE_EN_FR: Record<string, string> = {
  Bludgeoning: 'contondants',
  Piercing: 'perforants',
  Slashing: 'tranchants',
};
export const DAMAGE_TYPE_FR_EN: Record<string, string> = invert(DAMAGE_TYPE_EN_FR);

// Sarbacane (blowgun) : "1 Piercing" en EN devient "1 perforant" (singulier).
export const DAMAGE_TYPE_SINGULAR_FR_EN: Record<string, string> = {
  perforant: 'Piercing',
  contondant: 'Bludgeoning',
  tranchant: 'Slashing',
};

// ─── Weapon masteries (SRD 2024 — 8 masteries fermées) ──────────────────────

export const MASTERY_EN_FR: Record<string, string> = {
  Cleave: 'Enchaînement',
  Graze: 'Écorchure',
  Nick: 'Coup double',
  Push: 'Poussée',
  Sap: 'Sape',
  Slow: 'Ralentissement',
  Topple: 'Renversement',
  Vex: 'Ouverture',
};
export const MASTERY_FR_EN: Record<string, string> = invert(MASTERY_EN_FR);

// Détecter Mastery dans le texte raw, où kerning peut introduire des espaces :
// "To p p le" → "Topple", "Tr ide nt" → ne PAS toucher (c'est le NOM de l'arme).
// La normalisation se fait uniquement sur les valeurs candidate de mastery.
export function normalizeMasteryEn(raw: string): string | null {
  const collapsed = raw.replace(/\s+/g, '').toLowerCase();
  for (const m of Object.keys(MASTERY_EN_FR)) {
    if (collapsed === m.toLowerCase()) return m;
  }
  return null;
}
export function normalizeMasteryFr(raw: string): string | null {
  const collapsed = raw.replace(/\s+/g, '').toLowerCase();
  for (const m of Object.keys(MASTERY_FR_EN)) {
    if (collapsed === m.replace(/\s+/g, '').toLowerCase()) return m;
  }
  return null;
}

// ─── Weapon properties (SRD 2024 — fermées) ─────────────────────────────────

export const WEAPON_PROPERTY_EN_FR: Record<string, string> = {
  Ammunition: 'Munitions',
  Finesse: 'Finesse',
  Heavy: 'Lourde',
  Light: 'Légère',
  Loading: 'Chargement',
  Reach: 'Allonge',
  Thrown: 'Lancer',
  'Two-Handed': 'Deux mains',
  Versatile: 'Polyvalente',
};
export const WEAPON_PROPERTY_FR_EN: Record<string, string> = invert(
  WEAPON_PROPERTY_EN_FR,
);

// ─── Armor categories ───────────────────────────────────────────────────────

export const ARMOR_CATEGORY_EN_FR: Record<string, string> = {
  'Light Armor': 'Armures légères',
  'Medium Armor': 'Armures intermédiaires',
  'Heavy Armor': 'Armures lourdes',
  Shield: 'Bouclier',
};
export const ARMOR_CATEGORY_FR_EN: Record<string, string> = invert(
  ARMOR_CATEGORY_EN_FR,
);

// ─── Coin units (FR ↔ EN, valeurs numériques identiques) ────────────────────

export const COIN_EN_FR: Record<string, string> = {
  CP: 'pc',
  SP: 'pa',
  EP: 'pe',
  GP: 'po',
  PP: 'pp',
};
export const COIN_FR_EN: Record<string, string> = invert(COIN_EN_FR);

export type CoinCanonical = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
export function coinCanonicalFromEn(en: string): CoinCanonical {
  const map: Record<string, CoinCanonical> = {
    CP: 'cp',
    SP: 'sp',
    EP: 'ep',
    GP: 'gp',
    PP: 'pp',
  };
  const c = map[en.toUpperCase()];
  if (!c) throw new Error(`Unknown EN coin: ${en}`);
  return c;
}
export function coinCanonicalFromFr(fr: string): CoinCanonical {
  const map: Record<string, CoinCanonical> = {
    pc: 'cp',
    pa: 'sp',
    pe: 'ep',
    po: 'gp',
    pp: 'pp',
  };
  const c = map[fr.toLowerCase()];
  if (!c) throw new Error(`Unknown FR coin: ${fr}`);
  return c;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function invert(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) out[v] = k;
  return out;
}
