/**
 * Registry des effets mécaniques des Manifestations occultes (Eldritch
 * Invocations) — premier pas de la séquence D13a-e. Pose le pattern de
 * data-driven runtime à étendre pour les 4 autres invocations L1 :
 *
 *  - D13a (ce module) : `armor-of-shadows` — Armure du mage à volonté, passif AC.
 *  - D13b à venir     : `eldritch-mind` — avantage Concentration (passif save).
 *  - D13c à venir     : `pact-of-the-blade` — arme virtuelle (active combat).
 *  - D13d à venir     : `pact-of-the-chain` — familier amélioré (active utility).
 *  - D13e à venir     : `pact-of-the-tome` — grant de cantrips + rituels.
 *
 * Source SRD 5.2.1 (CC) — texte EN cité au plus court pour audit, voir
 * `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` pour la prose intégrale.
 *
 * Choix de structure : le bundle `invocations.json` reste plat (identité
 * + summary FR/EN), la mécanique vit ici pour ne pas re-renderer la pipeline
 * SRD à chaque ajout d'effet. Strictement parallèle à `srd-spell-damage.ts`
 * (séparation identité publique ↔ effet runtime).
 */

import type { CharacterClassEntry } from '@/shared/types/character';

/** Effets passifs qui s'appliquent sans action — calculés en dérivation. */
export type PassiveInvocationEffect =
  | {
      readonly kind: 'passive-mage-armor';
      /**
       * Mage Armor SRD 5.2.1 : "the target's base AC becomes 13 + its
       * Dexterity modifier". Ne s'applique QUE si la cible ne porte pas
       * d'armure. Cumule normalement avec bouclier (un bouclier n'est pas
       * une armure au sens SRD).
       *
       * Encodage en bonus +3 par rapport à la base désarmée (10+DEX) plutôt
       * qu'en override 13+DEX : reste compatible avec d'autres modificateurs
       * additifs futurs sans avoir à ré-encoder la base.
       */
      readonly bonus: 3;
      readonly requiresUnarmored: true;
    };

export interface EldritchInvocationEntry {
  readonly slug: string;
  readonly effect: PassiveInvocationEffect | null;
}

/**
 * Registre interne. Une entrée présente sans `effect` (`null`) marque une
 * invocation connue côté bundle mais sans effet runtime câblé (D13b-e à
 * venir). Une invocation absente du registre est ignorée silencieusement
 * côté moteur — ce n'est pas une erreur (anti-régression : un slug inconnu
 * dans `eldritchInvocations[]` ne doit pas crasher la fiche).
 */
const INVOCATION_REGISTRY: ReadonlyMap<string, EldritchInvocationEntry> =
  new Map<string, EldritchInvocationEntry>([
    [
      'armor-of-shadows',
      {
        slug: 'armor-of-shadows',
        effect: {
          kind: 'passive-mage-armor',
          bonus: 3,
          requiresUnarmored: true,
        },
      },
    ],
    // D13b-e — slugs L1 connus, effet câblé plus tard.
    ['eldritch-mind', { slug: 'eldritch-mind', effect: null }],
    ['pact-of-the-blade', { slug: 'pact-of-the-blade', effect: null }],
    ['pact-of-the-chain', { slug: 'pact-of-the-chain', effect: null }],
    ['pact-of-the-tome', { slug: 'pact-of-the-tome', effect: null }],
  ]);

export function getInvocationEntry(
  slug: string,
): EldritchInvocationEntry | null {
  return INVOCATION_REGISTRY.get(slug) ?? null;
}

/**
 * Aplatit toutes les invocations connues d'un personnage (toutes entrées
 * `classes[]` confondues — multi-classe Warlock × autre possible) en ne
 * gardant que celles présentes au registre. Pas d'erreur sur slug inconnu
 * (cf. justification ci-dessus).
 */
export function getKnownInvocationSlugs(
  classes: readonly CharacterClassEntry[],
): readonly string[] {
  const seen = new Set<string>();
  for (const entry of classes) {
    for (const slug of entry.eldritchInvocations) {
      if (INVOCATION_REGISTRY.has(slug)) seen.add(slug);
    }
  }
  return Array.from(seen);
}

/**
 * Bonus AC issu des invocations passives. Pour aujourd'hui : Armor of
 * Shadows uniquement (+3 quand pas d'armure portée). Le bouclier ne compte
 * pas comme armure — il est donc cumulable avec Mage Armor (SRD 5.2.1).
 *
 * Pourquoi cette fonction et pas un check inline dans `computeDisplayedAc` :
 *   1. Pattern réutilisable pour D13b-e (chaque invocation passive future
 *      ajoutera son propre bonus via une branche du `switch` ci-dessous).
 *   2. Testable en isolation — `ac.test.ts` peut continuer à se concentrer
 *      sur la composition `acFromArmor + Defense + Mage Armor`, et un
 *      `eldritch-invocations.test.ts` dédié couvre la résolution du registre.
 *   3. Rend la classe de bug "Mage Armor cumulé avec armure" structurellement
 *      impossible : le gate `requiresUnarmored` est validé ici, pas après-coup.
 */
export function computeInvocationAcBonus(input: {
  classes: readonly CharacterClassEntry[];
  hasEquippedBodyArmor: boolean;
}): number {
  const slugs = getKnownInvocationSlugs(input.classes);
  let bonus = 0;
  for (const slug of slugs) {
    const entry = getInvocationEntry(slug);
    const effect = entry?.effect;
    if (!effect) continue;
    switch (effect.kind) {
      case 'passive-mage-armor':
        if (!effect.requiresUnarmored || !input.hasEquippedBodyArmor) {
          bonus += effect.bonus;
        }
        break;
      // D13b-e — futurs cas. Pas de `default` (exhaustivité TS strict).
    }
  }
  return bonus;
}
