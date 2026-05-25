/**
 * SRD 5.2.1 — Mapping des dégâts canoniques par sort (plan D1).
 *
 * Hand-curated, sourcé du SRD 5.2.1 CC EN (`SRD_CC_v5.2.1.pdf`). Chaque entrée
 * est annotée d'un commentaire `// SRD p.XXX` quand la formule a été vérifiée
 * contre la page du PDF, ou d'une note d'arbitrage si nécessaire.
 *
 * **Structure :**
 *   - Clé = slug FR du sort dans `srd-spells.ts` (id du bundle).
 *   - Valeur = `SpellDamage[]` (tableau, plusieurs types possibles).
 *
 * **Périmètre commit 1** : 10 sorts pilotes couvrant les patterns canoniques :
 *   - Cantrips avec attack-roll (Fire Bolt, Ray of Frost, Eldritch Blast)
 *   - Cantrips avec save (Sacred Flame, Poison Spray)
 *   - L1 AoE save half (Burning Hands, Thunderwave)
 *   - Auto-hit avec condition (Magic Missile)
 *   - AoE upcast slot (Fireball L3, Lightning Bolt L3)
 *
 * Les commits 2+ étendent à ~70-80 sorts supplémentaires.
 *
 * Source : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` (texte SRD EN),
 *          vérifié contre `SRD_CC_v5.2.1.pdf` pour les cas ambigus.
 * Conforme à « Politique de contenu (LOCKED) » (CLAUDE.md) — aucune lecture
 * AideDD.
 */
import type { SpellDamage } from '../../src/shared/types/content';

// Labels i18n FR/EN pour les types de dégâts. Centralisés ici plutôt que
// répétés à chaque entrée — évite les divergences orthographiques d'un sort à
// l'autre. Source FR : SRD 5.2.1 FR (« Types de dégâts »).
export const DAMAGE_TYPE_LABELS = {
  acid: { fr: 'acide', en: 'Acid' },
  bludgeoning: { fr: 'contondants', en: 'Bludgeoning' },
  cold: { fr: 'froid', en: 'Cold' },
  fire: { fr: 'feu', en: 'Fire' },
  force: { fr: 'force', en: 'Force' },
  lightning: { fr: 'foudre', en: 'Lightning' },
  necrotic: { fr: 'nécrotiques', en: 'Necrotic' },
  piercing: { fr: 'perforants', en: 'Piercing' },
  poison: { fr: 'poison', en: 'Poison' },
  psychic: { fr: 'psychiques', en: 'Psychic' },
  radiant: { fr: 'radiants', en: 'Radiant' },
  slashing: { fr: 'tranchants', en: 'Slashing' },
  thunder: { fr: 'tonnerre', en: 'Thunder' },
} as const;

type DamageTypeKey = keyof typeof DAMAGE_TYPE_LABELS;

/** Helper : construit une entrée `SpellDamage` minimale. */
function dmg(
  formula: string,
  type: DamageTypeKey,
  opts: Omit<SpellDamage, 'formula' | 'type' | 'typeLabel'> = {},
): SpellDamage {
  return {
    formula,
    type,
    typeLabel: DAMAGE_TYPE_LABELS[type],
    ...opts,
  };
}

/**
 * Table SRD 5.2.1 « Cantrip Damage » (PHB p.10) :
 *   L1-4   = 1 die
 *   L5-10  = 2 dice
 *   L11-16 = 3 dice
 *   L17-20 = 4 dice
 * Helper factorisé pour ne pas répéter les seuils sur chaque cantrip.
 */
function cantripScaling(diceAtL5: string, diceAtL11: string, diceAtL17: string) {
  return { tier5: diceAtL5, tier11: diceAtL11, tier17: diceAtL17 };
}

/**
 * Damage entries indexées par slug FR. Un slug absent = pas de mapping
 * canonique (le sort est utilitaire ou son pattern de dégâts n'est pas encore
 * couvert par le plan D1).
 */
