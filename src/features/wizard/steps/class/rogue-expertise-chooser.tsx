import { useEffect, useMemo, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { getSkill } from '@/shared/lib/rules/skills';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { resolveSkillIds } from '../skill-resolver';
import { ChooserDependencyHint } from '../chooser-dependency-hint';

import { toggleBoundedSelection } from './chooser-utils';
import { ROGUE_EXPERTISE_COUNT_L1 } from './use-class-sub-choices';

/**
 * Chooser Roublard — Expertise (2 compétences SRD 5.2.1).
 *
 * Règle SRD 2024 : Expertise se choisit **uniquement** parmi des compétences
 * déjà maîtrisées (pool = background + ancestry + class-pick). C'est aussi
 * l'exigence #5 héritée de 13.8 (cf. plan).
 *
 * RENDU dans `SkillsStep` (UAT 2026-05-18 — Option B). À l'étape Classe, on
 * affiche un simple `ChooserDependencyHint` à la place — le pool y est
 * structurellement vide (Compétences pas encore visitées) et la bannière "panne"
 * mentirait. Le chooser réel ne vit qu'à l'étape Compétences où le pool est
 * reactif aux picks de classe en direct.
 *
 * Pruning automatique : quand le pool change (le joueur décoche un pick de
 * classe qui était en Expertise), l'ID Expertise orphelin est silencieusement
 * retiré du draft. C'est un effet de bord nécessaire (pas un calcul dérivé) —
 * d'où le `useEffect`, dérogation explicite à la règle CLAUDE.md "no useEffect
 * for derived state" parce qu'il mute un slice, pas le state local.
 */
export function RogueExpertiseChooser(): JSX.Element | null {
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const draft = useWizardStore((s) => s.draft);
  const backgrounds = useContent('backgrounds');

  const entry = useMemo(
    () => draft.classes.find((c) => c.classId === 'rogue') ?? null,
    [draft.classes],
  );

  // Pool = union des skills déjà maîtrisées via toutes les sources (max-par-
  // skillId, cf. buildSkillProficiencies). On reconstruit ici un set d'IDs.
  const pool = useMemo(() => {
    const ids = new Set<string>();
    // 1. Background
    const bg = backgrounds.data.find((b) => b.id === draft.backgroundId);
    if (bg) {
      for (const id of resolveSkillIds(bg.skillProficiencies)) ids.add(id);
    }
    // 2. Ancestry extra skill (Humain Compétent / Elfe Sens Aiguisés)
    const ancestryExtra = draft.ancestrySubChoices.ancestryExtraSkill;
    if (ancestryExtra) ids.add(ancestryExtra);
    // 3. Picks de classe (déjà des IDs canoniques)
    for (const id of draft.pickedSkills) ids.add(id);
    return Array.from(ids);
  }, [
    backgrounds.data,
    draft.backgroundId,
    draft.ancestrySubChoices.ancestryExtraSkill,
    draft.pickedSkills,
  ]);

  // Stable reference pour ne pas faire muter les deps du useEffect à chaque
  // render (ESLint react-hooks/exhaustive-deps).
  const selected = useMemo(
    () => entry?.expertiseSkills ?? [],
    [entry?.expertiseSkills],
  );

  // Pruning des orphelins : si une Expertise n'est plus dans le pool, on la
  // retire. Effet de bord nécessaire — touche au slice wizard, pas au state
  // local. Conditionné pour ne setter QUE quand un changement est requis.
  useEffect(() => {
    if (selected.length === 0) return;
    const filtered = selected.filter((id) => pool.includes(id));
    if (filtered.length !== selected.length) {
      setClassSubChoice('rogue', 'expertiseSkills', filtered);
    }
  }, [pool, selected, setClassSubChoice]);

  if (pool.length === 0) {
    return (
      <ChooserDependencyHint
        chooserKey="rogue-expertise-no-skills"
        messageKey="wizard.subchoice.pending.expertiseNoSkills"
      />
    );
  }
  const count = ROGUE_EXPERTISE_COUNT_L1;
  const remaining = count - selected.length;
  const reachedCap = selected.length >= count;

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
      <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
        {t('wizard.subchoice.expertise.legend')}
      </legend>
      <p className="font-serif text-[13px] text-text-tertiary -mt-1">
        {t('wizard.subchoice.expertise.helper')}
      </p>
      <p className="font-serif text-[13px] text-text-secondary" aria-live="polite">
        {selected.length} / {count}
        {remaining > 0 ? (
          <span className="ml-2 text-text-tertiary">
            {t('wizard.subchoice.expertise.remaining').replace('{n}', String(remaining))}
          </span>
        ) : null}
      </p>
      <div
        role="group"
        aria-label={t('wizard.subchoice.expertise.legend')}
        className="grid gap-2.5 grid-cols-1 sm:grid-cols-2"
      >
        {pool.map((skillId) => {
          const skill = getSkill(skillId);
          const checked = selected.includes(skillId);
          const disabled = !checked && reachedCap;
          return (
            <label
              key={skillId}
              htmlFor={`rogue-expertise-${skillId}`}
              className={cn(
                'group relative flex min-h-[48px] cursor-pointer items-center gap-3 rounded-card border p-3',
                'transition-all duration-150 ease-base',
                'focus-within:ring-2 focus-within:ring-gold-bright/40',
                checked
                  ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                  : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <input
                id={`rogue-expertise-${skillId}`}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const next = toggleBoundedSelection(selected, skillId, count);
                  setClassSubChoice('rogue', 'expertiseSkills', next);
                }}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'font-display text-[15px]',
                  checked ? 'text-gold-bright' : 'text-gold',
                )}
              >
                {skill ? localize(skill.name) : skillId}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
