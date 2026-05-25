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

  // ═══════════════════════════════════════════════════════════════════════
  // D1a — long-tail batch 1 : 6 sorts hand-curés contre SRD CC EN
  // (`SRD_CC_v5.2.1.txt`). Sélection « pattern existant + formule sans
  // ambiguïté ». Le reliquat (~75 sorts) reste sous-dette D1a en attendant
  // des batches dédiés (PDF SRD à re-vérifier sort par sort).
  // ═══════════════════════════════════════════════════════════════════════

  // Divine Favor — SRD CC L12080-12087 : « Until the spell ends, your attacks
  // with weapons deal an extra 1d4 Radiant damage on a hit. » Pas de scaling.
  // Rider sur attaque d'arme : pas de `resolution` (pas de jet propre — le
  // jet est celui de l'arme), `condition` explique le trigger.
  'faveur-divine': [
    dmg('1d4', 'radiant', {
      condition: {
        fr: 'S’ajoute aux dégâts de chaque attaque d’arme qui touche, tant que la concentration est maintenue.',
        en: 'Added to the damage of each weapon attack that hits while you maintain Concentration.',
      },
    }),
  ],
  // Divine Smite — SRD CC L12088-12100 : « The target takes an extra 2d8
  // Radiant damage from the attack. The damage increases by 1d8 if the target
  // is a Fiend or an Undead. Using a Higher-Level Spell Slot. The damage
  // increases by 1d8 for each spell slot level above 1. »
  // Rider sur coup d'arme : pas de `resolution` (le jet d'attaque est celui
  // de l'arme — le sort se cast en bonus action AVOIR touché). +1d8 vs
  // fiend/undead encodé dans `condition`, +1d8 par slot via `atHigherLevels`.
  'chatiment-divin': [
    dmg('2d8', 'radiant', {
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'S’ajoute aux dégâts d’une attaque d’arme de mêlée qui vient de toucher. +1d8 supplémentaire si la cible est un Fiélon ou un Mort-vivant. +1d8 par niveau d’emplacement au-dessus du 1er.',
        en: 'Added to a melee weapon attack that just hit. +1d8 more if the target is a Fiend or an Undead. +1d8 per spell slot level above 1.',
      },
    }),
  ],
  // Hex — SRD CC L13741-13758 : « Until the spell ends, you deal an extra
  // 1d6 Necrotic damage to the target whenever you hit it with an attack
  // roll. » Pas de scaling. Le « Using a Higher-Level Spell Slot » ne touche
  // QUE la durée de concentration (pas la formule).
  'malefice': [
    dmg('1d6', 'necrotic', {
      condition: {
        fr: 'S’ajoute aux dégâts à chaque coup d’une attaque (arme ou sort) qui touche la cible maudite, tant que la concentration est maintenue.',
        en: 'Added on each successful attack roll (weapon or spell) against the cursed target while you maintain Concentration.',
      },
    }),
  ],
  // Chromatic Orb — SRD CC L11012-11034 : « Choose Acid, Cold, Fire, Lightning,
  // Poison, or Thunder for the type of orb you create, and then make a ranged
  // spell attack against the target. On a hit, the target takes 3d8 damage of
  // the chosen type. […] Using a Higher-Level Spell Slot. The damage increases
  // by 1d8 for each spell slot level above 1. »
  // Pattern type-au-choix : on fige le type par défaut éditorial = `fire` et
  // on documente la liste dans `condition` (parité avec souffle-du-dragon).
  'orbe-chromatique': [
    dmg('3d8', 'fire', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Type au choix à l’incantation : acide, froid, feu, foudre, poison ou tonnerre. L’UI affiche le type sélectionné par le joueur ; le type figé ici (feu) est un défaut éditorial. Si deux dés ou plus affichent le même résultat, l’orbe rebondit sur une autre cible dans un rayon de 9 m (nouveau jet d’attaque + nouveau jet de dégâts).',
        en: 'Damage type chosen at casting from: acid, cold, fire, lightning, poison, or thunder. UI shows the selected type; “fire” here is an editorial default. If two or more dice show the same number, the orb leaps to a different target within 30 ft (new attack roll + new damage roll).',
      },
    }),
  ],
  // Spiritual Weapon — SRD CC L16394-16412 : « On a hit, the target takes
  // Force damage equal to 1d8 plus your spellcasting ability modifier. […]
  // Using a Higher-Level Spell Slot. The damage increases by 1d8 for every
  // slot level above 2. »
  // Note d'arbitrage : le « + spellcasting ability modifier » dépend du PJ
  // — non encodable en formule statique. On fige `1d8` et on documente le
  // modifier dans `condition` (à brancher dans une future passe « damage
  // formula avec modifier dérivé » si on étend `resolveSpellDamage`).
  'arme-spirituelle': [
    dmg('1d8', 'force', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Sur un coup, la cible subit 1d8 + modificateur de caractéristique d’incantation dégâts de force. +1d8 par niveau d’emplacement au-dessus du 2 (mod d’incantation NON re-scalé).',
        en: 'On a hit, the target takes 1d8 + spellcasting ability modifier Force damage. +1d8 per spell slot level above 2 (modifier NOT re-scaled).',
      },
    }),
  ],
  // Moonbeam — SRD CC L14864-14887 : « When the Cylinder appears, each
  // creature in it makes a Constitution saving throw. On a failed save, a
  // creature takes 2d10 Radiant damage […] On a successful save, a creature
  // takes half as much damage only. […] Using a Higher-Level Spell Slot. The
  // damage increases by 1d10 for each spell slot level above 2. »
  'rayon-de-lune': [
    dmg('2d10', 'radiant', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
      condition: {
        fr: 'Save de Constitution chaque fois qu’une créature commence son tour dans le cylindre, y entre, ou que le cylindre se déplace sur elle (un save par tour maximum). Save réussi = demi-dégâts.',
        en: 'Constitution save each time a creature starts its turn in the Cylinder, enters it, or the Cylinder moves into its space (max one save per turn). Successful save = half damage.',
      },
    }),
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // D1a — long-tail batch 2 : 8 sorts riders complémentaires + cas simples
  // hand-curés contre SRD CC EN (`SRD_CC_v5.2.1.txt`).
  // ═══════════════════════════════════════════════════════════════════════

  // Hunter's Mark — SRD CC L13827-13844 : « Until the spell ends, you deal
  // an extra 1d6 Force damage to the target whenever you hit it with an
  // attack roll. […] Using a Higher-Level Spell Slot. Your Concentration
  // can last longer with a spell slot of level 3–4 (up to 8 hours) or 5+
  // (up to 24 hours). » → slot affecte UNIQUEMENT la durée, pas la formule.
  'marque-du-chasseur': [
    dmg('1d6', 'force', {
      condition: {
        fr: 'S’ajoute aux dégâts à chaque coup d’une attaque qui touche la cible marquée, tant que la concentration est maintenue. Le niveau d’emplacement n’affecte que la durée de concentration (pas la formule).',
        en: 'Added on each successful attack roll against the marked target while you maintain Concentration. Higher slot levels affect only the Concentration duration (not the formula).',
      },
    }),
  ],

  // Bestow Curse — SRD CC L10735-10765 : « If you deal damage to the target
  // with an attack roll or a spell, the target takes an extra 1d8 Necrotic
  // damage. […] Using a Higher-Level Spell Slot. […] » Le slot upcast ne
  // modifie QUE la durée/concentration (pas la formule).
  // Le 1d8 est l'une des 4 maledictions au choix — encodée comme rider
  // conditionnel via condition.fr.
  'malediction': [
    dmg('1d8', 'necrotic', {
      condition: {
        fr: 'Effet « malédiction des dégâts » uniquement (une des 4 malédictions au choix). +1d8 nécrotique chaque fois que vous infligez des dégâts à la cible avec un jet d’attaque ou un sort. Le niveau d’emplacement n’affecte que la durée (pas la formule).',
        en: '"Damage curse" effect only (one of 4 curse options). +1d8 Necrotic whenever you deal damage to the target with an attack roll or a spell. Higher slot levels affect only the duration (not the formula).',
      },
    }),
  ],

  // Enlarge/Reduce — SRD CC L12376-12408 : « Enlarge. […] The target's
  // attacks with its enlarged weapons or Unarmed Strikes deal an extra
  // 1d4 damage on a hit. » Variant Enlarge uniquement (Reduce *retire*
  // 1d4 — pas un dégât positif). Pas de scaling.
  // Note : type omis car l'arme conserve son type natif (slashing/piercing/
  // bludgeoning) — on fige `bludgeoning` éditorial pour les unarmed et on
  // documente dans condition.
  'agrandissement-rapetissement': [
    dmg('1d4', 'bludgeoning', {
      condition: {
        fr: 'Effet « Agrandissement » uniquement. +1d4 dégâts à chaque coup d’arme ou de coup non armé. Le type final est celui de l’arme déclencheuse (pas nécessairement contondant — défaut éditorial UI). L’effet « Rapetissement » retire 1d4 (debuff, non modélisé ici).',
        en: 'Enlarge variant only. +1d4 damage on each weapon or Unarmed Strike hit. Final damage type matches the triggering weapon (editorial default in UI). Reduce variant subtracts 1d4 (debuff, not modeled here).',
      },
    }),
  ],

  // Shining Smite — SRD CC L16087-16101 : « The target hit by the strike
  // takes an extra 2d6 Radiant damage from the attack. […] Using a Higher-
  // Level Spell Slot. The damage increases by 1d6 for each spell slot
  // level above 2. »
  // FR : `chatiment-de-revelation` (« Châtiment de révélation »).
  'chatiment-de-revelation': [
    dmg('2d6', 'radiant', {
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'S’ajoute aux dégâts de l’attaque (arme de mêlée ou coup non armé) qui vient de toucher. Tant que la concentration est maintenue, la cible émet une lumière vive et les jets d’attaque contre elle ont l’avantage. +1d6 par niveau d’emplacement au-dessus du 2.',
        en: 'Added to the melee weapon or Unarmed Strike that just hit. While Concentration holds, the target sheds Bright Light and attack rolls against it have Advantage. +1d6 per spell slot level above 2.',
      },
    }),
  ],

  // Alter Self — SRD CC L10169-10202 : variant Natural Weapons : « When
  // you use your Unarmed Strike to deal damage with that new growth, it
  // deals 1d6 damage of the type in parentheses [Slashing/Piercing/
  // Bludgeoning] instead of dealing the normal damage […]. » Pas de scaling.
  // Type figé `slashing` (claws par défaut éditorial), 4 options documentées.
  'modification-d-apparence': [
    dmg('1d6', 'slashing', {
      condition: {
        fr: 'Effet « Armes naturelles » uniquement. Coup non armé inflige 1d6 du type choisi (griffes : tranchant ; crocs/cornes : perforant ; sabots : contondant) au lieu des dégâts normaux. Utilise le modificateur d’incantation pour attaque ET dégâts.',
        en: '"Natural Weapons" variant only. Unarmed Strike deals 1d6 of the chosen type (claws: slashing; fangs/horns: piercing; hooves: bludgeoning) instead of normal damage. Uses spellcasting modifier for attack AND damage rolls.',
      },
    }),
  ],

  // Conjure Minor Elementals — SRD CC L11376-11391 : « Until the spell
  // ends, any attack you make deals an extra 2d8 damage when you hit a
  // creature in the Emanation. This damage is Acid, Cold, Fire, or Light-
  // ning (your choice when you make the attack). […] Using a Higher-Level
  // Spell Slot. The damage increases by 1d8 for each spell slot level
  // above 4. »
  // Type-au-choix éditorial : `fire` figé, 4 options documentées.
  'invocation-d-elementaires-mineurs': [
    dmg('2d8', 'fire', {
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'S’ajoute aux dégâts de toute attaque qui touche une créature dans l’émanation de 4,5 m, tant que la concentration est maintenue. Type au choix à chaque attaque : acide, froid, feu ou foudre. +1d8 par niveau d’emplacement au-dessus du 4.',
        en: 'Added to each attack hit against a creature in the 15-foot Emanation while you maintain Concentration. Damage type chosen per attack: Acid, Cold, Fire, or Lightning. +1d8 per spell slot level above 4.',
      },
    }),
  ],

  // Spike Growth — SRD CC L16350-16367 : « When a creature moves into or
  // within the area, it takes 2d4 Piercing damage for every 5 feet it
  // travels. » Pas de scaling.
  'croissance-d-epines': [
    dmg('2d4', 'piercing', {
      condition: {
        fr: 'Terrain de 6 m de rayon. Toute créature qui entre dans la zone ou s’y déplace subit 2d4 perforants par tranche de 1,50 m parcourus.',
        en: '20-foot-radius terrain. Any creature entering or moving within the area takes 2d4 Piercing damage for every 5 feet it travels.',
      },
    }),
  ],

  // Ensnaring Strike — SRD CC L12409-12428 : « While Restrained, the
  // target takes 1d6 Piercing damage at the start of each of its turns.
  // […] Using a Higher-Level Spell Slot. The damage increases by 1d6 for
  // each spell slot level above 1. »
  'frappe-piegeuse': [
    dmg('1d6', 'piercing', {
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'La cible doit échouer un jet de Force lors du coup d’arme qui déclenche le sort pour subir l’état Entravé. Tant qu’elle est entravée, elle subit 1d6 perforants au début de chacun de ses tours. +1d6 par niveau d’emplacement au-dessus du 1er.',
        en: 'Target must fail a Strength save on the triggering weapon hit to gain the Restrained condition. While Restrained, it takes 1d6 Piercing damage at the start of each of its turns. +1d6 per spell slot level above 1.',
      },
    }),
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // D1a — long-tail batch 3 : 20 sorts à jet de sauvegarde de zone.
  // Hand-curés contre SRD CC EN (`SRD_CC_v5.2.1.txt`).
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Pattern dominant : dégâts pleins à l'échec / moitié à la réussite,
  // `resolution: 'saving-throw'`. Schéma SpellDamage n'expose PAS de champ
  // structuré pour l'ability de sauvegarde ni l'outcome — info portée par
  // le texte `condition` (convention `rayon-de-lune`).
  //
  // Cas particuliers traités à part :
  //  - `metal-brulant` : touche auto, save = lâche l'objet (pas réduction).
  //  - `mur-d-epines` / `mur-de-glace` / `tsunami` : 2 formules (initial
  //    + traversée).

  // Phantasmal Killer — SRD CC L14997-15016 : « The target makes a Wisdom
  // saving throw. On a failed save, the target takes 4d10 Psychic damage
  // […]. On a successful save, the target takes half as much damage […].
  // For the duration, the target makes a Wisdom saving throw at the end of
  // each of its turns. On a failed save, it takes the Psychic damage again.
  // […] Using a Higher-Level Spell Slot. The damage increases by 1d10 for
  // each spell slot level above 4. »
  'assassin-imaginaire': [
    dmg('4d10', 'psychic', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
      condition: {
        fr: 'Jet de sauvegarde de Sagesse de la cible. Réussite = demi-dégâts ; échec = dégâts pleins + Désavantage aux jets de caractéristique et d’attaque pendant la durée. La cible refait le jet à la fin de chacun de ses tours ; nouvel échec = nouveaux dégâts.',
        en: 'Wisdom saving throw. Success = half damage; failure = full damage + Disadvantage on ability checks and attack rolls for the duration. The target repeats the save at the end of each of its turns; another failed save deals the damage again.',
      },
    }),
  ],

  // Blade Barrier — SRD CC L10785-10803 : « Any creature in the wall's
  // space makes a Dexterity saving throw, taking 6d10 Force damage on a
  // failed save or half as much damage on a successful one. A creature
  // also makes that save if it enters the wall's space or ends it turn
  // there. A creature makes that save only once per turn. » Pas d'upcast.
  'barriere-de-lames': [
    dmg('6d10', 'force', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Mur tournoyant (jusqu’à 30 m × 6 m × 1,50 m d’épaisseur, ou anneau de 18 m de diamètre). Toute créature dans l’espace du mur fait le jet, et le refait si elle entre dans le mur ou y termine son tour (une fois par tour maximum).',
        en: 'Dexterity saving throw; success = half damage. Whirling wall (up to 100 ft × 20 ft × 5 ft thick, or 60-ft-diameter ring). Save when in the wall’s space, when entering it, or when ending a turn there (once per turn).',
      },
    }),
  ],

  // Cloudkill — SRD CC L11095-11116 : « Each creature in the Sphere makes
  // a Constitution saving throw, taking 5d8 Poison damage on a failed save
  // or half as much damage on a successful one. A creature must also make
  // this save when the Sphere moves into its space and when it enters the
  // Sphere or ends its turn there. A creature makes this save only once
  // per turn. […] +1d8 per spell slot level above 5. »
  'brume-mortelle': [
    dmg('5d8', 'poison', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Constitution ; réussite = demi-dégâts. Sphère de brouillard de 6 m de rayon, fortement obscurcie. La sphère se déplace de 3 m loin du lanceur au début de chacun de ses tours. Jet refait si la sphère entre dans l’espace, ou si la créature y entre ou y termine son tour (une fois par tour maximum).',
        en: 'Constitution saving throw; success = half damage. 20-ft-radius Sphere of fog, Heavily Obscured. The Sphere moves 10 ft away from you at the start of each of your turns. Save repeated when the Sphere enters a creature’s space, or when the creature enters/ends its turn there (once per turn).',
      },
    }),
  ],

  // Circle of Death — SRD CC L11034-11047 : « Each creature in that area
  // makes a Constitution saving throw, taking 8d6 Necrotic damage on a
  // failed save or half as much damage on a successful one. […] +2d6 per
  // spell slot level above 6. » (NB : 8d6, pas 8d8 — corrige l'inventaire
  // initial du plan D1a.)
  'cercle-de-mort': [
    dmg('8d6', 'necrotic', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+2d6' },
      condition: {
        fr: 'Jet de sauvegarde de Constitution ; réussite = demi-dégâts. Sphère d’énergie négative de 18 m de rayon centrée sur un point au sein de la portée.',
        en: 'Constitution saving throw; success = half damage. 60-ft-radius Sphere of negative energy centered on a point within range.',
      },
    }),
  ],

  // Contagion — SRD CC L11437-11457 : « The target must succeed on a
  // Constitution saving throw or take 11d8 Necrotic damage and have the
  // Poisoned condition. […] The target must repeat the saving throw at the
  // end of each of its turns until it gets three successes or failures. »
  // Pas d'upcast.
  'contagion': [
    dmg('11d8', 'necrotic', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Constitution à la touche ; réussite = aucun effet, échec = dégâts pleins ET état Empoisonné avec Désavantage aux jets utilisant une caractéristique choisie. La cible refait le jet à la fin de chacun de ses tours jusqu’à 3 réussites (sort terminé) ou 3 échecs (effet persistant 7 jours).',
        en: 'Constitution saving throw on touch; success = no effect; failure = full damage AND the Poisoned condition with Disadvantage on saves with a chosen ability. Repeats save end of each turn until three successes (spell ends) or three failures (effect lasts 7 days).',
      },
    }),
  ],

  // Harm — SRD CC L13616-13629 : « On a failed save, it takes 14d6
  // Necrotic damage, and its Hit Point maximum is reduced by an amount
  // equal to the Necrotic damage it took. On a successful save, it takes
  // half as much damage only. This spell can't reduce a target's Hit Point
  // maximum below 1. » Pas d'upcast.
  'contamination': [
    dmg('14d6', 'necrotic', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Constitution ; réussite = demi-dégâts seulement, échec = dégâts pleins ET maximum de PV réduit du même montant (sans pouvoir tomber sous 1 PV). Pas de réduction de PV max à la réussite.',
        en: 'Constitution saving throw; success = half damage only, failure = full damage AND Hit Point maximum reduced by the damage taken (cannot drop below 1). No HP max reduction on a successful save.',
      },
    }),
  ],

  // Control Water — SRD CC L11498-11556 : 4 sous-effets (Flood, Part Water,
  // Redirect Flow, Whirlpool). Seul le Whirlpool inflige des dégâts :
  // « When a creature enters the whirlpool for the first time on a turn or
  // ends its turn there, it makes a Strength saving throw. On a failed
  // save, the creature takes 2d8 Bludgeoning damage. On a successful save,
  // the creature takes half as much damage. »
  'controle-de-l-eau': [
    dmg('2d8', 'bludgeoning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Force ; réussite = demi-dégâts. Sous-effet Tourbillon uniquement (les 3 autres sous-effets — Inondation, Séparation, Redirection — n’infligent pas de dégâts). Jet refait quand une créature entre dans le tourbillon pour la première fois d’un tour, ou y termine son tour.',
        en: 'Strength saving throw; success = half damage. Whirlpool sub-effect only (the other three — Flood, Part Water, Redirect Flow — deal no damage). Save when entering the whirlpool for the first time on a turn or ending a turn there.',
      },
    }),
  ],

  // Sunburst — SRD CC L16596-16611 : « Each creature in the Sphere makes a
  // Constitution saving throw. On a failed save, a creature takes 12d6
  // Radiant damage and has the Blinded condition for 1 minute. On a
  // successful save, it takes half as much damage only. » Pas d'upcast.
  'eclat-du-soleil': [
    dmg('12d6', 'radiant', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Constitution ; réussite = demi-dégâts. Sphère de 18 m de rayon. Sur un échec, la cible subit aussi l’état Aveuglé pendant 1 minute (refait le jet à la fin de chacun de ses tours, met fin à l’effet sur une réussite).',
        en: 'Constitution saving throw; success = half damage. 60-ft-radius Sphere. On a failed save, target also has the Blinded condition for 1 minute (repeats save end of each turn, ending the effect on a success).',
      },
    }),
  ],

  // Weird — SRD CC L17414-17430 : « Each creature of your choice in a
  // 30-foot-radius Sphere […] makes a Wisdom saving throw. On a failed
  // save, a target takes 10d10 Psychic damage and has the Frightened
  // condition for the duration. On a successful save, a target takes half
  // as much damage only. A Frightened target makes a Wisdom saving throw
  // at the end of each of its turns. On a failed save, it takes 5d10
  // Psychic damage. » Pas d'upcast.
  'ennemi-subconscient': [
    dmg('10d10', 'psychic', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Sagesse ; réussite = demi-dégâts. Sphère de 9 m de rayon. Sur un échec, la cible subit aussi l’état Effrayé pendant la durée. Une cible Effrayée refait le jet à la fin de chacun de ses tours ; nouvel échec = 5d10 psychiques supplémentaires.',
        en: 'Wisdom saving throw; success = half damage. 30-ft-radius Sphere. On a failed save, target also has the Frightened condition for the duration. A Frightened target repeats the save end of each turn; another failed save deals an additional 5d10 Psychic damage.',
      },
    }),
  ],

  // Mind Spike — SRD CC L14694-14712 : « The target makes a Wisdom saving
  // throw, taking 3d8 Psychic damage on a failed save or half as much
  // damage on a successful one. On a failed save, you also always know the
  // target's location until the spell ends […]. +1d8 per spell slot level
  // above 2. »
  'epine-mentale': [
    dmg('3d8', 'psychic', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Sagesse ; réussite = demi-dégâts. Sur un échec, le lanceur connaît toujours la position de la cible sur le même plan d’existence pour la durée (1 h max), et la cible ne peut pas se cacher de lui.',
        en: 'Wisdom saving throw; success = half damage. On a failed save, you always know the target’s location on the same plane for the duration (up to 1 hour), and it can’t hide from you.',
      },
    }),
  ],

  // Conjure Animals — SRD CC L11274-11300 : « Whenever the pack moves
  // within 10 feet of a creature you can see and whenever a creature […]
  // enters a space within 10 feet of the pack or ends its turn there, you
  // can force that creature to make a Dexterity saving throw. On a failed
  // save, the creature takes 3d10 Slashing damage. A creature makes this
  // save only once per turn. […] +1d10 per spell slot level above 3. »
  // Pas de demi-dégâts à la réussite.
  'invocation-d-animaux': [
    dmg('3d10', 'slashing', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d10' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = aucun dégât, échec = dégâts pleins. Meute spectrale Grande. Jet déclenché quand la meute se déplace à moins de 3 m d’une cible, ou quand une cible entre dans cette zone / y termine son tour (une fois par tour maximum).',
        en: 'Dexterity saving throw; success = no damage, failure = full damage. Large spectral pack. Save triggered when the pack moves within 10 ft of a target, or when a target enters that zone / ends its turn there (once per turn).',
      },
    }),
  ],

  // Conjure Woodland Beings — SRD CC L11392-11413 : « Whenever the
  // Emanation enters the space of a creature you can see and whenever a
  // creature […] enters the Emanation or ends its turn there, you can
  // force that creature to make a Wisdom saving throw. The creature takes
  // 5d8 Force damage on a failed save or half as much damage on a
  // successful one. A creature makes this save only once per turn. […]
  // +1d8 per spell slot level above 4. »
  'invocation-d-etres-sylvestres': [
    dmg('5d8', 'force', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Sagesse ; réussite = demi-dégâts. Émanation de 3 m autour du lanceur. Jet déclenché quand l’émanation entre dans l’espace d’une cible, ou quand une cible entre dans l’émanation / y termine son tour (une fois par tour maximum).',
        en: 'Wisdom saving throw; success = half damage. 10-ft Emanation around you. Save triggered when the Emanation enters a target’s space, or when a target enters the Emanation / ends its turn there (once per turn).',
      },
    }),
  ],

  // Heat Metal — SRD CC L13669-13693 : « Any creature in physical contact
  // with the object takes 2d8 Fire damage when you cast the spell. Until
  // the spell ends, you can take a Bonus Action on each of your later
  // turns to deal this damage again […]. If a creature is holding or
  // wearing the object and takes the damage from it, the creature must
  // succeed on a Constitution saving throw or drop the object […]. +1d8
  // per spell slot level above 2. »
  //
  // Cas particulier : les dégâts touchent automatiquement (pas de jet de
  // réduction). Le jet de Con n'affecte QUE le fait de lâcher / garder
  // l'objet, pas le montant de dégâts. Encodage : `resolution: 'auto'`,
  // condition explicite côté texte.
  'metal-brulant': [
    dmg('2d8', 'fire', {
      resolution: 'auto',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Dégâts automatiques (pas de jet) sur toute créature en contact physique avec l’objet métallique ciblé. Le lanceur peut répéter les dégâts en Action Bonus à chaque tour suivant. Une créature qui porte ou tient l’objet doit réussir un jet de sauvegarde de Constitution ou lâcher l’objet ; ce jet ne réduit PAS les dégâts.',
        en: 'Automatic damage (no save) to any creature in physical contact with the targeted metal object. You may repeat the damage as a Bonus Action on later turns. A creature holding or wearing the object must succeed on a Constitution saving throw or drop it; this save does NOT reduce the damage.',
      },
    }),
  ],

  // Wall of Thorns — SRD CC L17307-17335 : « When the wall appears, each
  // creature in its area makes a Dexterity saving throw, taking 7d8
  // Piercing damage on a failed save or half as much damage on a
  // successful one. […] The first time a creature enters a space in the
  // wall on a turn or ends its turn there, the creature makes a Dexterity
  // saving throw, taking 7d8 Slashing damage on a failed save or half as
  // much damage on a successful one. […] Both types of damage increase by
  // 1d8 for each spell slot level above 6. »
  //
  // 2 formules distinctes : initial (perforants, à l'apparition) + traversée
  // (tranchants, par passage / fin de tour). Les deux scalent à +1d8/L.
  'mur-d-epines': [
    dmg('7d8', 'piercing', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Apparition du mur (jusqu’à 18 m × 3 m × 1,50 m, ou cercle de 6 m de diamètre × 6 m de hauteur × 1,50 m d’épaisseur). Chaque créature dans l’aire fait le jet.',
        en: 'Dexterity saving throw; success = half damage. Wall appears (up to 60 ft × 10 ft × 5 ft, or 20-ft-diameter circle × 20 ft high × 5 ft thick). Each creature in the area saves.',
      },
    }),
    dmg('7d8', 'slashing', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Traversée : 4 m de mouvement par 30 cm parcouru à travers le mur. La première fois qu’une créature entre dans le mur sur un tour ou y termine son tour, jet de Dex (une fois par tour maximum).',
        en: 'Dexterity saving throw; success = half damage. Traversal: 4 ft of movement per 1 ft moved through the wall. First time a creature enters the wall on a turn or ends its turn there, Dex save (once per turn).',
      },
    }),
  ],

  // Wall of Ice — SRD CC L17231-17266 : « If the wall cuts through a
  // creature's space when it appears, the creature is pushed to one side
  // of the wall […] and makes a Dexterity saving throw, taking 10d6 Cold
  // damage on a failed save or half as much damage on a successful one.
  // […] A creature moving through the sheet of frigid air for the first
  // time on a turn makes a Constitution saving throw, taking 5d6 Cold
  // damage on a failed save or half as much damage on a successful one.
  // […] The damage the wall deals when it appears increases by 2d6 and
  // the damage from passing through the sheet of frigid air increases by
  // 1d6 for each spell slot level above 6. »
  //
  // 2 formules : initial (apparition, Dex, +2d6/L) + traversée (air glacé
  // après destruction d'une section, Con, +1d6/L).
  'mur-de-glace': [
    dmg('10d6', 'cold', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+2d6' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Apparition du mur. Si le mur traverse l’espace d’une créature, elle est poussée d’un côté et fait le jet.',
        en: 'Dexterity saving throw; success = half damage. Wall appearance. If the wall cuts through a creature’s space, it is pushed to one side and makes the save.',
      },
    }),
    dmg('5d6', 'cold', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Jet de sauvegarde de Constitution ; réussite = demi-dégâts. Traversée de l’air glacé : une section de 3 m du mur réduite à 0 PV laisse un drap d’air glacé. Toute créature qui le traverse pour la première fois d’un tour fait le jet.',
        en: 'Constitution saving throw; success = half damage. Frigid air traversal: a 10-ft section of wall reduced to 0 HP leaves a sheet of frigid air. Any creature moving through it for the first time on a turn makes the save.',
      },
    }),
  ],

  // Wind Wall — SRD CC L17454-17479 : « When the wall appears, each
  // creature in its area makes a Strength saving throw, taking 4d8
  // Bludgeoning damage on a failed save or half as much damage on a
  // successful one. » Pas d'upcast.
  'mur-de-vent': [
    dmg('4d8', 'bludgeoning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Force ; réussite = demi-dégâts. Apparition du mur (jusqu’à 15 m × 4,50 m × 30 cm d’épaisseur, en chemin continu sur le sol). Chaque créature dans l’aire fait le jet une fois à l’apparition.',
        en: 'Strength saving throw; success = half damage. Wall appears (up to 50 ft × 15 ft × 1 ft thick, in a continuous path on the ground). Each creature in the area saves once on appearance.',
      },
    }),
  ],

  // Freezing Sphere — SRD CC L13092-13123 : « A frigid globe streaks from
  // you to a point of your choice within range, where it explodes in a
  // 60-foot-radius Sphere. Each creature in that area makes a Constitution
  // saving throw, taking 10d6 Cold damage on failed save or half as much
  // damage on a successful one. […] Using a Higher-Level Spell Slot. The
  // damage increases by 1d6 for each spell slot level above 6. »
  'sphere-glacee': [
    dmg('10d6', 'cold', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Jet de sauvegarde de Constitution ; réussite = demi-dégâts. Globe glacial qui explose en une sphère de 18 m de rayon au point ciblé (portée 90 m). Variante : le lanceur peut garder le globe en main pour le lancer plus tard ; l’explosion à l’impact suit les mêmes règles.',
        en: 'Constitution saving throw; success = half damage. Frigid globe explodes in a 60-ft-radius Sphere at the chosen point (300-ft range). Variant: the caster may keep the globe in hand to throw later; impact explosion follows the same rules.',
      },
    }),
  ],

  // Black Tentacles (Evard's) — SRD CC L10766-10784 : « Each creature in
  // that area makes a Strength saving throw. On a failed save, it takes
  // 3d6 Bludgeoning damage, and it has the Restrained condition until the
  // spell ends. A creature also makes that save if it enters the area or
  // ends it turn there. A creature makes that save only once per turn. »
  // Pas de demi-dégâts à la réussite, pas d'upcast.
  'tentacules-noirs': [
    dmg('3d6', 'bludgeoning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Force ; réussite = aucun dégât, échec = dégâts pleins ET état Entravé jusqu’à la fin du sort. Carré de 6 m de côté sur le sol, Terrain difficile pour la durée. Jet refait à l’entrée dans l’aire ou en fin de tour (une fois par tour maximum). Une créature Entravée peut, par une action, tenter un Force (Athlétisme) contre le DD de sauvegarde pour mettre fin à l’état.',
        en: 'Strength saving throw; success = no damage, failure = full damage AND the Restrained condition until the spell ends. 20-ft square on the ground, Difficult Terrain for the duration. Save repeats on entering the area or ending a turn there (once per turn). A Restrained creature may take an action to attempt a Strength (Athletics) check vs the save DC to end the condition.',
      },
    }),
  ],

  // Tsunami — SRD CC L17074-17098 : « When the wall appears, each creature
  // in its area makes a Strength saving throw, taking 6d10 Bludgeoning
  // damage on a failed save or half as much damage on a successful one.
  // […] Any Huge or smaller creature inside the wall or whose space the
  // wall enters when it moves must succeed on a Strength saving throw or
  // take 5d10 Bludgeoning damage. A creature can take this damage only
  // once per round. At the end of the turn, the wall’s height is reduced
  // by 50 feet, and the damage the wall deals on later rounds is reduced
  // by 1d10. »
  //
  // 2 formules : initial (apparition, 6d10, save-half) + traversée (5d10,
  // décroissant -1d10/round). Pas d'upcast.
  'tsunami': [
    dmg('6d10', 'bludgeoning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Force ; réussite = demi-dégâts. Apparition du mur d’eau (jusqu’à 90 m × 90 m × 15 m d’épaisseur, à 1,5 km). Chaque créature dans l’aire fait le jet à l’apparition.',
        en: 'Strength saving throw; success = half damage. Wall of water appears (up to 300 ft × 300 ft × 50 ft thick, at 1 mile range). Each creature in the area saves on appearance.',
      },
    }),
    dmg('5d10', 'bludgeoning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Force ; réussite = aucun dégât, échec = dégâts pleins. Traversée : à chaque tour du lanceur, le mur (et les créatures à l’intérieur) avance de 15 m. Toute créature de taille TG ou inférieure dans le mur, ou dont l’espace est traversé, fait le jet (une fois par round maximum). La hauteur du mur diminue de 15 m et les dégâts baissent de 1d10 à la fin de chaque tour.',
        en: 'Strength saving throw; success = no damage, failure = full damage. Traversal: each of caster’s turns, the wall (and creatures inside) moves 50 ft. Any Huge or smaller creature inside the wall, or whose space the wall enters, makes the save (once per round). Wall height drops 50 ft and damage drops 1d10 at end of each turn.',
      },
    }),
  ],

  // Faithful Hound — SRD CC L12567-12588 : « At the start of each of your
  // turns, the hound attempts to bite one enemy within 5 feet of it. That
  // enemy must succeed on a Dexterity saving throw or take 4d8 Force
  // damage. » Pas d'upcast. Pas de demi-dégâts (réussite = aucun dégât).
  'chien-de-garde': [
    dmg('4d8', 'force', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = aucun dégât, échec = dégâts pleins. Chien de garde fantomatique invoqué pour 8 h. Au début de chacun des tours du lanceur, le chien tente de mordre un ennemi à 1,50 m ou moins.',
        en: 'Dexterity saving throw; success = no damage, failure = full damage. Phantom watchdog summoned for 8 h. At the start of each of the caster’s turns, the hound attempts to bite one enemy within 5 ft.',
      },
    }),
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // D1a — long-tail batch 4 : 12 sorts de dégâts haut profil (incantations
  // emblématiques restantes). Hand-curés contre SRD CC EN
  // (`SRD_CC_v5.2.1.txt`).
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Couvre 4 patterns supplémentaires :
  //  - Formule mixte « XdY + N » (Disintegrate 10d6+40, Finger of Death 7d8+30).
  //  - Cible primaire + arcs secondaires (Chain Lightning).
  //  - Dégâts cumulatifs (Delayed Blast Fireball : 12d6 + 1d6/round).
  //  - Attaque réactive auto sur attaquant melee (Fire Shield).
  //
  // Cas particuliers :
  //  - `colonne-de-flamme` / `main-arcanique` : 2 entrées `damage[]` distinctes.
  //  - `bouclier-de-feu` : `resolution: 'auto'` (réactif, pas de save).
  //  - `caresse-du-vampire` : drain — le lanceur récupère la moitié des PV
  //    infligés ; documenté en `condition`, le drain n'est pas modélisé.

  // Disintegrate — SRD CC L11981-12001 : « A creature targeted by this
  // spell makes a Dexterity saving throw. On a failed save, the target
  // takes 10d6 + 40 Force damage. If this damage reduces it to 0 Hit
  // Points, it and everything nonmagical it is wearing and carrying are
  // disintegrated into gray dust. […] Using a Higher-Level Spell Slot.
  // The damage increases by 3d6 for each spell slot level above 6. »
  // Pas de demi-dégâts à la réussite.
  'desintegration': [
    dmg('10d6+40', 'force', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+3d6' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = aucun dégât, échec = dégâts pleins. Si les dégâts réduisent la cible à 0 PV, elle (et tout son équipement non magique) est désintégrée en poussière grise — seules True Resurrection ou Wish peuvent la ramener.',
        en: 'Dexterity saving throw; success = no damage, failure = full damage. If damage reduces the target to 0 HP, it (and all nonmagical equipment) is disintegrated into gray dust — only True Resurrection or Wish can revive it.',
      },
    }),
  ],

  // Finger of Death — SRD CC L12729-12743 : « The target makes a
  // Constitution saving throw, taking 7d8 + 30 Necrotic damage on a
  // failed save or half as much damage on a successful one. A Humanoid
  // killed by this spell rises at the start of your next turn as a
  // Zombie […]. » Pas d'upcast.
  'doigt-de-mort': [
    dmg('7d8+30', 'necrotic', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Jet de sauvegarde de Constitution ; réussite = demi-dégâts. Un Humanoïde tué par ce sort se relève au début du prochain tour du lanceur comme un Zombie qui obéit à ses ordres verbaux.',
        en: 'Constitution saving throw; success = half damage. A Humanoid killed by this spell rises at the start of the caster’s next turn as a Zombie that follows verbal orders.',
      },
    }),
  ],

  // Spirit Guardians — SRD CC L16368-16393 : « […] the creature must
  // make a Wisdom saving throw. On a failed save, the creature takes 3d8
  // Radiant damage (if you are good or neutral) or 3d8 Necrotic damage
  // (if you are evil). On a successful save, the creature takes half as
  // much damage. A creature makes this save only once per turn. […]
  // +1d8 per spell slot level above 3. »
  //
  // Le type de dégâts dépend de l'alignement du lanceur. Encodage : on
  // pose `radiant` comme défaut (alignement bon/neutre, le cas le plus
  // commun en table) et on documente la variante nécrotique en condition.
  'esprits-gardiens': [
    dmg('3d8', 'radiant', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Sagesse ; réussite = demi-dégâts. Émanation de 4,50 m autour du lanceur, vitesse divisée par 2. Type de dégâts : radiants si alignement Bon ou Neutre ; nécrotiques si alignement Mauvais. Une créature fait le jet la première fois qu’elle entre dans l’émanation ou y termine son tour (une fois par tour maximum).',
        en: 'Wisdom saving throw; success = half damage. 15-ft Emanation around caster; Speed halved within. Damage type: Radiant if Good or Neutral alignment, Necrotic if Evil. Save when first entering the Emanation or ending a turn there (once per turn).',
      },
    }),
  ],

  // NB : `chaine-d-eclairs`, `appel-de-la-foudre`, `caresse-du-vampire`
  // sont DÉJÀ présents dans la baseline (`SRD_SPELL_DAMAGE` pré-D1a).
  // Pas de duplication ici. Une passe d'enrichissement future pourra
  // aligner leur `condition.fr` sur la convention `rayon-de-lune`
  // (caractéristique de sauvegarde + outcome textuellement présents).

  // Delayed Blast Fireball — SRD CC L11806-11834 : « The spell’s base
  // damage is 12d6, and the damage increases by 1d6 whenever your turn
  // ends and the spell hasn’t ended. […] A creature takes Fire damage
  // equal to the total accumulated damage on a failed save or half as
  // much damage on a successful one. […] The base damage increases by
  // 1d6 for each spell slot level above 7. »
  //
  // 2 mécaniques d'accumulation distinctes :
  //  - Base 12d6 (à l'incantation) + 1d6 par tour de concentration.
  //  - Upcast : la BASE augmente de +1d6/L (le tic par tour reste +1d6).
  // Encodage : `formula` = 12d6 (base initiale), `atHigherLevels.perLevel`
  // = `+1d6` (upcast de la base), condition documente l'accumulation
  // par tour (1d6 par fin de tour du lanceur).
  'boule-de-feu-a-retardement': [
    dmg('12d6', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Sphère de 6 m de rayon à l’explosion. La cible subit les dégâts ACCUMULÉS jusqu’à l’explosion : la base est 12d6 (à l’incantation) + 1d6 supplémentaires à la fin de chaque tour du lanceur tant que le sort dure (jusqu’à 1 minute de concentration). L’upcast augmente UNIQUEMENT la base (+1d6/L), pas le tic par tour.',
        en: 'Dexterity saving throw; success = half damage. 20-ft-radius Sphere on explosion. Target takes ACCUMULATED damage: base 12d6 (on cast) + 1d6 at the end of each of caster’s turns while concentrating (up to 1 minute). Upcast only increases the base (+1d6/L), not the per-turn tic.',
      },
    }),
  ],

  // Flame Strike — SRD CC L12877-12891 : « Each creature in a 10-foot-
  // radius, 40-foot-high Cylinder centered on a point within range
  // makes a Dexterity saving throw, taking 5d6 Fire damage and 5d6
  // Radiant damage on a failed save or half as much damage on a
  // successful one. […] The Fire damage and the Radiant damage
  // increase by 1d6 for each spell slot level above 5. »
  //
  // 2 entrées `damage[]` : feu + radiant, chacune avec son upcast.
  'colonne-de-flamme': [
    dmg('5d6', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Cylindre de 3 m de rayon × 12 m de haut centré dans la portée. Cumule avec la composante radiante (5d6 supplémentaires, même jet, même upcast +1d6/L).',
        en: 'Dexterity saving throw; success = half damage. 10-ft-radius × 40-ft-high Cylinder within range. Stacks with the Radiant component (additional 5d6, same save, same +1d6/L upcast).',
      },
    }),
    dmg('5d6', 'radiant', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Composante radiante simultanée à la composante feu (même jet, même cylindre, même upcast +1d6/L). Total combiné : 10d6 dégâts mixtes au niveau de base.',
        en: 'Dexterity saving throw; success = half damage. Radiant component simultaneous with Fire (same save, same cylinder, same +1d6/L upcast). Combined total: 10d6 mixed damage at base level.',
      },
    }),
  ],

  // Arcane Sword — SRD CC L10518-10534 : « When the sword appears, you
  // make a melee spell attack against a target within 5 feet of the
  // sword. On a hit, the target takes Force damage equal to 4d12 plus
  // your spellcasting ability modifier. […] On your later turns, you
  // can take a Bonus Action to move the sword […] and repeat the
  // attack […]. » Pas d'upcast.
  'epee-arcanique': [
    dmg('4d12', 'force', {
      resolution: 'attack-roll',
      condition: {
        fr: 'Sur un coup d’attaque magique au corps à corps, la cible subit 4d12 + modificateur de caractéristique d’incantation dégâts de force. Épée spectrale invoquée à portée (jusqu’à 27 m). Action bonus aux tours suivants : déplacer l’épée jusqu’à 9 m et répéter l’attaque (même cible ou autre).',
        en: 'On a melee spell attack hit, target takes 4d12 + spellcasting ability modifier Force damage. Spectral sword summoned within range (90 ft). Bonus Action on later turns: move sword up to 30 ft and repeat the attack (same or different target).',
      },
    }),
  ],

  // Arcane Hand — SRD CC L10458-10503 : 4 sous-effets, 2 inflijent des
  // dégâts. Clenched Fist : « Make a melee spell attack. On a hit, the
  // target takes 5d8 Force damage. » Grasping Hand : « […] dealing
  // Bludgeoning damage to the target equal to 4d6 plus your spellcasting
  // ability modifier. » Upcast : « +2d8 Clenched Fist, +2d6 Grasping
  // Hand per spell slot level above 5. »
  //
  // 2 entrées `damage[]` : poing fermé (Clenched Fist) + main agrippante
  // (Grasping Hand). Les 2 autres effets (Forceful Hand, Interposing
  // Hand) n'infligent pas de dégâts.
  'main-arcanique': [
    dmg('5d8', 'force', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+2d8' },
      condition: {
        fr: 'Effet « Poing fermé » : sur un coup d’attaque magique au corps à corps, la cible subit 5d8 dégâts de force. +2d8 par niveau d’emplacement au-dessus du 5.',
        en: '« Clenched Fist » effect: on a melee spell attack hit, target takes 5d8 Force damage. +2d8 per spell slot level above 5.',
      },
    }),
    dmg('4d6', 'bludgeoning', {
      resolution: 'auto',
      atHigherLevels: { perLevel: '+2d6' },
      condition: {
        fr: 'Effet « Main agrippante » : après réussite du grapple (jet de Dextérité raté de la cible), action bonus pour écraser → 4d6 + modificateur de caractéristique d’incantation dégâts contondants automatiques (pas de jet supplémentaire). +2d6 par niveau d’emplacement au-dessus du 5.',
        en: '« Grasping Hand » effect: after grapple succeeds (target failed Dex save), Bonus Action to crush → 4d6 + spellcasting ability modifier Bludgeoning damage automatic (no further save). +2d6 per spell slot level above 5.',
      },
    }),
  ],

  // Flame Blade — SRD CC L12859-12876 : « On a hit, the target takes
  // Fire damage equal to 3d6 plus your spellcasting ability modifier.
  // […] The damage increases by 1d6 for each spell slot level above 2. »
  'lame-de-feu': [
    dmg('3d6', 'fire', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d6' },
      condition: {
        fr: 'Lame de feu évoquée dans la main libre (Action bonus). Sur un coup d’attaque magique au corps à corps (action Magique), la cible subit 3d6 + modificateur de caractéristique d’incantation dégâts de feu. +1d6 par niveau d’emplacement au-dessus du 2.',
        en: 'Flame blade evoked in the free hand (Bonus Action). On a melee spell attack hit (Magic action), target takes 3d6 + spellcasting ability modifier Fire damage. +1d6 per spell slot level above 2.',
      },
    }),
  ],

  // Fire Shield — SRD CC L12826-12843 : « whenever a creature within 5
  // feet of you hits you with a melee attack roll, the shield erupts
  // with flame. The attacker takes 2d8 Fire damage from a warm shield
  // or 2d8 Cold damage from a chill shield. » Pas d'upcast. Pas de save.
  //
  // Cas particulier : dégâts réactifs auto, déclenchés par l'attaquant
  // qui touche le lanceur en mêlée. `resolution: 'auto'`. Type par défaut
  // = `fire` (variante « warm shield ») ; condition documente la variante
  // « chill shield » (cold).
  'bouclier-de-feu': [
    dmg('2d8', 'fire', {
      resolution: 'auto',
      condition: {
        fr: 'Dégâts réactifs automatiques (pas de jet) : quand un attaquant à 1,50 m ou moins touche le lanceur en mêlée, il subit 2d8 dégâts. Variante « bouclier chaud » (feu, défaut) ou « bouclier froid » (froid 2d8) au choix à l’incantation. Le bouclier accorde aussi Résistance au type opposé (Froid pour warm, Feu pour chill).',
        en: 'Automatic reactive damage (no save): when an attacker within 5 ft hits the caster with a melee attack, they take 2d8 damage. Variant « warm shield » (Fire, default) or « chill shield » (Cold 2d8) chosen at casting. Shield also grants Resistance to the opposite type (Cold for warm, Fire for chill).',
      },
    }),
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // D1a — long-tail batch 5 : 7 sorts complémentaires (1 cantrip + 6
  // leveled). Hand-curés contre SRD CC EN.
  // ═══════════════════════════════════════════════════════════════════════
  //
  // Patterns nouveaux maîtrisés ici :
  //  - Cantrip avec type de dégâts au choix (Sorcerous Burst : 7 types).
  //  - Dégâts récurrents subjectifs sans save (Phantasmal Force).
  //  - Conjure Elemental : initial à la première rencontre + cascade
  //    récurrente sur cible Restrained (2 entrées damage[]).
  //  - Conjure Celestial : Searing Light branche dégâts seule (Healing
  //    Light est un soin, non modélisé en damage[]).

  // Sorcerous Burst — SRD CC L16243-16261 (Cantrip Evocation, Sorcerer) :
  // « Make a ranged spell attack against the target. On a hit, the target
  // takes 1d8 damage of a type you choose: Acid, Cold, Fire, Lightning,
  // Poison, Psychic, or Thunder. If you roll an 8 on a d8 for this spell,
  // you can roll another d8, and add it to the damage. […] Cantrip
  // Upgrade. The damage increases by 1d8 when you reach levels 5 (2d8),
  // 11 (3d8), and 17 (4d8). »
  //
  // Type par défaut : `fire` (le plus courant à la table) ; condition
  // documente les 7 types disponibles et l'« exploding 8s ».
  'eruption-ensorcelee': [
    dmg('1d8', 'fire', {
      resolution: 'attack-roll',
      cantripScaling: cantripScaling('2d8', '3d8', '4d8'),
      condition: {
        fr: 'Sur un coup d’attaque magique à distance, la cible subit 1d8 dégâts du type choisi à l’incantation : acide, froid, feu, foudre, poison, psychiques ou tonnerre. « Dés explosifs » : sur un 8 obtenu, relance et ajoute (max = modificateur de caractéristique d’incantation supplémentaires).',
        en: 'On a ranged spell attack hit, target takes 1d8 damage of the chosen type: Acid, Cold, Fire, Lightning, Poison, Psychic, or Thunder. « Exploding 8s »: on an 8 rolled, reroll and add (max = spellcasting ability modifier additional dice).',
      },
    }),
  ],

  // Phantasmal Force — SRD CC L14962-14990 : « An affected target can
  // even take damage from the illusion if the phantasm represents a
  // dangerous creature or hazard. On each of your turns, such a phantasm
  // can deal 2d8 Psychic damage to the target if it is in the phantasm’s
  // area or within 5 feet of the phantasm. The target perceives the
  // damage as a type appropriate to the illusion. »
  //
  // Le jet de sauvegarde initial (Intelligence) détermine si le sort
  // PREND (échec) ou non (réussite). UNE FOIS pris, les dégâts subjectifs
  // (2d8 psychiques) ne sont PAS réduits par un save — la cible peut
  // tenter une action Étude (Int/Investigation) pour briser l'illusion.
  // Encodage : `resolution: 'auto'` (les dégâts ne sont pas mitigés par
  // un jet), condition documente le mécanisme illusoire.
  'force-fantasmagorique': [
    dmg('2d8', 'psychic', {
      resolution: 'auto',
      condition: {
        fr: 'Jet de sauvegarde d’Intelligence à l’incantation : réussite = pas d’illusion. Sur un échec, le sort prend. UNE FOIS pris, les dégâts (2d8 psychiques) ne sont PAS mitigés par un nouveau jet — ils s’infligent à chaque tour du lanceur tant que la cible est dans l’aire de l’illusion ou à 1,50 m. La cible perçoit le type comme cohérent avec l’illusion. Action Étude (Int/Investigation contre DD de sort) pour briser l’illusion et mettre fin au sort.',
        en: 'Initial Intelligence saving throw on cast: success = no illusion. On failure, spell takes hold. ONCE taken, damage (2d8 Psychic) is NOT mitigated by further saves — applied each of caster’s turns while target is in the illusion’s area or within 5 ft. Target perceives the damage type as fitting the illusion. Study action (Int/Investigation vs spell DC) to break the illusion and end the spell.',
      },
    }),
  ],

  // Glyph of Warding (Explosive Rune) — SRD CC L13312-13374 : « When
  // triggered, the glyph erupts with magical energy in a 20-foot-radius
  // Sphere centered on the glyph. Each creature in the area makes a
  // Dexterity saving throw. A creature takes 5d8 Acid, Cold, Fire,
  // Lightning, or Thunder damage (your choice when you create the glyph)
  // on a failed save or half as much damage on a successful one. […]
  // The damage of an explosive rune increases by 1d8 for each spell slot
  // level above 3. »
  //
  // Type par défaut : `fire` (le plus courant) ; condition documente les
  // 5 types disponibles. Variante « Spell Glyph » n'est pas modélisée en
  // damage[] (elle stocke un sort tiers — son rendu relève du sort
  // stocké, pas de Glyph of Warding lui-même).
  'glyphe-de-garde': [
    dmg('5d8', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Variante « Rune explosive » : jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Sphère de 6 m de rayon centrée sur le glyphe. Type choisi à l’incantation parmi : acide, froid, feu, foudre, tonnerre. La variante « Glyphe de sort » stocke un sort de niveau ≤ celui de Glyphe de garde et n’inflige pas de dégâts directs (les effets dépendent du sort stocké).',
        en: '« Explosive Rune » variant: Dexterity saving throw; success = half damage. 20-ft-radius Sphere centered on the glyph. Type chosen at casting from: Acid, Cold, Fire, Lightning, Thunder. The « Spell Glyph » variant stores a spell of level ≤ Glyph of Warding and deals no direct damage (effects depend on the stored spell).',
      },
    }),
  ],

  // Conjure Elemental — SRD CC L11328-11360 : « Choose the spirit’s
  // element, which determines its damage type: air (Lightning), earth
  // (Thunder), fire (Fire), or water (Cold). […] On failed save, the
  // target takes 8d8 damage of the spirit’s type, and the target has the
  // Restrained condition until the spell ends. At the start of each of
  // its turns, the Restrained target repeats the save. On a failed save,
  // the target takes 4d8 damage of the spirit’s type. On a successful
  // save, the target isn’t Restrained by the spirit. […] The damage
  // increases by 1d8 for each spell slot level above 5. »
  //
  // 2 entrées damage[] : initial (8d8) + cascade Restrained (4d8). Type
  // par défaut : `fire` (le plus courant à la table) ; condition
  // documente les 4 types selon l'élément choisi.
  'invocation-d-elementaire': [
    dmg('8d8', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité ; réussite = aucun dégât ni Entravé, échec = dégâts pleins + état Entravé jusqu’à la fin du sort. Type choisi à l’incantation selon l’élément : air → foudre, terre → tonnerre, feu → feu (défaut), eau → froid. Le jet se déclenche quand une créature entre dans l’espace de l’esprit ou commence son tour à 1,50 m, et seulement si l’esprit n’a personne d’Entravé.',
        en: 'Dexterity saving throw; success = no damage or Restrained, failure = full damage + Restrained until spell ends. Type chosen at casting per element: air → Lightning, earth → Thunder, fire → Fire (default), water → Cold. Save triggered when a creature enters the spirit’s space or starts its turn within 5 ft, only if the spirit has no one Restrained.',
      },
    }),
    dmg('4d8', 'fire', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d8' },
      condition: {
        fr: 'Jet de sauvegarde de Dextérité au début de chaque tour de la créature Entravée ; réussite = elle se libère (plus Entravé, aucun dégât), échec = 4d8 supplémentaires du type de l’esprit. Même type que l’entrée initiale (selon élément). Upcast identique (+1d8/L).',
        en: 'Dexterity saving throw at the start of each Restrained creature’s turn; success = freed (no longer Restrained, no damage), failure = additional 4d8 of the spirit’s type. Same type as the initial entry (per element). Same upcast (+1d8/L).',
      },
    }),
  ],

  // Conjure Fey — SRD CC L11380-11413 : « When the spirit appears, you
  // can make one melee spell attack against a creature within 5 feet of
  // it. On a hit, the target takes Psychic damage equal to 3d12 plus
  // your spellcasting ability modifier, and the target has the Frightened
  // condition until the start of your next turn […]. As a Bonus Action
  // on your later turns, you can teleport the spirit […] and make the
  // attack against a creature within 5 feet of it. […] +1d12 per spell
  // slot level above 6. »
  'invocation-de-fee': [
    dmg('3d12', 'psychic', {
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d12' },
      condition: {
        fr: 'Sur un coup d’attaque magique au corps à corps (par l’esprit invoqué), la cible subit 3d12 + modificateur de caractéristique d’incantation dégâts psychiques + état Effrayé jusqu’au début du prochain tour du lanceur. Action bonus aux tours suivants : téléporter l’esprit jusqu’à 9 m et répéter l’attaque.',
        en: 'On a melee spell attack hit (by the conjured spirit), target takes 3d12 + spellcasting ability modifier Psychic damage + Frightened condition until the start of caster’s next turn. Bonus Action on later turns: teleport spirit up to 30 ft and repeat the attack.',
      },
    }),
  ],

  // Conjure Celestial — SRD CC L11301-11328 (Searing Light branch
  // only) : « Searing Light. The target makes a Dexterity saving throw,
  // taking 6d12 Radiant damage on a failed save or half as much damage
  // on a successful one. […] The healing and damage increase by 1d12
  // for each spell slot level above 7. »
  //
  // L'autre branche (Healing Light : 4d12 + mod PV récupérés) est un
  // soin et n'est pas modélisée en damage[]. Le sort permet de choisir
  // par cible — un même cast peut soigner certains et brûler d'autres.
  'invocation-de-celeste': [
    dmg('6d12', 'radiant', {
      resolution: 'saving-throw',
      atHigherLevels: { perLevel: '+1d12' },
      condition: {
        fr: 'Branche « Lumière brûlante » : jet de sauvegarde de Dextérité ; réussite = demi-dégâts. L’autre branche « Lumière guérisseuse » (4d12 + modificateur de caractéristique d’incantation PV récupérés) est un soin et n’apparaît pas en damage[]. Cylindre de 3 m de rayon × 12 m de haut. Le lanceur choisit par cible quelle lumière l’atteint (une fois par tour par créature).',
        en: '« Searing Light » branch: Dexterity saving throw; success = half damage. The other branch « Healing Light » (4d12 + spellcasting ability modifier HP regained) is healing and not represented in damage[]. 10-ft-radius × 40-ft-high Cylinder. Caster chooses per target which light strikes (once per turn per creature).',
      },
    }),
  ],

  // Prismatic Spray — SRD CC L15284-15327 : 8 rayons aléatoires (d8) ;
  // 5 d'entre eux infligent 12d6 de différents types (Rouge=feu,
  // Orange=acide, Jaune=foudre, Vert=poison, Bleu=froid). Indigo (6) =
  // Restrained → Petrified ; Violet (7) = Aveuglé → téléporté ;
  // Special (8) = 2 jets. Pas d'upcast.
  //
  // Encodage : 1 entrée damage[] par couleur infligeant des dégâts.
  // Chaque entrée porte la même formule (12d6) et le même résolution
  // (saving-throw Dex half), avec son type propre et une `condition`
  // qui explique le tirage d8.
  'embruns-prismatiques': [
    dmg('12d6', 'fire', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Cône de 18 m. Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Pour chaque cible, jet d8 sur la table : 1 = Rouge → 12d6 feu (cette entrée). Autres résultats : 2-Orange acide, 3-Jaune foudre, 4-Vert poison, 5-Bleu froid (entrées séparées) ; 6-Indigo Entravé→Pétrifié, 7-Violet Aveuglé→téléporté (effets non-dégâts), 8-Spécial = 2 jets.',
        en: '60-ft Cone. Dexterity saving throw; success = half damage. For each target, roll a d8: 1 = Red → 12d6 Fire (this entry). Other results: 2-Orange acid, 3-Yellow lightning, 4-Green poison, 5-Blue cold (separate entries); 6-Indigo Restrained→Petrified, 7-Violet Blinded→teleported (non-damage effects), 8-Special = 2 rolls.',
      },
    }),
    dmg('12d6', 'acid', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Rayon Orange (jet d8 = 2). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Cf. entrée Rouge pour la mécanique de tirage des rayons.',
        en: 'Orange ray (d8 = 2). Dexterity saving throw; success = half damage. See Red entry for ray-rolling mechanic.',
      },
    }),
    dmg('12d6', 'lightning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Rayon Jaune (jet d8 = 3). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts.',
        en: 'Yellow ray (d8 = 3). Dexterity saving throw; success = half damage.',
      },
    }),
    dmg('12d6', 'poison', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Rayon Vert (jet d8 = 4). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts.',
        en: 'Green ray (d8 = 4). Dexterity saving throw; success = half damage.',
      },
    }),
    dmg('12d6', 'cold', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Rayon Bleu (jet d8 = 5). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts.',
        en: 'Blue ray (d8 = 5). Dexterity saving throw; success = half damage.',
      },
    }),
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // D1a — long-tail batch 6 (clôture) : 3 derniers sorts SRD à dégâts
  // primaires + documentation des exclusions explicites (cas pour lesquels
  // damage[] N'EST PAS le bon encodage). Hand-curés contre SRD CC EN.
  // ═══════════════════════════════════════════════════════════════════════

  // Forbiddance — SRD CC L12994-13027 : « In addition, the spell damages
  // types of creatures that you choose when you cast it. Choose one or
  // more of the following: Aberrations, Celestials, Elementals, Fey,
  // Fiends, and Undead. When a creature of a chosen type enters the
  // spell’s area for the first time on a turn or ends its turn there,
  // the creature takes 5d10 Radiant or Necrotic damage (your choice
  // when you cast this spell). » Pas d'upcast, pas de jet de
  // sauvegarde (dégâts auto sur entrée pour les types ciblés).
  //
  // Type par défaut : `radiant` (le plus emblématique du sort, traduit
  // aussi par le nom « Interdiction » côté FR — protection sacrée).
  // Condition documente la variante nécrotique et la conditionnalité
  // sur le type de créature.
  'interdiction': [
    dmg('5d10', 'radiant', {
      resolution: 'auto',
      condition: {
        fr: 'Dégâts automatiques (pas de jet) : applicables UNIQUEMENT aux créatures des types choisis à l’incantation parmi Aberration, Céleste, Élémentaire, Fée, Fiélon, Mort-vivant. Type au choix à l’incantation : radiants (défaut) ou nécrotiques. Une cible de mot de passe (défini à l’incantation) peut traverser sans subir de dégâts. Zone : jusqu’à 3 700 m² × 9 m de haut, 1 jour de durée.',
        en: 'Automatic damage (no save): applies ONLY to creatures of the types chosen at casting from Aberration, Celestial, Elemental, Fey, Fiend, Undead. Damage type chosen at casting: Radiant (default) or Necrotic. A target speaking a password (set at casting) passes without damage. Area: up to 40,000 sq ft × 30 ft tall, 1 day duration.',
      },
    }),
  ],

  // Symbol — SRD CC L16614-16683 : 6 variantes (Death, Discord, Fear,
  // Pain, Sleep, Stunning). Seule la variante Death inflige des dégâts :
  // « Death. Each target makes a Constitution saving throw, taking 10d10
  // Necrotic damage on a failed save or half as much damage on a
  // successful save. » Les 5 autres variantes sont des conditions
  // (Discord, Fear, Pain → Incapacitated, Sleep → Unconscious, Stunning
  // → Stunned). Pas d'upcast.
  //
  // Encodage : 1 entrée damage[] pour la variante Death. Condition liste
  // les 5 autres variantes pour informer le lecteur (mais elles ne
  // produiront pas de damage[] — c'est l'effet stocké qui s'applique).
  'symbole': [
    dmg('10d10', 'necrotic', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Variante « Mort » uniquement : jet de sauvegarde de Constitution ; réussite = demi-dégâts. Les 5 autres variantes choisies à l’incantation n’infligent PAS de dégâts (et n’apparaissent donc pas en damage[]) : Discorde (querelles 1 min, Désavantage attaques/jets), Peur (Effrayé 1 min, fuite forcée), Douleur (Incapable 1 min), Sommeil (Inconscient 10 min, réveillable), Étourdissement (Étourdi 1 min). Sphère de 18 m de rayon déclenchée par un trigger choisi (toucher, distance, ouverture…).',
        en: '« Death » variant only: Constitution saving throw; success = half damage. The 5 other variants chosen at casting deal NO damage (and therefore don’t appear in damage[]): Discord (arguing 1 min, Disadvantage on attacks/checks), Fear (Frightened 1 min, forced flight), Pain (Incapacitated 1 min), Sleep (Unconscious 10 min, wakeable), Stunning (Stunned 1 min). 60-ft-radius Sphere triggered by a chosen condition (touch, distance, opening…).',
      },
    }),
  ],

  // Prismatic Wall — SRD CC L15328-15400 : mur multicolore à 7 couches.
  // Les 5 premières (Rouge, Orange, Jaune, Vert, Bleu) infligent chacune
  // 12d6 d'un type différent (feu, acide, foudre, poison, froid). Les
  // couches 6 (Indigo : Restrained → Petrified) et 7 (Violet : Blinded
  // → téléporté autre plan) sont des conditions, pas des dégâts. Save
  // de Dextérité par couche, demi-dégâts à la réussite. Pas d'upcast.
  //
  // Calque structurel de `embruns-prismatiques` (batch 5) : 5 entrées
  // damage[] parallèles. Chaque entrée porte sa couleur + son type ; la
  // condition explique le mur à 7 couches et les destructions
  // spécifiques (Cold détruit Rouge, Force détruit Jaune, etc.).
  'mur-prismatique': [
    dmg('12d6', 'fire', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Couche 1 Rouge (feu). Jet de sauvegarde de Dextérité par couche traversée ; réussite = demi-dégâts. Le mur a 5 couches infligeant des dégâts (Rouge, Orange, Jaune, Vert, Bleu — chacune 12d6 d’un type différent) + 2 couches de conditions (Indigo → Entravé/Pétrifié, Violet → Aveuglé/téléporté autre plan). Une cible qui traverse le mur subit les jets de chaque couche dans l’ordre. La couche Rouge est détruite par ≥ 25 dégâts de froid.',
        en: 'Layer 1 Red (Fire). Dexterity saving throw per layer traversed; success = half damage. Wall has 5 damage layers (Red, Orange, Yellow, Green, Blue — each 12d6 of a different type) + 2 condition layers (Indigo → Restrained/Petrified, Violet → Blinded/teleported other plane). A target crossing the wall saves against each layer in order. Red layer destroyed by ≥ 25 Cold damage.',
      },
    }),
    dmg('12d6', 'acid', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Couche 2 Orange (acide). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Détruite par un vent fort (ex. Souffle du vent).',
        en: 'Layer 2 Orange (Acid). Dexterity saving throw; success = half damage. Destroyed by strong wind (e.g. Gust of Wind).',
      },
    }),
    dmg('12d6', 'lightning', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Couche 3 Jaune (foudre). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Détruite par ≥ 60 dégâts de force.',
        en: 'Layer 3 Yellow (Lightning). Dexterity saving throw; success = half damage. Destroyed by ≥ 60 Force damage.',
      },
    }),
    dmg('12d6', 'poison', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Couche 4 Vert (poison). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Détruite par Passage sans trace (ou sort équivalent qui ouvre un passage sur surface solide).',
        en: 'Layer 4 Green (Poison). Dexterity saving throw; success = half damage. Destroyed by Passwall (or equivalent spell that opens a passage on a solid surface).',
      },
    }),
    dmg('12d6', 'cold', {
      resolution: 'saving-throw',
      condition: {
        fr: 'Couche 5 Bleu (froid). Jet de sauvegarde de Dextérité ; réussite = demi-dégâts. Détruite par ≥ 25 dégâts de feu.',
        en: 'Layer 5 Blue (Cold). Dexterity saving throw; success = half damage. Destroyed by ≥ 25 Fire damage.',
      },
    }),
  ],
};