export const SRD_SPELL_DAMAGE: Readonly<Record<string, readonly SpellDamage[]>> = {
  // ─── Cantrips ───────────────────────────────────────────────────────
  // Fire Bolt — SRD CC : « Make a ranged spell attack against the target. On
  // a hit, the target takes 1d10 Fire damage. Cantrip Upgrade. The damage
  // increases by 1d10 when you reach levels 5 (2d10), 11 (3d10), and 17 (4d10). »
  'trait-de-feu': [
    dmg('1d10', 'fire', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d10', '3d10', '4d10'),
    }),
  ],
  // Ray of Frost — SRD CC : « Make a ranged spell attack against the target.
  // On a hit, the target takes 1d8 Cold damage, and its Speed is reduced by
  // 10 feet until the start of your next turn. Cantrip Upgrade. 1d8/L5… »
  'rayon-de-givre': [
    dmg('1d8', 'cold', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d8', '3d8', '4d8'),
    }),
  ],
  // Eldritch Blast — SRD CC : « Make a ranged spell attack against the target.
  // On a hit, the target takes 1d10 Force damage. Cantrip Upgrade. You create
  // more than one beam… 2 beams at L5, 3 at L11, 4 at L17. » Le nombre de
  // rayons scale ; chaque rayon reste 1d10 — encodé via `condition` pour le
  // surplus de rayons + cantripScaling pour le nombre total de dés.
  'decharge-occulte': [
    dmg('1d10', 'force', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d10', '3d10', '4d10'),
      condition: {
        fr: 'Un rayon par tier (1 à L1-4, 2 à L5-10, 3 à L11-16, 4 à L17+) ; chaque rayon inflige 1d10 dégâts de force et nécessite son propre jet d’attaque de sort.',
        en: 'One beam per tier (1 at L1-4, 2 at L5-10, 3 at L11-16, 4 at L17+); each beam deals 1d10 Force damage and requires its own ranged spell attack roll.',
      },
    }),
  ],
  // Sacred Flame — SRD CC : « The target must succeed on a Dexterity saving
  // throw or take 1d8 Radiant damage. […] no benefit from Cover. Cantrip
  // Upgrade. 1d8/L5… »
  'flamme-sacree': [
    dmg('1d8', 'radiant', {
      resolution: 'saving-throw',
      cantripScaling: cantripScaling('2d8', '3d8', '4d8'),
    }),
  ],
  // Poison Spray — SRD CC : « The target must succeed on a Constitution
  // saving throw or take 1d12 Poison damage. Cantrip Upgrade. 1d12/L5… »
  'bouffee-de-poison': [
    dmg('1d12', 'poison', {
      resolution: 'saving-throw',
      cantripScaling: cantripScaling('2d12', '3d12', '4d12'),
    }),
  ],

  // ─── Niveau 1 ───────────────────────────────────────────────────────
  // Magic Missile — SRD CC : « You create three glowing darts. Each dart hits
  // a creature […] dealing 1d4+1 Force damage. Using a Higher-Level Spell Slot.
  // The spell creates one more dart for each spell slot level above 1. »
  // Pas de jet d'attaque (auto-hit), pas de jet de sauvegarde. La formule
  // dépend du nombre de projectiles ; on stocke le « par-projectile » comme
  // `formula` + le scaling « 1 projectile/niv. » côté `condition`.
  'projectile-magique': [
    dmg('1d4+1', 'force', {
      resolution: 'auto',
      condition: {
        fr: '3 projectiles à l’incantation au niveau 1 ; +1 projectile par niveau d’emplacement au-dessus du 1er. Chaque projectile inflige 1d4+1 dégâts de force, sans jet d’attaque ni de sauvegarde.',
        en: '3 darts at base; +1 dart per spell slot level above 1. Each dart deals 1d4+1 Force damage, no attack roll, no saving throw.',
      },
    }),
  ],
  // Burning Hands — SRD CC : « Each creature in a 15-foot Cone makes a
  // Dexterity saving throw, taking 3d6 Fire damage on a failed save or half
  // as much damage on a successful one. Using a Higher-Level Spell Slot. +1d6
  // per slot level above 1. »
  'mains-brulantes': [
    dmg('3d6', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
    }),
  ],
  // Thunderwave — SRD CC : « Each creature in a 15-foot Cube makes a
  // Constitution saving throw, taking 2d8 Thunder damage […] half on
  // success. +1d8/slot level above 1. »
  'vague-tonnante': [
    dmg('2d8', 'thunder', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
    }),
  ],

  // ─── Niveau 3 ───────────────────────────────────────────────────────
  // Fireball — SRD CC : « Each creature in a 20-foot-radius Sphere […]
  // Dexterity saving throw, taking 8d6 Fire damage on a failed save or half
  // as much damage on a successful one. +1d6/slot level above 3. »
  'boule-de-feu': [
    dmg('8d6', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
    }),
  ],
  // Lightning Bolt — SRD CC : « Each creature in a 100-foot-long, 5-foot-wide
  // Line […] Dexterity saving throw, taking 8d6 Lightning damage […] half on
  // success. +1d6/slot level above 3. »
  'eclair': [
    dmg('8d6', 'lightning', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
    }),
  ],
};

/**
 * Liste des slugs présents — utile pour les tests de couverture qui veulent
 * vérifier qu'un sort spécifique a bien été curé sans avoir à scanner le
 * record entier.
 */
export const SRD_SPELL_DAMAGE_SLUGS: readonly string[] = Object.keys(
  SRD_SPELL_DAMAGE,
);
