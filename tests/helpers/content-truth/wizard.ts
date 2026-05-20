import {
  buildCharacterFromWizard,
  type SubmitFromWizardInput,
} from '@/features/wizard/submit-from-wizard';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import { CharacterSchema, type Character } from '@/shared/types/character';

/**
 * Cat. 5 — Coherence inter-ecrans (wizard → fiche).
 * (CLAUDE.md > Required at every commit > Verite du contenu, point 5.)
 *
 * `submitWizardAndDeriveSheet` drive la VRAIE fonction de prod
 * `buildCharacterFromWizard` (B3 du verdict d'inventaire 13.12 : async mais
 * pure, n'appelle jamais `getDb`), puis valide le Character resultant contre
 * `CharacterSchema` et expose un snapshot leger des derives de fiche. C'est
 * exactement le cœur que le runner combinatoire (commit 3) execute par persona.
 *
 * IMPORTANT : `buildCharacterFromWizard` appelle `addItemToInventory`, qui
 * resout les items via Dexie. L'appelant DOIT mocker `@/shared/lib/inventory`
 * (cf. submit-from-wizard-ancestry.test.ts) — sinon le helper touche IndexedDB.
 * On ne mocke pas ici pour ne pas imposer un mock global a tous les consommateurs.
 */

export interface SheetSnapshot {
  readonly character: Character;
  /** Resultat de la validation Zod (le vrai garde-fou que submitFromWizard applique). */
  readonly valid: boolean;
  /** Messages d'erreur Zod (vides si valid). */
  readonly errors: readonly string[];
  /** Nombre de sorts connus toutes sources confondues (classes + ascendance). */
  readonly knownSpellsCount: number;
  /** Niveau total denormalise. */
  readonly totalLevel: number;
  /** Bonus de maitrise derive du niveau total. */
  readonly profBonus: number;
  /** CA de base posee au wizard (10 + DEX ; l'armure equipee derive ailleurs). */
  readonly baseAc: number;
}

export async function submitWizardAndDeriveSheet(
  input: SubmitFromWizardInput,
): Promise<SheetSnapshot> {
  let character: Character;
  try {
    character = await buildCharacterFromWizard(input);
  } catch (err) {
    // Un build invalide (sous-choix manquant, classe primaire absente...) leve
    // dans la fonction de prod. On le remonte comme snapshot `valid:false`
    // plutot que de laisser le test crasher : le runner veut un verdict par
    // persona, pas une exception qui interrompt la matrice.
    return {
      character: undefined as unknown as Character,
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
      knownSpellsCount: 0,
      totalLevel: 0,
      profBonus: 0,
      baseAc: 0,
    };
  }

  const parsed = CharacterSchema.safeParse(character);
  const errors = parsed.success
    ? []
    : parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);

  const knownSpellsCount = Object.values(character.knownSpells).reduce(
    (acc, list) => acc + list.length,
    0,
  );

  return {
    character,
    valid: parsed.success,
    errors,
    knownSpellsCount,
    totalLevel: character.totalLevel,
    profBonus: proficiencyBonus(character.totalLevel),
    baseAc: character.ac,
  };
}
