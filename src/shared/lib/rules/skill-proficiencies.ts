import type { AncestrySubChoices, SkillProf } from '@/shared/types/character';

/**
 * Agrégateur central des sources de maîtrise de compétence (plan 13.8 §UAT
 * 2026-05-18 — bug « Humain Compétent non reflété »).
 *
 * Source unique de vérité runtime. Le wizard `skills-step.tsx` et `submit-from-
 * wizard.ts` consomment cette fonction pour décider :
 *   - quelles skills doivent apparaître comme déjà cochées + verrouillées dans
 *     le step Compétences (background + ancestry → 1).
 *   - quel `Record<skillId, SkillProf>` est écrit dans `character.skills` au
 *     submit Firestore (background + ancestry + picks de classe).
 *
 * Règle de fusion **max-par-skillId** : la maîtrise (1) ne stacke pas avec
 * elle-même mais l'expertise (2) écrase la maîtrise. C'est l'invariant SRD
 * 5.2.1 « a creature can be proficient in a skill only once ; expertise
 * doubles the proficiency bonus » sous forme calculable.
 *
 * Le hook 13.9 `expertiseSkills` (Roublard) est déjà brançable ici via
 * l'argument `expertiseSkills` — passer `[]` tant que la classe ne le
 * remplit pas.
 *
 * Fonction PURE — zéro accès à Zustand, zéro hook, zéro fetch. Tests
 * unitaires en `__tests__/skill-proficiencies.test.ts`.
 */

/**
 * Source mécanique d'une maîtrise. L'ordre ne porte aucune sémantique :
 * l'UI consomme la liste pour formuler le tag « accordée par X » et
 * empêcher la sélection en doublon.
 */
export type SkillSource = 'background' | 'ancestry' | 'class-pick' | 'class-expertise';

export interface BuildSkillProficienciesInput {
  /**
   * Skills accordées par l'historique du personnage, déjà résolues en IDs
   * canoniques kebab-case (cf. `resolveSkillIds`). Le pipeline submit doit
   * normaliser AVANT d'appeler — l'agrégateur ne re-nettoie pas les bruits
   * d'extraction PDF (« In- sight ») pour rester focalisé.
   */
  readonly backgroundSkills: readonly string[];
  /**
   * Sous-choix d'ascendance complet. Seul `ancestryExtraSkill` (Humain
   * Compétent / Elfe Sens Aiguisés) accorde une maîtrise. Les autres
   * sous-choix n'écrivent rien dans `skills` — ils sont ignorés ici.
   */
  readonly ancestrySubChoices: AncestrySubChoices;
  /**
   * Skills choisies au step Compétences du wizard (picks de classe primaire),
   * déjà résolues en IDs canoniques.
   */
  readonly pickedSkills: readonly string[];
  /**
   * Skills upgradées en Expertise par la classe (13.9 — Roublard L1). Doivent
   * idéalement être déjà à 1 via une autre source ; l'agrégateur ne le force
   * pas (max-par-skillId écrasera quoi qu'il arrive avec 2).
   */
  readonly expertiseSkills?: readonly string[];
}

/**
 * Construit le `Record<skillId, SkillProf>` final écrit dans `character.skills`.
 * Aucune entrée à 0 — un skill non mentionné par aucune source est absent du
 * record (compatible avec le défaut `?? 0` côté getter `getSkillProficiency`).
 */
export function buildSkillProficiencies(
  input: BuildSkillProficienciesInput,
): Record<string, SkillProf> {
  const skills: Record<string, SkillProf> = {};
  const set = (id: string, lvl: SkillProf): void => {
    const current = skills[id] ?? 0;
    if (lvl > current) skills[id] = lvl;
  };

  for (const id of input.backgroundSkills) set(id, 1);
  const ancestryExtra = input.ancestrySubChoices.ancestryExtraSkill;
  if (ancestryExtra) set(ancestryExtra, 1);
  for (const id of input.pickedSkills) set(id, 1);
  for (const id of input.expertiseSkills ?? []) set(id, 2);

  return skills;
}

/**
 * Construit le mapping `Record<skillId, SkillSource[]>` pour l'UI. Ce
 * tableau permet au step Compétences d'afficher un tag « via Acolyte » /
 * « via Humain » / « via Roublard (expertise) » à côté de chaque skill
 * verrouillée.
 *
 * Une skill peut avoir plusieurs sources (background + class-pick → doublon
 * silencieux d'avant 13.8). On retourne toutes les sources rencontrées pour
 * que l'UI puisse signaler le doublon si besoin ; le `buildSkillProficiencies`
 * lui n'écrit qu'une entrée (max).
 */
export function buildSkillSources(
  input: BuildSkillProficienciesInput,
): Record<string, SkillSource[]> {
  const sources: Record<string, SkillSource[]> = {};
  const add = (id: string, src: SkillSource): void => {
    if (!sources[id]) sources[id] = [];
    if (!sources[id].includes(src)) sources[id].push(src);
  };

  for (const id of input.backgroundSkills) add(id, 'background');
  const ancestryExtra = input.ancestrySubChoices.ancestryExtraSkill;
  if (ancestryExtra) add(ancestryExtra, 'ancestry');
  for (const id of input.pickedSkills) add(id, 'class-pick');
  for (const id of input.expertiseSkills ?? []) add(id, 'class-expertise');

  return sources;
}

/**
 * Retourne les skills accordées par une source AUTRE que les picks de classe
 * — autrement dit background + ancestry. Consommé par `skills-step.tsx` pour :
 *   - cocher + verrouiller ces skills dans la grille,
 *   - retirer ces skills du pool `allowed` proposé pour les picks de classe
 *     (un joueur ne peut pas re-piquer une skill déjà accordée — SRD impose
 *     d'en choisir une autre).
 *
 * Le count de picks de classe ne change pas : on réduit le pool, jamais le
 * nombre exigé par `primaryClass.skillChoices.count`.
 */
export function getSkillsGrantedByOtherSources(
  backgroundSkills: readonly string[],
  ancestrySubChoices: AncestrySubChoices,
): string[] {
  const out = new Set<string>(backgroundSkills);
  const extra = ancestrySubChoices.ancestryExtraSkill;
  if (extra) out.add(extra);
  return Array.from(out);
}
