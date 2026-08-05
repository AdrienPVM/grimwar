import { useMemo, useState } from 'react';

import {
  NORMAL_ROLL,
  RollOptionsMenu,
  type RollOptions,
} from '@/features/dice/roll-options-menu';
import { useLongPress } from '@/shared/hooks/use-long-press';

import { Card, CardHeader } from '@/shared/components/card';
import { Icon } from '@/shared/components/icon';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus, totalLevel } from '@/shared/lib/rules/multiclass';
import { getSkillProficiency, SKILLS, skillModifier } from '@/shared/lib/rules/skills';
import { localize, t } from '@/shared/lib/i18n';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
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
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuSkill = menuFor ? (SKILLS.find((sk) => sk.id === menuFor) ?? null) : null;
  const { updateCharacter } = useUpdateCharacter(character);
  const pb = proficiencyBonus(totalLevel(character.classes));

  const filtered = useMemo(() => {
    // Accents compris : « representation » doit trouver « Représentation ».
    const q = normalizeForSearch(query);
    if (!q) return SKILLS;
    return SKILLS.filter(
      (s) => normalizeForSearch(localize(s.name)).includes(q) || s.id.includes(q),
    );
  }, [query]);

  async function rollSkill(
    skillId: string,
    options: RollOptions = NORMAL_ROLL,
  ): Promise<void> {
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
      // skillId (slug machine) → stats.skillUses[skillId] côté event-logger (22.2).
      skillId,
      advantage: options.advantage,
      useInspiration: options.useInspiration,
      bonus: options.bonus,
      consumeInspiration: async () => {
        await updateCharacter({ inspiration: false });
      },
    });
    if (!result) return;
  }

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.skills.title')}</h3>
      </CardHeader>
      <div className="mb-4 flex items-center gap-2 rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2">
        <Icon name="i-search" className="h-4 w-4 text-text-tertiary" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('sheet.essence.skills.searchPlaceholder')}
          className="w-full bg-transparent font-serif text-body-sm text-text outline-none placeholder:italic placeholder:text-text-faint"
        />
      </div>

      {/*
        Bento desktop : la liste des 18 compétences occupe une rangée pleine —
        en 1 colonne elle produisait une bande de 18 lignes très étirées. Deux
        colonnes à `xl:` la ramènent à 9 lignes, dans la même logique que
        l'inventaire et la liste de sorts.
      */}
      <ul className="flex flex-col gap-1.5 xl:grid xl:grid-cols-2 xl:gap-x-4">
        {filtered.length === 0 ? (
          <li className="py-2 text-center font-serif text-body-sm italic text-text-tertiary xl:col-span-2">
            {t('sheet.essence.skills.noMatch')}
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
            return (
              <SkillRow
                key={skill.id}
                label={localize(skill.name)}
                ability={skill.ability}
                profLevel={profLevel}
                mod={mod}
                disabled={readOnly}
                onTap={() => void rollSkill(skill.id)}
                onLongPress={() => setMenuFor(skill.id)}
              />
            );
          })
        )}
      </ul>

      {menuSkill && (
        <RollOptionsMenu
          title={localize(menuSkill.name)}
          ariaLabel={t('dice.options.aria').replace(
            '{label}',
            localize(menuSkill.name),
          )}
          hasInspiration={character.inspiration}
          onPick={(options) => {
            const target = menuSkill.id;
            setMenuFor(null);
            void rollSkill(target, options);
          }}
          onClose={() => setMenuFor(null)}
        />
      )}
    </Card>
  );
}

/**
 * Une ligne de compétence. Extraite en composant parce que `useLongPress` est un
 * hook : l'appeler dans le `.map()` d'une liste FILTRÉE ferait varier le nombre
 * de hooks d'un rendu à l'autre dès que la recherche change.
 */
function SkillRow({
  label,
  ability,
  profLevel,
  mod,
  disabled,
  onTap,
  onLongPress,
}: {
  readonly label: string;
  readonly ability: string;
  readonly profLevel: SkillProf;
  readonly mod: number;
  readonly disabled: boolean;
  readonly onTap: () => void;
  readonly onLongPress: () => void;
}): JSX.Element {
  const handlers = useLongPress(onTap, onLongPress);
  const signed = mod >= 0 ? `+${mod}` : `${mod}`;
  return (
    <li>
      <Tooltip label={t('sheet.tip.rollSkill')} decorative className="w-full">
        <button
          type="button"
          disabled={disabled}
          {...handlers}
          className={cn(
            'flex w-full items-center gap-3 rounded-card-sm border border-white-8 bg-bg-2/30 px-3 py-2 text-left transition-all',
            'hover:border-soft hover:bg-white/[0.04] active:scale-[0.99]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <ProficiencyIndicator level={profLevel} />
          <span className="flex-1 truncate font-serif text-body text-text">
            {label}
          </span>
          <span className="rounded-pill border border-white-8 bg-white/[0.04] px-2 py-0.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
            {ability.toUpperCase()}
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
      </Tooltip>
    </li>
  );
}

function ProficiencyIndicator({ level }: { level: SkillProf }): JSX.Element {
  if (level === 0) {
    return (
      <span
        aria-label={t('sheet.essence.skills.notProficient')}
        className="h-3 w-3 rounded-full border border-white-8 bg-transparent"
      />
    );
  }
  if (level === 1) {
    return (
      <span
        aria-label={t('sheet.essence.skills.proficient')}
        className="h-3 w-3 rounded-full bg-gold-bright shadow-[0_0_6px_rgba(220,184,108,0.7)]"
      />
    );
  }
  // 2 — expertise : losange
  return (
    <span
      aria-label={t('sheet.essence.skills.expertise')}
      className="block h-3 w-3 rotate-45 bg-gold-bright shadow-[0_0_8px_rgba(220,184,108,0.9)]"
    />
  );
}
