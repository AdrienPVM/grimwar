import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { addItemToInventory } from '@/shared/lib/inventory';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { maxHp, totalLevel } from '@/shared/lib/rules/multiclass';
import { getDb } from '@/shared/lib/firebase';
import {
  CharacterSchema,
  type Character,
  type CharacterClassEntry,
} from '@/shared/types/character';
import type { Ancestry, Background, ClassEntity } from '@/shared/types/content';

import type { WizardDraft } from '@/shared/lib/slices/wizard-slice';

interface SubmitContext {
  uid: string;
  draft: WizardDraft;
  ancestry: Ancestry;
  characterClass: ClassEntity;
  background: Background;
}

/** Génère un id stable depuis le nom + suffixe court random (collision rare). */
export function generateCharacterId(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'pj';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

/**
 * Construit un Character à partir du brouillon + résout l'inventaire via
 * addItemToInventory (qui valide chaque itemId contre items DB strict).
 */
export async function buildCharacter(ctx: SubmitContext): Promise<Character> {
  const { uid, draft, ancestry, characterClass, background } = ctx;
  const id = generateCharacterId(draft.name);
  const conMod = abilityModifier(draft.abilities.con);
  const dexMod = abilityModifier(draft.abilities.dex);
  const classes: CharacterClassEntry[] = [
    {
      classId: characterClass.id,
      subclassId: draft.subclassId,
      level: draft.level,
    },
  ];
  const computedTotalLevel = totalLevel(classes);
  const computedHp = maxHp({
    classes: classes.map((c) => ({
      classId: c.classId,
      level: c.level,
      die: characterClass.hitDie,
    })),
    primaryClassId: characterClass.id,
    conMod,
  });

  // Inventaire : injecter chaque item draft via addItemToInventory (valide vs items DB).
  const inventoryShape = {
    inventory: {
      items: [],
      coins: { cu: 0, ar: 0, el: 0, or: draft.startingCoinsGp, pl: 0 },
      weightCache: 0,
    },
  };
  for (const it of draft.inventoryDraft) {
    await addItemToInventory(inventoryShape, it.contentId, 'public', { qty: it.qty });
  }

  const saves = {
    for: characterClass.saveProficiencies.includes('for'),
    dex: characterClass.saveProficiencies.includes('dex'),
    con: characterClass.saveProficiencies.includes('con'),
    int: characterClass.saveProficiencies.includes('int'),
    sag: characterClass.saveProficiencies.includes('sag'),
    cha: characterClass.saveProficiencies.includes('cha'),
  };

  const skills: Character['skills'] = {};
  for (const skill of draft.pickedSkills) {
    skills[skill] = 1;
  }

  const character: Character = {
    id,
    name: draft.name,
    status: 'alive',
    classes,
    totalLevel: computedTotalLevel,
    primaryClassId: characterClass.id,
    ancestryId: ancestry.id,
    subancestryId: draft.subancestryId,
    backgroundId: background.id,
    experience: 0,
    alignment: draft.alignment,
    abilities: { ...draft.abilities },
    saves,
    skills,
    hp: {
      current: draft.hpOverride ?? computedHp,
      max: draft.hpOverride ?? computedHp,
      temp: 0,
    },
    ac: draft.acOverride ?? 10 + dexMod,
    speed: ancestry.speed,
    initiative: dexMod,
    hitDice: [
      {
        classId: characterClass.id,
        current: draft.level,
        max: draft.level,
        die: characterClass.hitDie,
      },
    ],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells:
      draft.pickedSpellsLevel1.length > 0
        ? { [characterClass.id]: draft.pickedSpellsLevel1 }
        : {},
    knownSpells:
      draft.pickedCantrips.length > 0
        ? { [characterClass.id]: [...draft.pickedCantrips, ...draft.pickedSpellsLevel1] }
        : {},
    spellcastingAbility: characterClass.spellcasting
      ? { [characterClass.id]: characterClass.spellcasting.ability }
      : {},
    inventory: inventoryShape.inventory,
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
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
    portrait: { type: 'letter', value: (draft.name[0] ?? '?').toUpperCase() },
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };

  return character;
}

/**
 * Persiste le personnage dans Firestore et retourne son ID.
 * Lève si la validation Zod échoue ou si Firestore refuse l'écriture.
 */
export async function submitCharacter(
  ctx: SubmitContext,
): Promise<{ id: string; character: Character }> {
  const character = await buildCharacter(ctx);
  // Validation Zod : on omit createdAt/updatedAt qui sont des FieldValue côté Firestore.
  const validation = CharacterSchema.safeParse(character);
  if (!validation.success) {
    const summary = validation.error.errors
      .slice(0, 3)
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(`[wizard] CharacterSchema validation failed: ${summary}`);
  }
  const firestore = getDb();
  const docRef = doc(firestore, 'users', ctx.uid, 'characters', character.id);
  await setDoc(docRef, character);
  return { id: character.id, character };
}
