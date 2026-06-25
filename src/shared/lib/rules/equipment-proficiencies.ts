/**
 * Maîtrises d'équipement (armures / armes / outils) — agrégateur d'affichage.
 *
 * Le bundle `classes.json` porte ces maîtrises sous forme de chaînes anglaises
 * BRUTES et partiellement corrompues par l'extraction PDF :
 *   • « Light » vs « Light armor », « Medium » vs « Medium armor » ;
 *   • « Heavy ar- mor » (artefact de césure) ;
 *   • Roublard : « Martial weapons that have the Finesse or Light property »
 *     éclatée en DEUX éléments de tableau (« …Finesse » + « Light property »).
 * On ne touche PAS au bundle (path protégé) : ce module est l'unique endroit
 * qui comprend ces variantes et les réduit à des slugs canoniques, puis mappe
 * vers des libellés FR officiels.
 *
 * Source des libellés FR : SRD 5.2.1 FR (`FR_SRD_CC_v5.2.1.txt`). Termes
 * vérifiés : « Armures légères / intermédiaires / lourdes », « Boucliers »,
 * « Armes courantes », « Armes de guerre », « dotées de la propriété
 * Finesse / Légère », « outils de voleur », « matériel d'herboriste »,
 * « instrument de musique », « outils d'artisan ».
 *
 * Fonctions pures, pas d'effet de bord — testables en isolation.
 */

export type ArmorProfSlug = 'light' | 'medium' | 'heavy' | 'shields';
export type WeaponProfSlug =
  | 'simple'
  | 'martial'
  | 'martial-light'
  | 'martial-finesse-or-light';

/** Ordre d'affichage canonique (du plus léger au plus lourd). */
const ARMOR_ORDER: readonly ArmorProfSlug[] = ['light', 'medium', 'heavy', 'shields'];
const WEAPON_ORDER: readonly WeaponProfSlug[] = [
  'simple',
  'martial',
  'martial-light',
  'martial-finesse-or-light',
];

export const ARMOR_PROF_FR: Record<ArmorProfSlug, string> = {
  light: 'Armures légères',
  medium: 'Armures intermédiaires',
  heavy: 'Armures lourdes',
  shields: 'Boucliers',
};

export const WEAPON_PROF_FR: Record<WeaponProfSlug, string> = {
  simple: 'Armes courantes',
  martial: 'Armes de guerre',
  'martial-light': 'Armes de guerre dotées de la propriété Légère',
  'martial-finesse-or-light':
    'Armes de guerre dotées de la propriété Finesse ou Légère',
};

/** Une chaîne brute d'armure → slug canonique, ou null (« None » / inconnu). */
export function normalizeArmorProficiency(raw: string): ArmorProfSlug | null {
  const s = raw.toLowerCase();
  if (s.includes('none')) return null;
  if (s.includes('heavy')) return 'heavy'; // gère « Heavy ar- mor »
  if (s.includes('medium')) return 'medium';
  if (s.includes('shield')) return 'shields';
  if (s.includes('light')) return 'light'; // « Light » / « Light armor »
  return null;
}

/**
 * Tableau brut d'armes → slugs canoniques (dédupliqués, ordre préservé).
 *
 * Gère le split Roublard : « …Finesse » devient `martial-finesse-or-light`,
 * et le fragment orphelin « Light property » est absorbé (return null implicite).
 * Distingue le Moine (« Martial weapons that have the Light property » → entier)
 * du Roublard (fragment seul).
 */
export function normalizeWeaponProficiencies(raw: readonly string[]): WeaponProfSlug[] {
  const out: WeaponProfSlug[] = [];
  for (const r of raw) {
    const s = r.trim().toLowerCase();
    if (s.includes('finesse')) {
      out.push('martial-finesse-or-light');
    } else if (s.includes('martial') && s.includes('light')) {
      out.push('martial-light');
    } else if (s === 'light property') {
      // Fragment du split Roublard (« …Finesse or Light property ») — absorbé.
      continue;
    } else if (s.includes('martial')) {
      out.push('martial');
    } else if (s.includes('simple')) {
      out.push('simple');
    }
  }
  return [...new Set(out)];
}

