import { useMemo, useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus, totalLevel } from '@/shared/lib/rules/multiclass';
import { getSkillProficiency, SKILLS, skillModifier } from '@/shared/lib/rules/skills';
import { localize } from '@/shared/lib/i18n';
import type { Character, SkillProf } from '@/shared/types/character';

import { rollWithFlags } from '@/features/dice/roll-with-flags';

import { useUpdateCharacter } from '../../use-update-character';

interface SkillsListProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Liste filtrable des 18 compétences. Indicateur de maîtrise :
 *   - vide : 0 (non maîtrisé)
 *   - cercle plein gold : 1 (maîtrise)
 *   - losange plein gold : 2 (expertise)
 *
 * Le bonus de maîtrise vient du `totalLevel` du PJ (multi-class oblige, helper
 * dans `lib/rules/multiclass.ts`).
 */
export function SkillsList({ character, readOnly }: SkillsListProps): JSX.Element {
  const [query, setQuery] = useState<string>('');
  const { updateCharacter } = useUpdateCharacter(character.id);
  const pb = proficiencyBonus(totalLevel(character.classes));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SKILLS;
    return SKILLS.filter(
      (s) => localize(s.name).toLowerCase().includes(q) || s.id.includes(q),
    );
  }, [query]);

  async function rollSkill(skillId: string): Promise<void> {
    if (readOnly) return;
    const skill = SKILLS.find((s) => s.id === skillId);
    if (!skill) return;
    const profLevel = getSkillProficiency(character.skills, skillId);
    const abilityMod = abilityModifier(character.abilities[skill.ability]);
    const mod = skillModifier({
      skillId,
      abilityMod,
      profBonus: pb,
      proficiencyLevel: profLevel,
    });
    // Plan 12.5 : `result === null` si Passer en mode physique. Pas de side-effect.
    const result = await rollWithFlags({
      character,
      baseMod: mod,
      label: localize(skill.name),
      consumeInspiration: async () => {
        await updateCharacter({ inspiration: false });
      },
    });
    if (!result) return;
  }

  return (
    <Card>
      <CardHeader>
        <h3>Compétences</h3>
      </CardHeader>
      <div className="mb-4 flex items-center gap-2 rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2">
        <Icon name="i-search" className="h-4 w-4 text-text-tertiary" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Que veux-tu faire ?"
          className="w-full bg-transparent font-serif text-body-sm text-text outline-none placeholder:italic placeholder:text-text-faint"
        />
      </div>

      <ul className="flex flex-col gap-1.5">
        {filtered.length === 0 ? (
          <li className="py-2 text-center font-serif text-body-sm italic text-text-tertiary">
            Aucune compétence correspondante.
          </li>
        ) : (
          filtered.map((skill) => {
            const profLevel = getSkillProficiency(character.skills, skill.id);
            const abilityMod = abilityModifier(character.abilities[skill.ability]);
            const mod = skillModifier({
              skillId: skill.id,
              abilityMod,
              profBonus: pb,
              proficiencyLevel: profLevel,
            });
            const signed = mod >= 0 ? `+${mod}` : `${mod}`;
            return (
              <li key={skill.id}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => void rollSkill(skill.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-card-sm border border-white-8 bg-bg-2/30 px-3 py-2 text-left transition-all',
                    'hover:border-soft hover:bg-white/[0.04] active:scale-[0.99]',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  <ProficiencyIndicator level={profLevel} />
                  <span className="flex-1 truncate font-serif text-body text-text">
                    {localize(skill.name)}
                  </span>
                  <span className="rounded-pill border border-white-8 bg-white/[0.04] px-2 py-0.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                    {skill.ability.toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      'min-w-[40px] text-right font-display text-[16px] font-black tracking-[-0.02em]',
                      mod >= 0 ? 'text-gold-bright' : 'text-crimson',
                    )}
                  >
                    {signed}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}

function ProficiencyIndicator({ level }: { level: SkillProf }): JSX.Element {
  if (level === 0) {
    return (
      <span
        aria-label="Non maîtrisée"
        className="h-3 w-3 rounded-full border border-white-8 bg-transparent"
      />
    );
  }
  if (level === 1) {
    return (
      <span
        aria-label="Maîtrise"
        className="h-3 w-3 rounded-full bg-gold-bright shadow-[0_0_6px_rgba(220,184,108,0.7)]"
      />
    );
  }
  // 2 — expertise : losange
  return (
    <span
      aria-label="Expertise"
      className="block h-3 w-3 rotate-45 bg-gold-bright shadow-[0_0_8px_rgba(220,184,108,0.9)]"
    />
  );
}
