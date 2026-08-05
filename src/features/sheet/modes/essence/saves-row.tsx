import { Card, CardAction, CardHeader } from '@/shared/components/card';
import { Tooltip } from '@/shared/components/tooltip';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { abilityModifier, ABILITY_ORDER } from '@/shared/lib/rules/abilities';
import { proficiencyBonus, totalLevel } from '@/shared/lib/rules/multiclass';
import { t, type StringKey } from '@/shared/lib/i18n';
import type { AbilityCode, Character } from '@/shared/types/character';
import { useState } from 'react';

import { rollWithFlags } from '@/features/dice/roll-with-flags';
import {
  NORMAL_ROLL,
  RollOptionsMenu,
  type RollOptions,
} from '@/features/dice/roll-options-menu';

import { useUpdateCharacter } from '../../use-update-character';

interface SavesRowProps {
  character: Character;
  readOnly: boolean;
  /**
   * Bonus plat additionné à toutes les sauvegardes (JALON 1B.2 — Cloak /
   * Ring of Protection). Appliqué au mod affiché ET au roll. Optional pour
   * rétro-compat avec les tests qui n'instancient pas encore le moteur
   * d'effets — défaut 0.
   */
  extraSaveBonus?: number;
}

const ABILITY_SHORT_KEYS: Record<AbilityCode, StringKey> = {
  for: 'ability.short.for',
  dex: 'ability.short.dex',
  con: 'ability.short.con',
  int: 'ability.short.int',
  sag: 'ability.short.sag',
  cha: 'ability.short.cha',
};

/**
 * Rangée des 6 jets de sauvegarde. Chip avec point doré quand le PJ est maître
 * de la sauvegarde (ajoute le PB au mod). Tap = jet normal, long-press = menu
 * avantage/désav. partagé avec l'hexagramme.
 */
export function SavesRow({
  character,
  readOnly,
  extraSaveBonus = 0,
}: SavesRowProps): JSX.Element {
  const [menuFor, setMenuFor] = useState<AbilityCode | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const { updateCharacter } = useUpdateCharacter(character);
  const pb = proficiencyBonus(totalLevel(character.classes));

  /** Bascule la maîtrise d'une sauvegarde (don Résilient, aptitude accordée). */
  async function toggleProficiency(ability: AbilityCode): Promise<void> {
    await updateCharacter({
      saves: { ...character.saves, [ability]: !character.saves[ability] },
    });
  }

  async function performSave(
    ability: AbilityCode,
    options: RollOptions,
  ): Promise<void> {
    if (readOnly) return;
    const proficient = character.saves[ability];
    const mod =
      abilityModifier(character.abilities[ability]) +
      (proficient ? pb : 0) +
      extraSaveBonus;
    // Plan 12.5 : `result === null` si Passer en mode physique. Pas de side-effect.
    const result = await rollWithFlags({
      character,
      baseMod: mod,
      label: t('sheet.essence.saves.rollLabel').replace('{ability}', t(ABILITY_SHORT_KEYS[ability])),
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
        <h3>{t('sheet.essence.saves.title')}</h3>
        {readOnly ? null : (
          <CardAction aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
            {t(editing ? 'sheet.essence.prof.done' : 'sheet.essence.prof.edit')}
          </CardAction>
        )}
      </CardHeader>

      {editing ? (
        <p className="mb-4 font-serif text-body-sm italic text-text-tertiary">
          {t('sheet.essence.saves.editHint')}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITY_ORDER.map((ability) => (
          <SaveChip
            key={ability}
            ability={ability}
            score={character.abilities[ability]}
            proficient={character.saves[ability]}
            profBonus={pb}
            extraBonus={extraSaveBonus}
            disabled={readOnly}
            editing={editing}
            onTap={() =>
              editing
                ? void toggleProficiency(ability)
                : void performSave(ability, NORMAL_ROLL)
            }
            onLongPress={() => {
              if (!editing) setMenuFor(ability);
            }}
          />
        ))}
      </div>

      {menuFor && (
        <RollOptionsMenu
          title={t('sheet.essence.saves.menuTitle').replace(
            '{ability}',
            t(`ability.${menuFor}`),
          )}
          ariaLabel={t('sheet.essence.saves.menuAria').replace(
            '{ability}',
            t(`ability.${menuFor}`),
          )}
          hasInspiration={character.inspiration}
          onPick={(options) => {
            const target = menuFor;
            setMenuFor(null);
            void performSave(target, options);
          }}
          onClose={() => setMenuFor(null)}
        />
      )}
    </Card>
  );
}

interface SaveChipProps {
  ability: AbilityCode;
  score: number;
  proficient: boolean;
  profBonus: number;
  extraBonus: number;
  disabled: boolean;
  editing: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

function SaveChip({
  ability,
  score,
  proficient,
  profBonus,
  extraBonus,
  disabled,
  editing,
  onTap,
  onLongPress,
}: SaveChipProps): JSX.Element {
  const handlers = useLongPress(onTap, onLongPress);
  const mod =
    abilityModifier(score) + (proficient ? profBonus : 0) + extraBonus;
  const signed = mod >= 0 ? `+${mod}` : `${mod}`;
  return (
    <Tooltip
      label={t(editing ? 'sheet.essence.saves.editHint' : 'sheet.tip.rollSave')}
      decorative
      className="w-full"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={editing ? proficient : undefined}
        aria-label={
          editing
            ? t('sheet.essence.saves.toggleAria').replace(
                '{ability}',
                t(`ability.${ability}`),
              )
            : t('sheet.essence.saves.chipAria').replace('{ability}', t(`ability.${ability}`)) +
              (proficient ? t('sheet.essence.saves.proficientSuffix') : '')
        }
        className={cn(
          'relative flex w-full flex-col items-center justify-center gap-0.5 rounded-card-sm border bg-bg-2/40 px-2 py-2.5 transition-all',
          proficient
            ? 'border-gold-bright/60 bg-gold-bright/[0.06] shadow-[inset_0_0_0_1px_rgba(220,184,108,0.2)]'
            : 'border-white-8 hover:border-soft',
          'hover:bg-white/[0.04] active:scale-[0.97]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...handlers}
      >
        {proficient && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold-bright shadow-[0_0_6px_rgba(220,184,108,0.8)]"
          />
        )}
        <span className="font-title text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
          {t(ABILITY_SHORT_KEYS[ability])}
        </span>
        <span
          className={cn(
            'font-display text-[18px] font-black leading-none tracking-[-0.02em]',
            mod >= 0 ? 'text-gold-bright' : 'text-crimson',
          )}
        >
          {signed}
        </span>
      </button>
    </Tooltip>
  );
}
