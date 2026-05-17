import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { addItemToInventory } from '@/shared/lib/inventory';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { maxHp, totalLevel } from '@/shared/lib/rules/multiclass';
import { getDb } from '@/shared/lib/firebase';
import {
  CharacterSchema,
  createEmptyClassSubChoices,
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
    // Sous-choix de classe niveau 1 SRD (plan 13.7 §0.1) — sentinelles ici.
    // Le wizard 13.9 ajoutera des sous-étapes qui peupleront ces champs et
    // refusera de submit si requis (Fighter Style, Rogue Expertise, etc.).
    ...createEmptyClassSubChoices(),
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

  // Skills : maîtrise = 1 pour chaque skill picked. Le wizard a déjà résolu en
  // IDs canoniques kebab-case.
  const skills: Character['skills'] = {};
  for (const sid of draft.pickedSkills) skills[sid] = 1;

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
  const knownSpells: Character['knownSpells'] = {};
  const preparedSpells: Character['preparedSpells'] = {};
  const spellcastingAbility: Character['spellcastingAbility'] = {};
  for (const c of draft.classes) {
    const cls = classes.find((cc) => cc.id === c.classId);
    if (!cls?.spellcasting) continue;
    spellcastingAbility[cls.id] = cls.spellcasting.ability;
    const picks = draft.spellsByClass.find((s) => s.classId === cls.id);
    if (picks) {
      const allKnown = [...picks.cantrips, ...picks.level1];
      if (allKnown.length > 0) knownSpells[cls.id] = allKnown;
      if (picks.level1.length > 0) preparedSpells[cls.id] = picks.level1;
    }
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
  await setDoc(docRef, character);
  return { id: character.id, character };
}
