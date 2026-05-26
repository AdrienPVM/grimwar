/**
 * Registry des effets mécaniques des Manifestations occultes (Eldritch
 * Invocations) — séquence D13a-e. Pose le pattern de data-driven runtime
 * étendu pour chaque invocation L1 :
 *
 *  - D13a : `armor-of-shadows` — Armure du mage à volonté, passif AC.
 *  - D13b : `eldritch-mind` — avantage aux jets de Constitution pour
 *           maintenir la Concentration (passif save).
 *  - D13c : `pact-of-the-blade` — arme de pacte (feature active :
 *           Charisme pour atk/dmg, type de dégâts au choix).
 *  - D13d : `pact-of-the-chain` — familier amélioré (feature active :
 *           Appel de familier gratuit + formes spéciales).
 *  - D13e : `pact-of-the-tome` — Codex des Ombres (feature active : grant
 *           3 sorts mineurs + 2 rituels L1 de n'importe quelle classe).
 *           LIVRÉ. Séquence D13a-e CLOSE.
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

/**
 * Discriminated union des effets runtime câblés. Inclut deux catégories
 * structurelles :
 *
 *  - **Passifs** (préfixe `passive-…`) : s'appliquent sans action joueur,
 *    sont consommés par les dérivations de la fiche (AC, save advantage…).
 *  - **Features actives** (préfixe `feature-…`) : nécessitent une action
 *    joueur in-game (action bonus, magic action, etc.). Le moteur expose
 *    la mécanique mais ne décide pas pour le joueur — celui-ci annonce ou
 *    déclenche au MJ. Câblage combat à venir (D24 encounters).
 */
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
    }
  | {
      readonly kind: 'passive-concentration-advantage';
      /**
       * Eldritch Mind SRD 5.2.1 : "You have Advantage on Constitution
       * saving throws that you make to maintain Concentration."
       *
       * Indicateur booléen ; l'application du désavantage/avantage côté
       * dés est consommée par la fiche / le dice modal le jour où les
       * jets de Concentration auront une UI dédiée (D24 encounters).
       * Aujourd'hui, l'info est exposée au mode Combat pour signaler le
       * bonus permanent au joueur (puis appliqué manuellement en mode
       * physique ou par la couche dés digitale future).
       */
      readonly target: 'concentration-save';
    }
  | {
      readonly kind: 'feature-pact-chain-familiar';
      /**
       * Pact of the Chain SRD 5.2.1 : "You learn the Find Familiar spell
       * and can cast it as a Magic action without expending a spell slot.
       * When you cast the spell, you choose one of the normal forms for
       * your familiar or one of the following special forms…"
       *
       * Le bundle `invocations.json > pact-of-the-chain.summary` liste 4
       * formes spéciales (Imp / Pseudodragon / Quasit / Sprite) — extrait
       * de `scripts/data/srd-invocations.ts`. Le SRD 5.2.1 réel en mentionne
       * 7 (ajoute Skeleton, Sphinx of Wonder, Venomous Snake) — l'écart
       * entre bundle et SRD est documenté en DEBT D13d-followup-summary
       * et corrigeable indépendamment. La liste ci-dessous reflète
       * STRICTEMENT le bundle pour éviter une divergence registre↔bundle.
       *
       * Action `magic-action` (pas `ritual` malgré le wording FR du bundle
       * — le SRD 5.2.1 distingue `Magic action` de `Ritual` ; Pact of the
       * Chain est l'action magique sans slot, le sort sous-jacent reste
       * Rituel s'il est lancé hors-feature). La distinction est posée pour
       * D24 (encounters) où l'action timer compte.
       *
       * Statblocks des formes spéciales : 4 entrées à ajouter dans
       * `public/data/summoned-creatures.json` (D13d-followup-statblocks),
       * différé hors scope D13d-data-layer pour ne pas mélanger
       * extraction PDF + câblage feature.
       */
      readonly grantedSpellId: 'find-familiar';
      readonly specialForms: readonly [
        'imp',
        'pseudodragon',
        'quasit',
        'sprite',
      ];
      readonly actionType: 'magic-action';
      readonly noSlotRequired: true;
    }
  | {
      readonly kind: 'feature-pact-tome-grant';
      /**
       * Pact of the Tome SRD 5.2.1 : "Cantrips and Rituals. When the book
       * appears, choose three cantrips, and choose two level 1 spells that
       * have the Ritual tag. The spells can be from any class's spell list,
       * and they must be spells you don't already have prepared. While the
       * book is on your person, you have the chosen spells prepared, and
       * they function as Warlock spells for you. Spellcasting Focus. You
       * can use the book as a Spellcasting Focus."
       *
       * 3 cantrips au choix de n'importe quelle classe + 2 sorts L1 marqués
       * « Ritual » au choix de n'importe quelle classe. Préparés en dehors
       * du quota Warlock standard.
       *
       * Le grant fonctionne au L1 dès la sélection du Pact. Le câblage
       * `knownSpells['warlock-tome']` (entrée distincte dans la fiche pour
       * matérialiser la source) + le chooser au wizard L1 sont différés à
       * un mini-plan post-D13e (D13e-followup-grant). Aujourd'hui, l'info
       * est exposée pour annonce manuelle au MJ via la modale.
       */
      readonly cantripsGranted: 3;
      readonly ritualsGranted: 2;
      readonly ritualSpellLevel: 1;
      readonly spellSource: 'any-class';
      readonly providesSpellcastingFocus: true;
    }
  | {
      readonly kind: 'feature-pact-weapon';
      /**
       * Pact of the Blade SRD 5.2.1 : "As a Bonus Action, you can conjure
       * a pact weapon in your hand — a Simple or Martial Melee weapon of
       * your choice with which you bond…  Whenever you attack with the
       * bonded weapon, you can use your Charisma modifier for the attack
       * and damage rolls instead of using Strength or Dexterity; and you
       * can cause the weapon to deal Necrotic, Psychic, or Radiant damage
       * or its normal damage type."
       *
       * Le pact weapon n'est PAS un objet d'inventaire — c'est une feature
       * runtime qui décrit COMMENT le joueur attaque quand il choisit
       * d'invoquer son arme de pacte au combat. Le wizard chooser pour
       * pré-sélectionner l'arme bonded est différé (mini-plan dédié post-
       * D13c — convention par défaut SRD : choix au moment de l'invocation
       * in-game, pas au wizard).
       *
       * Ces 4 champs encodent les paramètres mécaniques exposés au joueur
       * via la modale Mécanique. Aucune intégration `attacks-list` côté
       * Combat mode aujourd'hui — câblage différé à D24 (encounters).
       */
      readonly attackAbility: 'cha';
      readonly bondedWeaponCategories: readonly ['simple-melee', 'martial-melee'];
      readonly damageTypeChoices: readonly [
        'necrotic',
        'psychic',
        'radiant',
        'normal',
      ];
      readonly actionType: 'bonus-action';
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
    [
      'eldritch-mind',
      {
        slug: 'eldritch-mind',
        effect: {
          kind: 'passive-concentration-advantage',
          target: 'concentration-save',
        },
      },
    ],
    [
      'pact-of-the-blade',
      {
        slug: 'pact-of-the-blade',
        effect: {
          kind: 'feature-pact-weapon',
          attackAbility: 'cha',
          bondedWeaponCategories: ['simple-melee', 'martial-melee'],
          damageTypeChoices: ['necrotic', 'psychic', 'radiant', 'normal'],
          actionType: 'bonus-action',
        },
      },
    ],
    [
      'pact-of-the-chain',
      {
        slug: 'pact-of-the-chain',
        effect: {
          kind: 'feature-pact-chain-familiar',
          grantedSpellId: 'find-familiar',
          specialForms: ['imp', 'pseudodragon', 'quasit', 'sprite'],
          actionType: 'magic-action',
          noSlotRequired: true,
        },
      },
    ],
    [
      'pact-of-the-tome',
      {
        slug: 'pact-of-the-tome',
        effect: {
          kind: 'feature-pact-tome-grant',
          cantripsGranted: 3,
          ritualsGranted: 2,
          ritualSpellLevel: 1,
          spellSource: 'any-class',
          providesSpellcastingFocus: true,
        },
      },
    ],
  ]);

