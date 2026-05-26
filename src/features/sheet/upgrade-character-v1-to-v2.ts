import {
  EMPTY_ANCESTRY_SUB_CHOICES,
  createEmptyClassSubChoices,
} from '@/shared/types/character';

/**
 * Migration runtime `schemaVersion: 1 → 2` (plan 13.7 §0.2).
 *
 * Décision Adrien 13.7 §0.2 :
 *  - Lazy migration à l'ouverture de la fiche, pas de batch.
 *  - Pas de step de rattrapage UI : un perso v1 s'ouvre avec sentinelles vides,
 *    la fiche les tolère, le wizard refusera de submit si requis (13.8/13.9).
 *  - Idempotent : appliqué à un doc déjà v2, retourne le doc inchangé.
 *
 * On opère sur `unknown` (raw Firestore) car la donnée v1 ne valide pas le
 * CharacterSchema v2 — on doit l'enrichir AVANT de la passer à Zod.
 */
export function upgradeCharacterV1ToV2(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const doc = raw as Record<string, unknown>;
  const version = doc.schemaVersion;

  if (version === 2) return raw;
  if (version !== 1) {
    // Versions inconnues : on laisse Zod remonter l'erreur en aval.
    return raw;
  }

  // 1. Retirer `subancestryId` (champ supprimé par v2).
  const {
    subancestryId: _removed,
    ...rest
  } = doc;
  void _removed;

  // 2. Injecter `ancestrySubChoices` sentinelle (clone pour ne pas partager le default).
  const ancestrySubChoices = { ...EMPTY_ANCESTRY_SUB_CHOICES };

  // 3. Injecter `extraLanguages` sentinelle.
  const extraLanguages: string[] = Array.isArray(rest.extraLanguages)
    ? (rest.extraLanguages as string[])
    : [];

  // 4. Enrichir chaque entrée de `classes[]` avec les 7 sous-choix de classe.
  const classes = Array.isArray(rest.classes)
    ? (rest.classes as Array<Record<string, unknown>>).map((entry) => {
        const sentinels = createEmptyClassSubChoices();
        return {
          ...sentinels,
          ...entry,
          weaponMasteries: Array.isArray(entry.weaponMasteries)
            ? (entry.weaponMasteries as string[])
            : sentinels.weaponMasteries,
          expertiseSkills: Array.isArray(entry.expertiseSkills)
            ? (entry.expertiseSkills as string[])
            : sentinels.expertiseSkills,
          eldritchInvocations: Array.isArray(entry.eldritchInvocations)
            ? (entry.eldritchInvocations as string[])
            : sentinels.eldritchInvocations,
          wizardSpellbookL1: Array.isArray(entry.wizardSpellbookL1)
            ? (entry.wizardSpellbookL1 as string[])
            : sentinels.wizardSpellbookL1,
          pactTomeCantrips: Array.isArray(entry.pactTomeCantrips)
            ? (entry.pactTomeCantrips as string[])
            : sentinels.pactTomeCantrips,
          pactTomeRituals: Array.isArray(entry.pactTomeRituals)
            ? (entry.pactTomeRituals as string[])
            : sentinels.pactTomeRituals,
          clericDivineOrder: entry.clericDivineOrder ?? sentinels.clericDivineOrder,
          druidPrimalOrder: entry.druidPrimalOrder ?? sentinels.druidPrimalOrder,
          fighterFightingStyle:
            entry.fighterFightingStyle ?? sentinels.fighterFightingStyle,
        };
      })
    : rest.classes;

  return {
    ...rest,
    ancestrySubChoices,
    extraLanguages,
    classes,
    schemaVersion: 2,
  };
}

/**
 * Retourne `true` si le doc raw est `schemaVersion: 1` et doit déclencher une
 * écriture v2 côté caller (`use-character.ts`).
 */
export function needsV1ToV2Upgrade(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const doc = raw as Record<string, unknown>;
  return doc.schemaVersion === 1;
}