/**
 * D1a — liste explicite des sorts SRD dont la description contient un
 * pattern « NdM dégâts » mais qui NE SONT PAS modélisables en `damage[]`
 * (ni primaires, ni secondaires). Sert au test bidirectionnel
 * `tests/srd-spell-damage.test.ts > intégrité bidirectionnelle` : tout
 * sort à dés détectable côté bundle DOIT être soit dans SRD_SPELL_DAMAGE,
 * soit dans cette liste — pas dans une zone grise non documentée.
 *
 * Catégories d'exclusion :
 *  - Pénalité conditionnelle rare (Téléportation mishap, Souhait stress,
 *    Porte dimensionnelle overcapacity, Fusion dans la pierre détruite,
 *    Songe psychic, Contact avec les plans, Quête violation).
 *  - Effet meta (Tremblement de terre : 50 PV structurels + 12d6 sur
 *    effondrement — la mécanique principale est Prone + fissures, le
 *    dégât est conditionnel à un effondrement de structure).
 *  - Threshold/seuil (Mot de pouvoir mortel : 12d12 est le SEUIL de PV
 *    en dessous duquel la cible meurt, pas des dégâts roulés).
 *  - Debuff (Rayon affaiblissant : -1d8 sur les jets de dégâts ennemis,
 *    pas un dégât infligé par le sort).
 *  - Heal (Festin des héros : 2d10 PV temporaires bonus).
 *  - Bonus à un jet (Résistance : 1d4 ajouté à un jet de sauvegarde).
 *  - Tic réactif éphémère sur une mécanique non-combat (Toile d’araignée :
 *    2d4 quand on brûle une toile — détail de destruction, pas du sort).
 */
