import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { addItemToInventory } from '@/shared/lib/inventory';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { maxHp, totalLevel } from '@/shared/lib/rules/multiclass';
import { buildSkillProficiencies } from '@/shared/lib/rules/skill-proficiencies';
import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import {
  CharacterSchema,
  type Character,
  type CharacterClassEntry,
} from '@/shared/types/character';
import type {
  Ancestry,
  Background,
  ClassEntity,
  Item,
  Spell,
} from '@/shared/types/content';
import type { WizardDraft } from '@/shared/lib/slices/wizard-slice';

import { resolveSkillIds } from './steps/skill-resolver';
import { getMissingAncestrySubChoiceKeys } from './steps/ancestry/use-ancestry-sub-choices';
import {
  areAllClassSubChoicesCompleted,
  getMissingClassSubChoiceKeys,
} from './steps/class/use-class-sub-choices';

/**
 * Submit wizard → Firestore (plan 05 §F).
 *
 * Pipeline :
 *   1. construit un objet `Character` à partir du draft + contenu résolu.
 *   2. valide vs `CharacterSchema` (Zod) — throw si invalide.
 *   3. `setDoc(users/{uid}/characters/{charId})`.
 *
 * Avec le fix infra §0.1 (`ignoreUndefinedProperties: true` côté Firestore +
 * `addItemToInventory` qui n'écrit jamais `contentSource: undefined`), aucune
 * valeur indéfinie n'atteint Firestore.
 */

export interface SubmitFromWizardInput {
  uid: string;
  draft: WizardDraft;
  classes: ClassEntity[];
  ancestry: Ancestry;
  background: Background;
  items: Item[];
  spells: Spell[];
}

export interface SubmitFromWizardResult {
  id: string;
  character: Character;
}

/**
 * Construit la liste des sortIds liés à l'ascendance d'un perso fresh
 * (plan 13.8). Pour Tieffelin / Elfe / Gnome : cantrip de niveau 1 +
 * sorts L3/L5 (« toujours considérés comme préparés » dès qu'on atteint
 * le niveau requis, SRD 5.2.1). Ils sont inscrits dans `knownSpells.ancestry`
 * dès la création — la fiche les rend lockés tant que `totalLevel < N`.
 */
export function buildAncestrySpellIds(
  draft: WizardDraft,
  ancestry: Ancestry,
): string[] {
  const sc = draft.ancestrySubChoices;
  const out: string[] = [];
  // Sorts de trait COMMUNS à toute l'ascendance, indépendants du sous-choix
  // (plan 13.14b D18). Tieffelin « Présence d'outre-monde » → thaumaturgie,
  // commun aux 3 héritages. Poussés en premier, avant le triplet de sous-choix.
  out.push(...(ancestry.commonSpellIds ?? []));
  if (ancestry.id === 'tiefling' && sc.tieflingLegacy) {
    const legacy = ancestry.options.tieflingLegacies?.find(
      (o) => o.id === sc.tieflingLegacy,
    );
    if (legacy) {
      out.push(legacy.cantripSpellId, legacy.level3SpellId, legacy.level5SpellId);
    }
  } else if (ancestry.id === 'elf' && sc.elfLineage) {
    const lineage = ancestry.options.elfLineages?.find(
      (o) => o.id === sc.elfLineage,
    );
    if (lineage) {
      out.push(lineage.cantripSpellId, lineage.level3SpellId, lineage.level5SpellId);
    }
  } else if (ancestry.id === 'gnome' && sc.gnomeLineage) {
    const lineage = ancestry.options.gnomeLineages?.find(
      (o) => o.id === sc.gnomeLineage,
    );
    if (lineage) {
      out.push(...lineage.cantripSpellIds);
      // Sorts de trait spécifiques au lignage (Gnome des forêts →
      // communication-avec-les-animaux). Rock Gnome n'en a pas → no-op.
      out.push(...(lineage.spellIds ?? []));
    }
  }
  return out;
}

