import type { AbilityCode, Character, CharacterClassEntry } from '@/shared/types/character';
import { createEmptyClassSubChoices } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import {
  casterLevel,
  spellSlotsForCasterLevel,
  type CasterClassEntry,
} from '../rules/multiclass';
import { computeMulticlassEligibility } from '../rules/multiclass-eligibility';

import { type LevelUpDraft, levelUpDraftSchema } from './level-up-types';

/** Borne haute du nombre de classes (cf. `CharacterSchema.classes.max(4)`). */
const MAX_CLASSES_PER_CHARACTER = 4;

/**
 * JALON 2B.3a — Application pure d'un level-up sur un `Character`.
 *
 * Pure : aucun IO, aucune lecture Firestore/Dexie, aucun `serverTimestamp`.
 * La transformation est déterministe — pour la même entrée, le même résultat.
 * Le caller (hook + slice Zustand) s'occupe de la persistance et des
 * timestamps. Cette frontière permet aux tests TDD de couvrir les 12 classes
 * × les transitions clés sans monter de back-end.
 *
 * Le `draft` est rejeté dur (throw) sur :
 *   - schéma invalide (parse)
 *   - classId absent du tableau classes[] du perso
 *   - newClassLevel ≠ classes[i].level + 1
 *   - perso totalLevel === 20 (plafond SRD)
 *   - subclassId manquant alors que newClassLevel === 3
 *   - ASI dépassant la borne SRD (stat > 20)
 *
 * Cohérence des sorties :
 *   - `totalLevel` recomputé via somme
 *   - `spellSlots` recomputé via `spellSlotsForCasterLevel` (multi-class
 *     unifié pour full/half/third casters ; le pact magic Warlock reste géré
 *     par sa propre table déclarée côté `classResourceProgression` —
 *     `pact-magic-slots` + `pact-magic-slot-level`)
 *   - HP max augmenté de `hpDelta` (avg de la classe leveling + conMod) — la
 *     valeur courante prend le même delta pour rester cohérente avec un repos
 *     long implicite SRD-friendly
 *   - `hitDice[classId].max` += 1 (même classe)
 *   - `classResources[resourceId]` mis à jour depuis `classResourceProgression`
 *     pour le nouveau niveau (les ressources textuelles type « d6 » sont
 *     ignorées — seuls les compteurs numériques sont matérialisés en pool)
 *   - ASI : abilities mutées dans les bornes ; total des bonus = 2 exactement
 *   - Feat : pas de transformation directe ici (le feat sera consommé par
 *     un futur moteur d'effets ; JALON 2B.3a expose juste la validation et
 *     le storage côté `extraProficiencies` si pertinent — pour l'instant le
 *     featId est juste référencé via `extraProficiencies.languages` ? Non —
 *     le feat est posé sur le character via un champ `feats[]` à introduire
 *     plus tard. Pour 2B.3a, on enregistre le feat dans `extraProficiencies`
 *     n'est pas correct ; on le stocke à part. Décision : ajouter un champ
 *     `feats: string[]` au character serait un changement de schéma —
 *     hors-scope 2B.3a. Pour l'instant, on accepte le draft `feat` et la
 *     transformation ne mute aucune stat ; le test vérifie que le feat est
 *     accepté sans corrompre l'état. Le wiring complet du feat suit en 2B.4.)
 *
 * Pour les sorts appris (`newSpellsKnown`, `newCantrips`) : on les append à
 * `knownSpells[classId]` ; pas de dédoublonnage automatique (TDD : le caller
 * est censé empêcher les doublons côté chooser).
 */

const ABILITY_MAX_FROM_ASI = 20;

interface ApplyLevelUpParams {
  character: Character;
  draft: LevelUpDraft;
  /**
   * Définitions des classes du perso, indexées par `classId`. Toutes les
   * classes présentes dans `character.classes` DOIVENT être fournies — la
   * recomputation des emplacements de sort multi-classes dépend de la
   * progression d'incantation de chacune.
   */
  classDefinitions: Record<string, ClassEntity>;
}