export const SRD_SPELL_DAMAGE_EXCLUSIONS: ReadonlyArray<{
  slug: string;
  reason: string;
}> = [
  // Pénalités conditionnelles rares
  { slug: 'teleportation', reason: 'Table de mishap 1d100 — résultat aléatoire, pas un dégât roulé.' },
  { slug: 'souhait', reason: 'Stress post-Wish : 1d10 nécrotique par niveau de sort effacé pour les effets hors-liste — pénalité conditionnelle rare.' },
  { slug: 'porte-dimensionnelle', reason: 'Pénalité overcapacity : 4d6 force seulement si la téléportation rate (passager surnuméraire ou destination occupée).' },
  { slug: 'fusion-dans-la-pierre', reason: 'Pénalité : 6d6 force seulement si la pierre est détruite pendant la durée — pas le mode normal du sort.' },
  { slug: 'songe', reason: 'Pénalité post-rêve : 3d6 psychique seulement si le rêveur est Hostile et après le sort se termine.' },
  { slug: 'contact-avec-les-plans', reason: 'Pénalité d’échec : 6d6 psychique + Étourdi sur échec du jet de sauvegarde d’Int — coût d’incantation, pas un sort offensif.' },
  { slug: 'quete', reason: 'Pénalité de violation : 5d10 psychique par jour de violation — déclencheur narratif, pas un sort de dégâts.' },
  // Meta / threshold / debuff
  { slug: 'tremblement-de-terre', reason: 'Méta : 50 PV structurels + 12d6 bludgeoning seulement si effondrement de structure sur créature — mécanique principale = Prone + fissures.' },
  { slug: 'mot-de-pouvoir-mortel', reason: 'Threshold : 12d12 = SEUIL de PV (≤ 100) sous lequel la cible meurt instantanément, pas des dégâts roulés.' },
  { slug: 'rayon-affaiblissant', reason: 'Debuff : -1d8 sur les jets de dégâts de la cible (pénalité aux dégâts ENNEMIS), pas un dégât infligé par le sort.' },
  // Heals / bonus aux jets
  { slug: 'festin-des-heros', reason: 'Heal : 2d10 PV temporaires bonus, pas un dégât.' },
  { slug: 'resistance', reason: 'Bonus à un jet : 1d4 ajouté à un jet de sauvegarde, pas un dégât.' },
  // Tic réactif éphémère
  { slug: 'toile-d-araignee', reason: 'Détail de destruction : 2d4 feu quand on brûle une section de toile — pas une attaque du sort lui-même.' },
];

/**
 * Liste des slugs présents — utile pour les tests de couverture qui veulent
 * vérifier qu'un sort spécifique a bien été curé sans avoir à scanner le
 * record entier.
 */
export const SRD_SPELL_DAMAGE_SLUGS: readonly string[] = Object.keys(
  SRD_SPELL_DAMAGE,
);