export function getInvocationEntry(
  slug: string,
): EldritchInvocationEntry | null {
  return INVOCATION_REGISTRY.get(slug) ?? null;
}

/**
 * IDs des statblocks (cf. `public/data/summoned-creatures.json`) référencés
 * par l'invocation `pact-of-the-chain`. Slugs FR cohérents avec le bundle
 * SRD-FR (esprit-follet = Sprite, sphinx-merveilleux = Sphinx of Wonder).
 *
 * Le SRD 5.2.1 mentionne 7 formes spéciales (Imp / Pseudodragon / Quasit /
 * Sprite / Sphinx of Wonder / Venomous Snake / Skeleton). Le bundle
 * `invocations.json > pact-of-the-chain.summary` n'en liste qu'une partie
 * (gap traqué D13d-followup-summary). Cette constante reflète les statblocks
 * RÉELLEMENT bundlés à ce jour — utilisée par
 * `tests/content-referential-integrity.test.ts` pour considérer ces 4
 * statblocks comme « référencés par une invocation », pas orphelins.
 */
export const PACT_OF_THE_CHAIN_STATBLOCK_IDS = [
  'pseudodragon',
  'quasit',
  'sphinx-merveilleux',
  'esprit-follet',
] as const;

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
      case 'passive-concentration-advantage':
        // Concentration advantage ne touche pas la CA — pas de contribution
        // ici. Géré séparément par `hasConcentrationAdvantage`.
        break;
      case 'feature-pact-weapon':
        // Pact of the Blade ne touche pas la CA — c'est une feature
        // d'attaque, pas une protection. Pas de contribution ici.
        break;
      case 'feature-pact-chain-familiar':
        // Pact of the Chain ne touche pas la CA — c'est une feature de
        // grant + invocation, pas de protection. Pas de contribution ici.
        break;
      case 'feature-pact-tome-grant':
        // Pact of the Tome ne touche pas la CA — c'est un grant de sorts,
        // pas de protection. Pas de contribution ici.
        break;
      // Séquence D13a-e CLOSE. Pas de `default` (exhaustivité TS strict).
    }
  }
  return bonus;
}