/** Slug du nom + suffix random ; même algo qu'avant pour rester déterministe. */
export function generateCharacterId(name: string): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'pj';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

export async function buildCharacterFromWizard(
  input: SubmitFromWizardInput,
): Promise<Character> {
  const { uid, draft, classes, ancestry, background } = input;

  if (draft.classes.length === 0 || !draft.primaryClassId) {
    throw new Error('[wizard] aucune classe sélectionnée');
  }

  // Sous-choix d'ascendance niveau 1 SRD 5.2.1 (plan 13.8) — garde de submit.
  // Le wizard désactive déjà 'Suivant' via isAncestryValid, mais on double-checke
  // au submit pour parer une éventuelle bypass du flag (ex. autofill ancien
  // draft persisté) — c'est le même contrat que ce qu'on impose côté Firestore.
  const missing = getMissingAncestrySubChoiceKeys(
    ancestry.id,
    draft.ancestrySubChoices,
  );
  if (missing.length > 0) {
    throw new Error(
      `[wizard] sous-choix d'ascendance manquant(s) pour ${ancestry.id} : ${missing.join(', ')}`,
    );
  }

  // Sous-choix de classe niveau 1 SRD 5.2.1 (plan 13.9) — même contrat de
  // double-check. Inclut Expertise du Roublard (qui passe par la step Skills
  // côté UI mais reste un sous-choix de classe au sens schéma).
  if (!areAllClassSubChoicesCompleted(draft.classes, classes)) {
    const detail = draft.classes
      .map((c) => {
        const keys = getMissingClassSubChoiceKeys(c, classes);
        return keys.length > 0 ? `${c.classId}: ${keys.join(', ')}` : '';
      })
      .filter((s) => s.length > 0)
      .join(' | ');
    throw new Error(`[wizard] sous-choix de classe manquant(s) — ${detail}`);
  }

  const primaryClass = classes.find((c) => c.id === draft.primaryClassId);
  if (!primaryClass) {
    throw new Error(
      `[wizard] classe primaire "${draft.primaryClassId}" introuvable`,
    );
  }

  const id = generateCharacterId(draft.name);
  const conMod = abilityModifier(draft.abilities.con);
  const dexMod = abilityModifier(draft.abilities.dex);

  const characterClasses: CharacterClassEntry[] = draft.classes.map((c) => ({
    classId: c.classId,
    subclassId: null, // sous-classe choisie au level-up (plan 18)
    level: c.level,
    // Sous-choix de classe niveau 1 SRD propagés du draft (plan 13.9). La
    // garde `areAllClassSubChoicesCompleted` ci-dessus a déjà rejeté tout
    // draft incomplet — ici on copie tel quel. Tableaux clonés pour couper
    // toute référence partagée avec le state Zustand.
    clericDivineOrder: c.clericDivineOrder,
    druidPrimalOrder: c.druidPrimalOrder,
    fighterFightingStyle: c.fighterFightingStyle,
    weaponMasteries: [...c.weaponMasteries],
    expertiseSkills: [...c.expertiseSkills],
    eldritchInvocations: [...c.eldritchInvocations],
    wizardSpellbookL1: [...c.wizardSpellbookL1],
    // D13c+e — choix Pact of the Blade/Tome propagés tels quels. Le wizard
    // les vide quand l'invocation correspondante n'est pas prise (chooser
    // démonté). Schema character.ts les tient en optional+nullable pour
    // rétrocompat des fiches V2.
    pactBladeWeapon: c.pactBladeWeapon ?? null,
    pactTomeCantrips: [...(c.pactTomeCantrips ?? [])],
    pactTomeRituals: [...(c.pactTomeRituals ?? [])],
  }));
  const computedTotalLevel = totalLevel(characterClasses);

  const hpClasses = characterClasses
    .map((c) => {
      const meta = classes.find((cc) => cc.id === c.classId);
      if (!meta) return null;
      return { classId: c.classId, level: c.level, die: meta.hitDie };
    })
    .filter((x): x is { classId: string; level: number; die: 'd6' | 'd8' | 'd10' | 'd12' } =>
      Boolean(x),
    );
  const computedHp = maxHp({
    classes: hpClasses,
    primaryClassId: primaryClass.id,
    conMod,
  });

  // Saves : la classe primaire pose les saves au niveau 1, comme en SRD 2024.
  const saves = {
    for: primaryClass.saveProficiencies.includes('for'),
    dex: primaryClass.saveProficiencies.includes('dex'),
    con: primaryClass.saveProficiencies.includes('con'),
    int: primaryClass.saveProficiencies.includes('int'),
    sag: primaryClass.saveProficiencies.includes('sag'),
    cha: primaryClass.saveProficiencies.includes('cha'),
  };

  // Skills : agrégateur central des sources (plan 13.8 UAT 2026-05-18).
  // Avant le fix, ce bloc écrivait UNIQUEMENT `pickedSkills` — les grants
  // background (ex. Acolyte → Insight/Religion) et ancestry (Humain
  // Compétent / Elfe Sens Aiguisés) étaient perdus silencieusement. Le
  // `buildSkillProficiencies` applique la règle max-par-skillId et écrit
  // tout dans `character.skills`.
  const resolvedBackgroundSkills = resolveSkillIds(background.skillProficiencies);
  // Expertise (13.9 — Roublard) : agrégée depuis `characterClasses[].expertiseSkills`.
  // Tant que le wizard 13.9 n'écrit pas ces champs, le tableau reste vide.
  const expertiseSkills: string[] = characterClasses.flatMap(
    (c) => c.expertiseSkills,
  );
  const skills: Character['skills'] = buildSkillProficiencies({
    backgroundSkills: resolvedBackgroundSkills,
    ancestrySubChoices: draft.ancestrySubChoices,
    pickedSkills: draft.pickedSkills,
    expertiseSkills,
  });

  // Inventaire : pour chaque classe choisie, on prend l'option d'équipement
  // sélectionnée et on injecte chaque itemId via addItemToInventory (qui
  // valide l'existence vs items.json). Idem grants background.
  const inventoryShape = {
    inventory: {
      items: [] as Character['inventory']['items'],
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
  };

  // Map "gp/sp/cp/ep/pp" → champ coins du character.
  const coinKey: Record<string, keyof Character['inventory']['coins']> = {
    cp: 'cu',
    sp: 'ar',
    ep: 'el',
    gp: 'or',
    pp: 'pl',
  };

  for (const c of draft.classes) {
    const cls = classes.find((cc) => cc.id === c.classId);
    if (!cls) continue;
    const choice = draft.equipmentChoices.find((eq) => eq.classId === c.classId);
    if (!choice) continue;
    const option = cls.startingEquipment.options[choice.optionIndex];
    if (!option) continue;
    for (const ref of option.items) {
      await addItemToInventory(inventoryShape, ref.itemId, 'public', { qty: ref.qty });
    }
    if (option.coins) {
      const k = coinKey[option.coins.unit];
      if (k) inventoryShape.inventory.coins[k] += option.coins.qty;
    }
  }

  // Grants background
  for (const ref of background.equipment) {
    await addItemToInventory(inventoryShape, ref.itemId, 'public', { qty: ref.qty });
  }
  if (background.startingCoins) {
    const k = coinKey[background.startingCoins.unit];
    if (k) inventoryShape.inventory.coins[k] += background.startingCoins.qty;
  }

  // Sorts par classe lanceuse (multi-class : on key par classId).
  //
  // Cas Magicien (SRD 2024) : `wizardSpellbookL1` est le grimoire inscrit
  // (6 sorts à L1), `picks.level1` les 4 préparés (sous-ensemble du grimoire).
  // `knownSpells.wizard` doit refléter le grimoire complet — sinon les sorts
  // inscrits-non-préparés disparaissent du SpellList côté Sheet
  // (filtré par `knownSet = knownSpells[classId] ∪ preparedSpells[classId]`).
  // Pour les autres lanceurs (Clerc, Druide, Occultiste...), `knownSpells`
  // reste l'union cantrips + niveau 1.
  const knownSpells: Character['knownSpells'] = {};
  const preparedSpells: Character['preparedSpells'] = {};
  const spellcastingAbility: Character['spellcastingAbility'] = {};
  for (const c of draft.classes) {
    const cls = classes.find((cc) => cc.id === c.classId);
    if (!cls?.spellcasting) continue;
    spellcastingAbility[cls.id] = cls.spellcasting.ability;
    const picks = draft.spellsByClass.find((s) => s.classId === cls.id);
    if (picks) {
      const isWizard = cls.id === 'wizard';
      const inscribed = isWizard ? c.wizardSpellbookL1 ?? [] : [];
      // Union sans doublons : cantrips + (grimoire complet OU 4 préparés).
      const allKnown = Array.from(
        new Set([...picks.cantrips, ...(isWizard ? inscribed : picks.level1)]),
      );
      if (allKnown.length > 0) knownSpells[cls.id] = allKnown;
      if (picks.level1.length > 0) preparedSpells[cls.id] = picks.level1;
    }
  }

  // Sorts liés à l'ascendance (plan 13.8) — Tieffelin, Elfe et Gnome.
  // Tous trois utilisent la même clé synthétique 'ancestry' pour
  // grouper leurs sorts dans la fiche. La caractéristique d'incantation
  // commune est posée par le sous-choix ancestryCastingAbility.
  const ancestrySpells = buildAncestrySpellIds(draft, ancestry);
  if (ancestrySpells.length > 0) {
    knownSpells.ancestry = ancestrySpells;
  }
  if (draft.ancestrySubChoices.ancestryCastingAbility) {
    spellcastingAbility.ancestry = draft.ancestrySubChoices.ancestryCastingAbility;
  }

  const character: Character = {
    id,
    name: draft.name.trim(),
    status: 'alive',
    classes: characterClasses,
    totalLevel: computedTotalLevel,
    primaryClassId: primaryClass.id,
    ancestryId: ancestry.id,
    ancestrySubChoices: { ...draft.ancestrySubChoices },
    backgroundId: background.id,
    extraLanguages: [],
    experience: 0,
    alignment: draft.alignment,
    abilities: { ...draft.abilities },
    saves,
    skills,
    hp: { current: computedHp, max: computedHp, temp: 0 },
    ac: 10 + dexMod,
    speed: ancestry.speed,
    initiative: dexMod,
    hitDice: hpClasses.map((c) => ({
      classId: c.classId,
      current: c.level,
      max: c.level,
      die: c.die,
    })),
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells,
    knownSpells,
    spellcastingAbility,
    inventory: inventoryShape.inventory,
    personality: { ...draft.personality },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: {
      totalRolls: 0,
      totalD20Sum: 0,
      crits: 0,
      fumbles: 0,
      skillUses: {},
    },
    portrait: { type: 'letter', value: (draft.name.trim()[0] ?? '?').toUpperCase() },
    schemaVersion: 2,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };

  return character;
}

export async function submitFromWizard(
  input: SubmitFromWizardInput,
): Promise<SubmitFromWizardResult> {
  const character = await buildCharacterFromWizard(input);
  const validation = CharacterSchema.safeParse(character);
  if (!validation.success) {
    const summary = validation.error.errors
      .slice(0, 3)
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(`[wizard] CharacterSchema validation failed: ${summary}`);
  }
  const firestore = getDb();
  const docRef = doc(firestore, 'users', input.uid, 'characters', character.id);
  // Création offline-safe : trackPendingWrite incrémente le compteur de
  // pendingWrites pour que la bannière OfflineBanner affiche « Synchronisation »
  // (variant syncing) tant que le backend n'a pas accusé réception. Sans ce
  // wrapper, la création serait silencieuse côté UI tant que l'ack n'est pas
  // arrivé, ce qui contredit la spec V1 jalon 1D « sync queue à reconnexion ».
  await trackPendingWrite(firestore, setDoc(docRef, character));
  return { id: character.id, character };
}
