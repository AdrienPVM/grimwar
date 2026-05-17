/**
 * SRD 5.2.1 Weapon Mastery — 8 propriétés × 37 armes éligibles.
 *
 * Source unique de vérité (plan 13.7 §0.4) : table C.1 de
 * `docs/AUDIT-SRD-COMPLETUDE.md`, elle-même issue de :
 *   - `content-sources/extracted/raw/SRD_CC_v5.2.1.txt:8526-8632` (EN)
 *   - `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt:9857-9971` (FR)
 *
 * Encodage manuel hand-curated (stratégie β1 de l'audit § F.3 — recommandée
 * pour le jalon 1, parse PDF différé à un futur plan). Aucune lecture de
 * `content-sources/aidedd/*` ou de PDF non-SRD.
 *
 * Note Trident : le bundle utilise l'id `tr-ide-nt` (typo de parse héritée) —
 * on map sur cet id pour ne pas casser les références inventaire existantes.
 * Le slug sera corrigé en plan 13.10 (cleanup contenu).
 */

export type MasteryProperty =
  | 'cleave'
  | 'graze'
  | 'nick'
  | 'push'
  | 'sap'
  | 'slow'
  | 'topple'
  | 'vex';

/** Les 8 propriétés Mastery avec leur description courte FR + EN. */
export const SRD_MASTERY_PROPERTIES: Array<{
  id: MasteryProperty;
  name: { fr: string; en: string };
  effect: { fr: string; en: string };
}> = [
  {
    id: 'cleave',
    name: { fr: 'Enchaînement', en: 'Cleave' },
    effect: {
      fr: "Coup CàC réussi → attaque suppl. sur 2e créature à 1,50 m. Pas de mod. Cara. 1×/tour.",
      en: 'On a melee hit, make an extra attack against a 2nd creature within 5 ft. No ability mod. Once per turn.',
    },
  },
  {
    id: 'graze',
    name: { fr: 'Écorchure', en: 'Graze' },
    effect: {
      fr: "Jet d'attaque raté → dégâts = mod. Cara. d'attaque (même type).",
      en: "On a missed attack, deal damage equal to the attack's ability modifier (same type).",
    },
  },
  {
    id: 'nick',
    name: { fr: 'Coup double', en: 'Nick' },
    effect: {
      fr: "Attaque suppl. Light dans l'action Attaque (au lieu d'Action Bonus). 1×/tour.",
      en: 'Make the Light extra attack as part of the Attack action (instead of bonus action). Once per turn.',
    },
  },
  {
    id: 'push',
    name: { fr: 'Poussée', en: 'Push' },
    effect: {
      fr: 'Coup réussi → repousse 3 m si cible ≤Large.',
      en: 'On a hit, push the target 10 ft. away if Large or smaller.',
    },
  },
  {
    id: 'sap',
    name: { fr: 'Sape', en: 'Sap' },
    effect: {
      fr: "Coup réussi → Désavantage au prochain jet d'attaque de la cible.",
      en: "On a hit, the target has Disadvantage on its next attack roll.",
    },
  },
  {
    id: 'slow',
    name: { fr: 'Ralentissement', en: 'Slow' },
    effect: {
      fr: 'Coup réussi avec dégâts → Vitesse −3 m (non cumulable).',
      en: 'On a damaging hit, reduce target Speed by 10 ft. (not cumulative).',
    },
  },
  {
    id: 'topple',
    name: { fr: 'Renversement', en: 'Topple' },
    effect: {
      fr: 'Coup réussi → JS Con (DD 8 + mod cara + PB). Échec = Prone.',
      en: 'On a hit, force a Con save (DC 8 + ability mod + PB). Fail = Prone.',
    },
  },
  {
    id: 'vex',
    name: { fr: 'Ouverture', en: 'Vex' },
    effect: {
      fr: "Coup réussi avec dégâts → Avantage au prochain jet d'attaque sur cette cible.",
      en: 'On a damaging hit, gain Advantage on your next attack roll against the same target.',
    },
  },
];

/** Map weaponId → Mastery property. 37 armes éligibles SRD 5.2.1 § C.1. */
export const SRD_WEAPON_MASTERY: Record<string, MasteryProperty> = {
  // Armes simples corps-à-corps
  club: 'slow',
  dagger: 'nick',
  greatclub: 'push',
  handaxe: 'vex',
  javelin: 'slow',
  'light-hammer': 'nick',
  mace: 'sap',
  quarterstaff: 'topple',
  sickle: 'nick',
  spear: 'sap',
  // Armes simples à distance
  dart: 'vex',
  'light-crossbow': 'slow',
  shortbow: 'vex',
  sling: 'slow',
  // Armes martiales corps-à-corps
  battleaxe: 'topple',
  flail: 'sap',
  glaive: 'graze',
  greataxe: 'cleave',
  greatsword: 'graze',
  halberd: 'cleave',
  lance: 'topple',
  longsword: 'sap',
  maul: 'topple',
  morningstar: 'sap',
  pike: 'push',
  rapier: 'vex',
  scimitar: 'nick',
  shortsword: 'vex',
  // Trident : id bundle = `tr-ide-nt` (typo héritée à corriger en plan 13.10).
  'tr-ide-nt': 'topple',
  warhammer: 'push',
  'war-pick': 'sap',
  whip: 'slow',
  // Armes martiales à distance
  blowgun: 'vex',
  'hand-crossbow': 'vex',
  'heavy-crossbow': 'push',
  longbow: 'slow',
  musket: 'slow',
  pistol: 'vex',
};

/** Compteur de référence pour `tests/srd-counters.test.ts` : 37 armes éligibles. */
export const SRD_WEAPON_MASTERY_COUNT = Object.keys(SRD_WEAPON_MASTERY).length;
