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

  // ─── Niveau 3 (pilotes commit 1) ──────────────────────────────────────
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

  // ─── Cantrips (suite) ─────────────────────────────────────────────────
  // Acid Splash — 1d6 acide, save DEX, scaling cantrip standard.
  'aspersion-acide': [
    dmg('1d6', 'acid', {
      resolution: 'saving-throw',
      cantripScaling: cantripScaling('2d6', '3d6', '4d6'),
    }),
  ],
  // Chill Touch — 1d10 nécrotiques, attaque corps-à-corps (melee spell attack
  // SRD 2024, contrairement à 2014 ranged), scaling cantrip standard.
  'contact-glacial': [
    dmg('1d10', 'necrotic', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d10', '3d10', '4d10'),
    }),
  ],
  // Vicious Mockery — 1d6 psychiques, save WIS, scaling cantrip + désavantage
  // sur la prochaine attaque (effet secondaire non encodé en formule).
  'moquerie-cruelle': [
    dmg('1d6', 'psychic', {
      resolution: 'saving-throw',
      cantripScaling: cantripScaling('2d6', '3d6', '4d6'),
    }),
  ],
  // Shocking Grasp — 1d8 foudre, attaque corps-à-corps, scaling cantrip.
  'poigne-electrique': [
    dmg('1d8', 'lightning', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d8', '3d8', '4d8'),
    }),
  ],
  // Starry Wisp — 1d8 radiants, attaque à distance, scaling cantrip
  // (cantrip 2024 Bard, remplace certains cantrips utilitaires).
  'poussiere-d-etoile': [
    dmg('1d8', 'radiant', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d8', '3d8', '4d8'),
    }),
  ],
  // Produce Flame — 1d8 feu (jet à distance via action Magie tant que le sort
  // dure), scaling cantrip standard.
  'flammes': [
    dmg('1d8', 'fire', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d8', '3d8', '4d8'),
    }),
  ],

  // ─── Niveau 1 (suite) ─────────────────────────────────────────────────
  // Inflict Wounds — 2d10 nécrotiques, save CON, +1d10/niveau.
  'blessure': [
    dmg('2d10', 'necrotic', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
    }),
  ],
  // Searing Smite — sort-bouclier qui ajoute 1d6 feu à une attaque qui touche,
  // puis 1d6 par tour tant que la cible rate son save. Pas de jet d'attaque
  // propre (le sort répond à une attaque réussie).
  'chatiment-de-fournaise': [
    dmg('1d6', 'fire', {
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Ajout aux dégâts d’une attaque qui touche, puis 1d6 supplémentaires à chaque tour de la cible jusqu’à ce qu’elle réussisse un jet de sauvegarde de Constitution.',
        en: 'Added to a hit, then 1d6 again each of the target’s turns until it succeeds on a Constitution save.',
      },
    }),
  ],
  // Ice Knife — 1d10 perforants à l'attaque + 2d6 froid en splash si touche
  // ou rate, save DEX. Première entrée = perforants (attaque), seconde = froid
  // (save). +1d6 froid par niveau d'emplacement au-dessus du 1er.
  'couteau-de-glace': [
    dmg('1d10', 'piercing', {
      resolution: 'attack-roll',
    }),
    dmg('2d6', 'cold', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'L’éclat explose après l’attaque (touchée ou ratée) ; la cible et chaque créature à 1,50 m d’elle tente un jet de sauvegarde de Dextérité.',
        en: 'The shard explodes after the attack (hit or miss); the target and each creature within 5 ft makes a Dexterity save.',
      },
    }),
  ],
  // Ray of Sickness — 2d8 poison, attaque à distance, +1d8/niveau.
  'rayon-empoisonne': [
    dmg('2d8', 'poison', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d8' },
    }),
  ],
  // Guiding Bolt — 4d6 radiants, attaque à distance, +1d6/niveau.
  'rayon-tracant': [
    dmg('4d6', 'radiant', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d6' },
    }),
  ],
  // Hellish Rebuke — 2d10 feu, save DEX (réaction), +1d10/niveau.
  'represailles-infernales': [
    dmg('2d10', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
    }),
  ],
  // Dissonant Whispers — 2d6 psychiques, save WIS, +1d6/niveau.
  'murmures-dissonants': [
    dmg('3d6', 'psychic', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
    }),
  ],

  // ─── Niveau 2 ─────────────────────────────────────────────────────────
  // Melf's Acid Arrow — 4d4 acide initial, attaque à distance + 2d4 retardés
  // tour suivant. +1d4 (initial ET retardé) par niveau.
  'fleche-acide': [
    dmg('4d4', 'acid', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d4' },
    }),
    dmg('2d4', 'acid', {
      atHigherLevels: { perLevel: '+1d4' },
      condition: {
        fr: 'Dégâts retardés appliqués automatiquement à la fin du prochain tour de la cible.',
        en: 'Delayed damage applied automatically at the end of the target’s next turn.',
      },
    }),
  ],
  // Shatter — 3d8 tonnerre, save CON, +1d8/niveau.
  'fracassement': [
    dmg('3d8', 'thunder', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
    }),
  ],
  // Scorching Ray — 2d6 feu × 3 rayons (chacun = jet d'attaque). +1 rayon par
  // niveau au-dessus du 2e (dés par rayon constants).
  'rayon-ardent': [
    dmg('2d6', 'fire', {
      resolution: 'attack-roll',
      condition: {
        fr: '3 rayons au niveau 2 ; +1 rayon par niveau d’emplacement au-dessus du 2e. Chaque rayon nécessite son propre jet d’attaque de sort.',
        en: '3 rays at level 2; +1 ray per spell slot level above 2. Each ray requires its own spell attack roll.',
      },
    }),
  ],
  // Flaming Sphere — 2d6 feu, save DEX, +1d6/niveau.
  'sphere-de-feu': [
    dmg('2d6', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
    }),
  ],
  // Dragon's Breath — 3d6 du type au choix (acide/froid/feu/foudre/poison),
  // save DEX, +1d6/niveau. Le type est choisi par le joueur à l'incantation ;
  // on encode `fire` comme valeur par défaut + condition explicative.
  'souffle-du-dragon': [
    dmg('3d6', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Type au choix à l’incantation : acide, froid, feu, foudre ou poison. L’UI affichera le type sélectionné par le joueur ; le type figé ici (feu) est un défaut éditorial.',
        en: 'Damage type chosen at casting from: acid, cold, fire, lightning, or poison. UI shows the selected type; “fire” here is an editorial default.',
      },
    }),
  ],

  // ─── Niveau 3 (suite) ─────────────────────────────────────────────────
  // Call Lightning — 3d10 foudre, save DEX, +1d10/niveau.
  'appel-de-la-foudre': [
    dmg('3d10', 'lightning', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
    }),
  ],
  // Vampiric Touch — 3d6 nécrotiques, attaque corps-à-corps, +1d6/niveau ;
  // soigne la moitié des dégâts infligés.
  'caresse-du-vampire': [
    dmg('3d6', 'necrotic', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d6' },
    }),
  ],

  // ─── Niveau 4 ─────────────────────────────────────────────────────────
  // Blight — 8d8 nécrotiques, save CON, +1d8/niveau.
  'fletrissement': [
    dmg('8d8', 'necrotic', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
    }),
  ],
  // Wall of Fire — 5d8 feu pour les créatures dans/qui traversent le mur,
  // save DEX, +1d8/niveau.
  'mur-de-feu': [
    dmg('5d8', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
    }),
  ],
  // Vitriolic Sphere — 10d4 acide initial, save DEX, +2d4/niveau (initial).
  'sphere-de-vitriol': [
    dmg('10d4', 'acid', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+2d4' },
    }),
  ],
  // Ice Storm — 2d10 contondants + 4d6 froid, save DEX, +1d10 contondants/niveau.
  'tempete-de-grele': [
    dmg('2d10', 'bludgeoning', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
    }),
    dmg('4d6', 'cold', {
      resolution: 'saving-throw',
    }),
  ],

  // ─── Niveau 5 ─────────────────────────────────────────────────────────
  // Cone of Cold — 8d8 froid, save CON, +1d8/niveau.
  'cone-de-froid': [
    dmg('8d8', 'cold', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
    }),
  ],
  // Insect Plague — 4d10 perforants, save CON, +1d10/niveau.
  'fleau-d-insectes': [
    dmg('4d10', 'piercing', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
    }),
  ],

  // ─── Niveau 6 ─────────────────────────────────────────────────────────
  // Chain Lightning — 10d8 foudre à la cible principale, save DEX, +1 cible
  // de rebond par niveau au-dessus du 6e.
  'chaine-d-eclairs': [
    dmg('10d8', 'lightning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'La cible principale subit les dégâts ; 3 éclairs supplémentaires bondissent vers d’autres cibles à 9 m, chacune subissant les mêmes dégâts (sauvegarde de Dextérité pour moitié).',
        en: 'Primary target takes the damage; 3 additional bolts leap to other targets within 30 ft, each taking the same damage (Dex save for half).',
      },
    }),
  ],
  // Sunbeam — 6d8 radiants, save CON.
  'rayon-de-soleil': [
    dmg('6d8', 'radiant', {
      resolution: 'saving-throw',
    }),
  ],

  // ─── Niveau 7 ─────────────────────────────────────────────────────────
  // Fire Storm — 7d10 feu, save DEX.
  'tempete-de-feu': [
    dmg('7d10', 'fire', {
      resolution: 'saving-throw',
    }),
  ],

  // ─── Niveau 8 ─────────────────────────────────────────────────────────
  // Befuddlement — 10d12 psychiques, save INT (pas de scaling, sort de L8).
  'alienation': [
    dmg('10d12', 'psychic', {
      resolution: 'saving-throw',
    }),
  ],
  // Incendiary Cloud — 10d8 feu, save DEX.
  'nuage-incendiaire': [
    dmg('10d8', 'fire', {
      resolution: 'saving-throw',
    }),
  ],

  // ─── Niveau 9 ─────────────────────────────────────────────────────────
  // Meteor Swarm — 20d6 feu + 20d6 contondants par météore (4 météores), save DEX.
  'nuee-de-meteores': [
    dmg('20d6', 'fire', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Quatre météores impactent ; chaque créature dans une zone de 12 m subit les dégâts indiqués (les zones se chevauchent : on roule une seule fois par créature, pas une fois par météore).',
        en: 'Four meteors strike; each creature in a 40-ft Sphere takes the listed damage (areas overlapping deal damage once).',
      },
    }),
    dmg('20d6', 'bludgeoning', {
      resolution: 'saving-throw',
    }),
  ],
  // Storm of Vengeance — 2d6 tonnerre à l'incantation, puis évolution multi-tours
  // (grêle, foudre, acide, vent) non encodée en formule simple.
  'tempete-vengeresse': [
    dmg('2d6', 'thunder', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Effet d’apparition uniquement. Aux tours suivants, le sort produit grêle, foudres, acide et vents puissants — voir la description complète du sort.',
        en: 'Onset effect only. On subsequent rounds, the spell produces hail, lightning, acid, and powerful winds — see full spell description.',
      },
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