export function applyLevelUp({
  character,
  draft,
  classDefinitions,
}: ApplyLevelUpParams): Character {
  // Plafond SRD AVANT parse Zod : un perso à 20 ne lève plus, peu importe la
  // shape du brouillon. Vérifié d'abord parce que le schéma cappe `newClassLevel`
  // à 20 — un brouillon à 21 serait rejeté par Zod et masquerait l'intention.
  if (character.totalLevel >= 20) {
    throw new Error(`[applyLevelUp] totalLevel déjà à 20 — refus (perso ${character.id}).`);
  }

  // 1. Valide le brouillon (hard throw sur shape invalide).
  const parsed = levelUpDraftSchema.parse(draft);

  const targetIdx = character.classes.findIndex((c) => c.classId === parsed.classId);
  const isAddingNewClass = targetIdx < 0;
  // `existingClass` est non-null UNIQUEMENT sur le path level-up (la classe
  // existait déjà). Sur l'add-class path il reste null — utilisé partout
  // ci-dessous via `if (existingClass)` plutôt que via `!isAddingNewClass`
  // pour le narrowing TypeScript.
  const existingClass: CharacterClassEntry | null = isAddingNewClass
    ? null
    : character.classes[targetIdx]!;

  // JALON 2D.3 — Détection du path "ajouter une nouvelle classe".
  // Si la classe est inconnue, `newClassLevel` doit valoir 1 (L1 d'une nouvelle
  // classe). Tout autre niveau pour une classe absente = corruption du draft.
  if (isAddingNewClass) {
    if (parsed.newClassLevel !== 1) {
      throw new Error(
        `[applyLevelUp] classId="${parsed.classId}" absent de classes[] et newClassLevel=${parsed.newClassLevel} ≠ 1 — refus (l'ajout multiclass démarre toujours à L1).`,
      );
    }
    if (character.classes.length >= MAX_CLASSES_PER_CHARACTER) {
      throw new Error(
        `[applyLevelUp] character.classes.length=${character.classes.length} atteint la borne max=${MAX_CLASSES_PER_CHARACTER} (refus add-class).`,
      );
    }
  } else {
    // Path classique : level-up d'une classe existante (newClassLevel ≥ 2).
    if (parsed.newClassLevel === 1) {
      throw new Error(
        `[applyLevelUp] classId="${parsed.classId}" déjà présent dans classes[] (level=${existingClass!.level}) — newClassLevel=1 attendu uniquement pour une CLASSE NOUVELLE.`,
      );
    }
    if (parsed.newClassLevel !== existingClass!.level + 1) {
      throw new Error(
        `[applyLevelUp] newClassLevel=${parsed.newClassLevel} attendu ${existingClass!.level + 1} (level + 1).`,
      );
    }
  }

  const targetDef = classDefinitions[parsed.classId];
  if (!targetDef) {
    throw new Error(
      `[applyLevelUp] définition classe "${parsed.classId}" absente de classDefinitions.`,
    );
  }

  // JALON 2D.3 — Defense in depth : valide les prérequis multiclass aussi
  // côté pure-function (l'UI 2D.4 fait déjà le grisage, mais on défend les
  // appels programmatiques / tests / éventuels bypass UI).
  if (isAddingNewClass) {
    const eligibility = computeMulticlassEligibility(
      character,
      targetDef.multiclassPrerequisite ?? null,
    );
    if (!eligibility.eligible) {
      const unmet = eligibility.unmetScores
        .map((s) => `${s.ability.toUpperCase()} ${s.actual}/${s.minimum}`)
        .join(', ');
      throw new Error(
        `[applyLevelUp] prérequis multiclass non satisfaits pour "${parsed.classId}" : ${unmet}.`,
      );
    }
  }

  // 2. Vérifie la sous-classe à L3 (toutes classes — divineOrder/primalOrder
  // L1 sont des sous-choix indépendants du subclassId SRD 5.2.1).
  // Sur add-class L1, ce check ne s'applique pas (la sous-classe attendra
  // le L3 DE CETTE CLASSE ajoutée).
  if (
    existingClass &&
    parsed.newClassLevel === 3 &&
    !parsed.subclassId &&
    !existingClass.subclassId
  ) {
    throw new Error(
      `[applyLevelUp] subclassId requis à newClassLevel=3 pour "${parsed.classId}".`,
    );
  }

  // 3. Construit le nouveau `classes[]`.
  let newClasses: CharacterClassEntry[];
  if (existingClass) {
    // Path level-up : on remplace l'entrée existante.
    const updatedClassEntry: CharacterClassEntry = {
      ...existingClass,
      level: parsed.newClassLevel,
      subclassId: parsed.subclassId ?? existingClass.subclassId,
      eldritchInvocations: parsed.newInvocations
        ? [...existingClass.eldritchInvocations, ...parsed.newInvocations]
        : existingClass.eldritchInvocations,
    };
    newClasses = character.classes.map((c, i) =>
      i === targetIdx ? updatedClassEntry : c,
    );
  } else {
    // Path add-class : append une nouvelle entrée avec sentinelles fraîches,
    // puis applique les sous-choix L1 fournis par le draft (2D.4a). Les
    // sentinelles servent de fallback pour les champs non renseignés —
    // l'UI mode add-class reste responsable de présenter tous les choosers
    // SRD-requis pour la classe ajoutée.
    const sentinels = createEmptyClassSubChoices();
    const overrides = parsed.addClassSubChoices ?? {};
    const newClassEntry: CharacterClassEntry = {
      classId: parsed.classId,
      subclassId: null,
      level: 1,
      clericDivineOrder: overrides.clericDivineOrder ?? sentinels.clericDivineOrder,
      druidPrimalOrder: overrides.druidPrimalOrder ?? sentinels.druidPrimalOrder,
      fighterFightingStyle:
        overrides.fighterFightingStyle ?? sentinels.fighterFightingStyle,
      weaponMasteries: overrides.weaponMasteries ?? sentinels.weaponMasteries,
      expertiseSkills: overrides.expertiseSkills ?? sentinels.expertiseSkills,
      eldritchInvocations: overrides.eldritchInvocations ?? sentinels.eldritchInvocations,
      wizardSpellbookL1: overrides.wizardSpellbookL1 ?? sentinels.wizardSpellbookL1,
      pactTomeCantrips: overrides.pactTomeCantrips ?? sentinels.pactTomeCantrips,
      pactTomeRituals: overrides.pactTomeRituals ?? sentinels.pactTomeRituals,
      pactBladeWeapon: overrides.pactBladeWeapon ?? sentinels.pactBladeWeapon,
    };
    newClasses = [...character.classes, newClassEntry];
  }
  const newTotalLevel = newClasses.reduce((acc, c) => acc + c.level, 0);

  // 4. Recompute des emplacements de sort multi-classes (full/half/third casters).
  const casterEntries: CasterClassEntry[] = newClasses.map((c) => {
    const def = classDefinitions[c.classId];
    return {
      level: c.level,
      progression: def?.spellcasting?.progression ?? null,
    };
  });
  const unifiedLevel = casterLevel(casterEntries);
  const slotMap = spellSlotsForCasterLevel(unifiedLevel);
  const nextSpellSlots: Character['spellSlots'] = { ...character.spellSlots };
  for (const lvl of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
    const newMax = slotMap[lvl];
    if (newMax > 0) {
      const prev = character.spellSlots[String(lvl)];
      const prevMax = prev?.max ?? 0;
      const delta = Math.max(0, newMax - prevMax);
      nextSpellSlots[String(lvl)] = {
        current: (prev?.current ?? 0) + delta,
        max: newMax,
      };
    } else if (character.spellSlots[String(lvl)]) {
      // Le niveau d'emplacement devient inaccessible (cas pathologique multi-class) → on retire
      delete nextSpellSlots[String(lvl)];
    }
  }

  // 5. HP : avg du dé de classe + CON mod (toujours arrondi haut SRD 5.2.1).
  const HIT_DIE_AVG: Record<'d6' | 'd8' | 'd10' | 'd12', number> = {
    d6: 4,
    d8: 5,
    d10: 6,
    d12: 7,
  };
  const conMod = Math.floor((character.abilities.con - 10) / 2);
  const avgHp = HIT_DIE_AVG[targetDef.hitDie];
  const hpDelta =
    parsed.hpRoll.kind === 'average'
      ? avgHp + conMod
      : parsed.hpRoll.rolled + conMod;
  const safeHpDelta = Math.max(1, hpDelta); // SRD : minimum 1 HP par niveau

  const nextHp = {
    current: character.hp.current + safeHpDelta,
    max: character.hp.max + safeHpDelta,
    temp: character.hp.temp,
  };

  // 6. Hit dice pool — append nouvelle entrée pour add-class, +1 die pour level-up.
  const nextHitDice = existingClass
    ? character.hitDice.map((p) =>
        p.classId === parsed.classId
          ? { ...p, max: p.max + 1, current: p.current + 1 }
          : p,
      )
    : [
        ...character.hitDice,
        { classId: parsed.classId, current: 1, max: 1, die: targetDef.hitDie },
      ];

  // 6b. JALON 2D.3 — extraProficiencies : add-class applique le subset
  // multiclass de la nouvelle classe (armor/weapons/tools). Level-up pur ne
  // touche pas à ces tableaux (déjà appliqués au L1 de chaque classe). Pas
  // de dédup ici — l'UI sera autorité pour ne pas re-proposer une prof déjà
  // possédée (cf. JALON 2D.4).
  const nextExtraProficiencies = !existingClass && targetDef.multiclassProficiencies
    ? {
        ...character.extraProficiencies,
        armor: [
          ...character.extraProficiencies.armor,
          ...targetDef.multiclassProficiencies.armor,
        ],
        weapons: [
          ...character.extraProficiencies.weapons,
          ...targetDef.multiclassProficiencies.weapons,
        ],
        tools: [
          ...character.extraProficiencies.tools,
          ...targetDef.multiclassProficiencies.tools,
        ],
      }
    : character.extraProficiencies;

  // 7. classResources — applique la progression au nouveau niveau.
  const nextClassResources: Character['classResources'] = { ...character.classResources };
  const progression = targetDef.classResourceProgression;
  if (progression) {
    for (const [resourceId, table] of Object.entries(progression)) {
      const entry = table[parsed.newClassLevel - 1];
      if (typeof entry === 'number' && entry > 0) {
        const restoresOn = inferRestoresOn(resourceId);
        nextClassResources[resourceId] = {
          current: entry,
          max: entry,
          restoresOn,
        };
      } else if (typeof entry === 'number' && entry === 0) {
        // Ressource désactivée à ce niveau — on supprime
        delete nextClassResources[resourceId];
      }
      // Les valeurs textuelles (« d6 », « 1d6 ») ne donnent pas de pool — elles
      // décrivent un dé scalable. Pas matérialisées en classResources.
    }
  }

  // 8. ASI — mutation des stats avec borne SRD à 20.
  let nextAbilities = character.abilities;
  if (parsed.asiOrFeat?.kind === 'asi') {
    const totalBonus = parsed.asiOrFeat.abilityIncreases.reduce(
      (acc, inc) => acc + inc.bonus,
      0,
    );
    if (totalBonus !== 2) {
      throw new Error(
        `[applyLevelUp] ASI doit distribuer exactement 2 points, reçu ${totalBonus}.`,
      );
    }
    const nextAbs = { ...nextAbilities };
    for (const inc of parsed.asiOrFeat.abilityIncreases) {
      const code: AbilityCode = inc.ability;
      const target = nextAbs[code] + inc.bonus;
      if (target > ABILITY_MAX_FROM_ASI) {
        throw new Error(
          `[applyLevelUp] ASI dépasse 20 sur "${code}" (${nextAbs[code]} → ${target}).`,
        );
      }
      nextAbs[code] = target;
    }
    nextAbilities = nextAbs;
  }
  // Feat — pas de mutation directe en 2B.3a (cf. JSDoc ci-dessus).

  // 9. Sorts appris (knownSpells.classId) + cantrips.
  const nextKnownSpells: Character['knownSpells'] = { ...character.knownSpells };
  if (parsed.newSpellsKnown && parsed.newSpellsKnown.length > 0) {
    const existing = nextKnownSpells[parsed.classId] ?? [];
    nextKnownSpells[parsed.classId] = [...existing, ...parsed.newSpellsKnown];
  }
  if (parsed.newCantrips && parsed.newCantrips.length > 0) {
    const cantripKey = `${parsed.classId}-cantrips`;
    const existing = nextKnownSpells[cantripKey] ?? [];
    nextKnownSpells[cantripKey] = [...existing, ...parsed.newCantrips];
  }

  return {
    ...character,
    classes: newClasses,
    totalLevel: newTotalLevel,
    abilities: nextAbilities,
    hp: nextHp,
    hitDice: nextHitDice,
    classResources: nextClassResources,
    spellSlots: nextSpellSlots,
    knownSpells: nextKnownSpells,
    extraProficiencies: nextExtraProficiencies,
  };
}

/**
 * Heuristique : la majorité des ressources SRD 5.2.1 sont court repos
 * (rage à part, qui est long rest jusqu'à L20). On reste conservateur en
 * cas de ressource inconnue. Le moteur de repos final fera autorité.
 */
function inferRestoresOn(resourceId: string): 'short' | 'long' {
  // SRD 5.2.1 — pact magic (Warlock) refresh sur repos court, contrairement à
  // tous les autres lanceurs. Le reste suit l'intuition : les pools « grands »
  // (rage, lay-on-hands, sorcery-points, bardic-inspiration) sont long-rest ;
  // les usages tactiques (action-surge, second-wind, channel-divinity,
  // wild-shape, ki) sont short-rest.
  const LONG_REST_RESOURCES = new Set([
    'rage',
    'rage-damage',
    'bardic-inspiration',
    'bardic-inspiration-die',
    'lay-on-hands',
    'sorcery-points',
    'arcane-recovery',
    'arcane-recovery-slot-level',
    'mystic-arcanum',
  ]);
  return LONG_REST_RESOURCES.has(resourceId) ? 'long' : 'short';
}