/**
 * Chaîne brute d'outil de CLASSE (anglais libre) → libellé FR officiel, ou null.
 * Les outils de BACKGROUND sont des slugs d'objets, résolus séparément via
 * `items.json` (cf. `resolveCharacterProficiencies` > `resolveItemName`).
 */
export function normalizeClassToolLabel(raw: string): string | null {
  const s = raw.toLowerCase();
  if (s.includes('thiev')) return 'Outils de voleur';
  if (s.includes('herbal')) return "Matériel d'herboriste";
  if (s.includes('artisan')) return "Outils d'artisan (au choix)";
  if (s.includes('musical')) {
    return /\b3\b|three|trois/.test(s)
      ? 'Trois instruments de musique (au choix)'
      : 'Instrument de musique';
  }
  return null;
}

export interface ResolvedProficiencies {
  /** Libellés FR, ordre canonique. */
  armor: string[];
  weapons: string[];
  tools: string[];
}

export interface ProficiencySourceClass {
  armorProficiencies?: readonly string[];
  weaponProficiencies?: readonly string[];
  toolProficiencies?: readonly string[];
}

/**
 * Agrège les maîtrises d'équipement d'un personnage à l'affichage :
 *   • classes (chaînes brutes normalisées) ;
 *   • outils de background (slugs d'objets résolus en FR via `resolveItemName`) ;
 *   • maîtrises « extra » persistées (`character.extraProficiencies`) — armes/
 *     armures normalisées, outils résolus en objet sinon gardés littéraux.
 * Déduplique et trie selon l'ordre canonique. Aucun accès React/contenu : le
 * caller injecte le contenu déjà résolu → fonction pure et testable.
 */
export function resolveCharacterProficiencies(input: {
  classes: readonly ProficiencySourceClass[];
  backgroundToolSlugs?: readonly string[];
  resolveItemName: (slug: string) => string | null;
  extra?: {
    armor?: readonly string[];
    weapons?: readonly string[];
    tools?: readonly string[];
  };
}): ResolvedProficiencies {
  const armorSlugs = new Set<ArmorProfSlug>();
  const weaponSlugs = new Set<WeaponProfSlug>();
  const toolLabels: string[] = [];

  const addArmor = (raw: readonly string[] | undefined): void => {
    for (const a of raw ?? []) {
      const slug = normalizeArmorProficiency(a);
      if (slug) armorSlugs.add(slug);
    }
  };
  const addWeapons = (raw: readonly string[] | undefined): void => {
    for (const w of normalizeWeaponProficiencies(raw ?? [])) weaponSlugs.add(w);
  };

  for (const cls of input.classes) {
    addArmor(cls.armorProficiencies);
    addWeapons(cls.weaponProficiencies);
    for (const tl of cls.toolProficiencies ?? []) {
      const label = normalizeClassToolLabel(tl);
      if (label) toolLabels.push(label);
    }
  }

  for (const slug of input.backgroundToolSlugs ?? []) {
    const name = input.resolveItemName(slug);
    if (name) toolLabels.push(name);
  }

  if (input.extra) {
    addArmor(input.extra.armor);
    addWeapons(input.extra.weapons);
    for (const slug of input.extra.tools ?? []) {
      toolLabels.push(input.resolveItemName(slug) ?? slug);
    }
  }

  return {
    armor: ARMOR_ORDER.filter((s) => armorSlugs.has(s)).map((s) => ARMOR_PROF_FR[s]),
    weapons: WEAPON_ORDER.filter((s) => weaponSlugs.has(s)).map((s) => WEAPON_PROF_FR[s]),
    tools: [...new Set(toolLabels)],
  };
}
