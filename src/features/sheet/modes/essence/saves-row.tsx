import { Card, CardHeader } from '@/shared/components/card';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { abilityModifier, ABILITY_ORDER } from '@/shared/lib/rules/abilities';
import { proficiencyBonus, totalLevel } from '@/shared/lib/rules/multiclass';
import { t } from '@/shared/lib/i18n';
import type { AbilityCode, Character } from '@/shared/types/character';
import { useState } from 'react';

import { rollWithFlags } from '@/features/dice/roll-with-flags';
import type { Advantage } from '@/shared/lib/dice/types';

import { useUpdateCharacter } from '../../use-update-character';

interface SavesRowProps {
  character: Character;
  readOnly: boolean;
}

const ABILITY_SHORT: Record<AbilityCode, string> = {
  for: 'For',
  dex: 'Dex',
  con: 'Con',
  int: 'Int',
  sag: 'Sag',
  cha: 'Cha',
};

/**
 * Rangée des 6 jets de sauvegarde. Chip avec point doré quand le PJ est maître
 * de la sauvegarde (ajoute le PB au mod). Tap = jet normal, long-press = menu
 * avantage/désav. partagé avec l'hexagramme.
 */
export function SavesRow({ character, readOnly }: SavesRowProps): JSX.Element {
  const [menuFor, setMenuFor] = useState<AbilityCode | null>(null);
  const { updateCharacter } = useUpdateCharacter(character.id);
  const pb = proficiencyBonus(totalLevel(character.classes));

  async function performSave(ability: AbilityCode, advantage: Advantage): Promise<void> {
    if (readOnly) return;
    const proficient = character.saves[ability];
    const mod = abilityModifier(character.abilities[ability]) + (proficient ? pb : 0);
    // Plan 12.5 : `result === null` si Passer en mode physique. Pas de side-effect.
    const result = await rollWithFlags({
      character,
      baseMod: mod,
      label: `JS ${ABILITY_SHORT[ability]}`,
      advantage,
      consumeInspiration: async () => {
        await updateCharacter({ inspiration: false });
      },
    });
    if (!result) return;
  }

  return (
    <Card>
      <CardHeader>
        <h3>Sauvegardes</h3>
      </CardHeader>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITY_ORDER.map((ability) => (
          <SaveChip
            key={ability}
            ability={ability}
            score={character.abilities[ability]}
            proficient={character.saves[ability]}
            profBonus={pb}
            disabled={readOnly}
            onTap={() => void performSave(ability, 'normal')}
            onLongPress={() => setMenuFor(ability)}
          />
        ))}
      </div>

      {menuFor && (
        <SaveMenuOverlay
          ability={menuFor}
          onPick={(adv) => {
            const target = menuFor;
            setMenuFor(null);
            void performSave(target, adv);
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
  disabled: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

function SaveChip({
  ability,
  score,
  proficient,
  profBonus,
  disabled,
  onTap,
  onLongPress,
}: SaveChipProps): JSX.Element {
  const handlers = useLongPress(onTap, onLongPress);
  const mod = abilityModifier(score) + (proficient ? profBonus : 0);
  const signed = mod >= 0 ? `+${mod}` : `${mod}`;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Jet de sauvegarde ${t(`ability.${ability}`)}${proficient ? ' (maîtrise)' : ''}`}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5 rounded-card-sm border bg-bg-2/40 px-2 py-2.5 transition-all',
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
        {ABILITY_SHORT[ability]}
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
  );
}

function SaveMenuOverlay({
  ability,
  onPick,
  onClose,
}: {
  ability: AbilityCode;
  onPick: (advantage: Advantage) => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <div
      role="dialog"
      aria-label={`Options pour le jet de sauvegarde ${t(`ability.${ability}`)}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex flex-col gap-2 rounded-card border border-soft bg-bg-2/95 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <p className="mb-2 text-center font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
          JS {t(`ability.${ability}`)}
        </p>
        <button
          type="button"
          onClick={() => onPick('advantage')}
          className="rounded-pill border border-white-8 bg-white/[0.04] px-5 py-2 font-title text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:border-gold-bright hover:text-gold-bright"
        >
          Avantage
        </button>
        <button
          type="button"
          onClick={() => onPick('normal')}
          className="rounded-pill border border-white-8 bg-white/[0.04] px-5 py-2 font-title text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:border-gold-bright hover:text-gold-bright"
        >
          Normal
        </button>
        <button
          type="button"
          onClick={() => onPick('disadvantage')}
          className="rounded-pill border border-white-8 bg-white/[0.04] px-5 py-2 font-title text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:border-gold-bright hover:text-gold-bright"
        >
          Désavantage
        </button>
      </div>
    </div>
  );
}