/**
 * D13b — Eldritch Mind. Le personnage a-t-il l'avantage aux jets de
 * sauvegarde de Constitution pour maintenir la Concentration ?
 *
 * Pattern miroir de `computeInvocationAcBonus` mais pour un drapeau binaire
 * plutôt qu'un cumul numérique : la 5e SRD ne définit pas « double
 * avantage » — un personnage a, ou n'a pas, l'avantage. Pas de cumul. Les
 * sources d'avantage Concentration multiples (rares au L1, mais
 * possibles en multi-classe via War Caster feat ou items magiques au L5+)
 * convergent toutes vers la même valeur booléenne.
 */
export function hasConcentrationAdvantage(
  classes: readonly CharacterClassEntry[],
): boolean {
  const slugs = getKnownInvocationSlugs(classes);
  for (const slug of slugs) {
    const effect = getInvocationEntry(slug)?.effect;
    if (effect?.kind === 'passive-concentration-advantage') return true;
  }
  return false;
}

/**
 * D13c — Pact of the Blade. Le personnage a-t-il accès à la feature Arme
 * de pacte ?
 *
 * Booléen (un personnage a, ou n'a pas, la feature ; en cas de multi-class
 * Warlock × Warlock improbable, ou ré-introduction du slug par un grant
 * futur, on retourne quand même `true` une seule fois).
 *
 * Le câblage côté Combat mode (attaques-list, intégration moteur de dés)
 * est différé à un mini-plan post-D13c. Pour aujourd'hui, l'info est
 * exposée pour 2 cas d'usage : (1) annonce manuelle au MJ ; (2) rendu UI
 * structuré dans la modale d'invocation (`<InvocationEffectCard>`).
 */
export function hasPactOfTheBlade(
  classes: readonly CharacterClassEntry[],
): boolean {
  const slugs = getKnownInvocationSlugs(classes);
  for (const slug of slugs) {
    const effect = getInvocationEntry(slug)?.effect;
    if (effect?.kind === 'feature-pact-weapon') return true;
  }
  return false;
}

/**
 * D13d — Pact of the Chain. Le personnage a-t-il la feature Pacte de la
 * chaîne (Appel de familier gratuit + formes spéciales) ?
 *
 * Booléen, pattern miroir de `hasPactOfTheBlade`. Câblage côté moteur
 * d'invocation (déclenchement de Find Familiar + affichage des formes
 * spéciales en chooser) différé à un mini-plan post-D13d. Aujourd'hui,
 * l'info est exposée pour annonce manuelle au MJ via la modale
 * `<InvocationEffectCard>`.
 */
export function hasPactOfTheChain(
  classes: readonly CharacterClassEntry[],
): boolean {
  const slugs = getKnownInvocationSlugs(classes);
  for (const slug of slugs) {
    const effect = getInvocationEntry(slug)?.effect;
    if (effect?.kind === 'feature-pact-chain-familiar') return true;
  }
  return false;
}

/**
 * D13e — Pact of the Tome. Le personnage a-t-il la feature Codex des
 * Ombres (3 cantrips + 2 rituels L1 de n'importe quelle classe + focus
 * d'incantation) ?
 *
 * Booléen, pattern miroir de `hasPactOfTheBlade` / `hasPactOfTheChain`.
 * Câblage côté `knownSpells['warlock-tome']` (entrée distincte pour
 * matérialiser la source du grant) + chooser au wizard L1 différés à un
 * mini-plan post-D13e. Aujourd'hui, l'info est exposée pour annonce
 * manuelle au MJ via la modale.
 */
export function hasPactOfTheTome(
  classes: readonly CharacterClassEntry[],
): boolean {
  const slugs = getKnownInvocationSlugs(classes);
  for (const slug of slugs) {
    const effect = getInvocationEntry(slug)?.effect;
    if (effect?.kind === 'feature-pact-tome-grant') return true;
  }
  return false;
}
