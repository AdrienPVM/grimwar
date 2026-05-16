import { useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Icon } from '@/shared/components/icon';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus, totalLevel } from '@/shared/lib/rules/multiclass';
import { t } from '@/shared/lib/i18n';
import type { Character, AbilityCode } from '@/shared/types/character';

import { rollWithFlags } from '@/features/dice/roll-with-flags';
import type { Advantage } from '@/shared/lib/dice/types';

import { useUpdateCharacter } from '../../use-update-character';

interface HexagramProps {
  character: Character;
  readOnly: boolean;
}

interface PointLayout {
  ability: AbilityCode;
  /** Pourcentage horizontal du centre du bouton dans le carré 1:1. */
  left: string;
  /** Pourcentage vertical du centre du bouton dans le carré 1:1. */
  top: string;
  iconName: 'i-for' | 'i-dex' | 'i-con' | 'i-int' | 'i-sag' | 'i-cha';
  shortLabel: string;
}

const HEX_POINTS: readonly PointLayout[] = [
  { ability: 'int', left: '50%', top: '13.75%', iconName: 'i-int', shortLabel: 'Intel.' },
  { ability: 'sag', left: '81.25%', top: '31.75%', iconName: 'i-sag', shortLabel: 'Sagesse' },
  { ability: 'cha', left: '81.25%', top: '68%', iconName: 'i-cha', shortLabel: 'Charisme' },
  { ability: 'for', left: '50%', top: '86.25%', iconName: 'i-for', shortLabel: 'Force' },
  { ability: 'con', left: '18.75%', top: '68%', iconName: 'i-con', shortLabel: 'Const.' },
  { ability: 'dex', left: '18.75%', top: '31.75%', iconName: 'i-dex', shortLabel: 'Dextér.' },
];

/**
 * Hexagramme d'Essence : SVG décoratif (anneaux + 2 triangles + hex intérieur)
 * avec 6 boutons d'aptitudes positionnés sur les sommets. Tap = test d'aptitude
 * normal ; long-press = menu avantage/désav./normal. Le centre affiche le bonus
 * de maîtrise (PB), dérivé du totalLevel — multi-class oblige.
 */
export function Hexagram({ character, readOnly }: HexagramProps): JSX.Element {
  const [menuFor, setMenuFor] = useState<AbilityCode | null>(null);
  const { updateCharacter } = useUpdateCharacter(character.id);

  const pb = proficiencyBonus(totalLevel(character.classes));

  async function performRoll(ability: AbilityCode, advantage: Advantage): Promise<void> {
    if (readOnly) return;
    const mod = abilityModifier(character.abilities[ability]);
    // Plan 12.5 : `result === null` si le joueur Passe en mode physique. Pas de
    // side-effect attendu — le pivot émet déjà toast + log ou rien selon le cas.
    const result = await rollWithFlags({
      character,
      baseMod: mod,
      label: `Test de ${t(`ability.${ability}`)}`,
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
        <h3>Hexagramme</h3>
      </CardHeader>

      <div className="relative mx-auto aspect-square w-full max-w-[460px]">
        {/* Décor SVG : 2 anneaux + 2 triangles + hex intérieur + sigil central. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          <circle
            cx="200"
            cy="200"
            r="190"
            fill="none"
            stroke="rgba(220,184,108,0.15)"
            strokeWidth="0.6"
          />
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="rgba(220,184,108,0.12)"
            strokeWidth="0.4"
            strokeDasharray="3 5"
          />
          <polygon
            points="200,40 339,265 61,265"
            fill="none"
            stroke="rgba(180,150,255,0.18)"
            strokeWidth="0.5"
          />
          <polygon
            points="200,360 61,135 339,135"
            fill="none"
            stroke="rgba(180,150,255,0.18)"
            strokeWidth="0.5"
          />
          <polygon
            points="200,80 305,140 305,260 200,320 95,260 95,140"
            fill="none"
            stroke="rgba(220,184,108,0.28)"
            strokeWidth="0.7"
          />
          <circle
            cx="200"
            cy="200"
            r="40"
            fill="none"
            stroke="rgba(220,184,108,0.35)"
            strokeWidth="0.6"
          />
          <polygon
            points="200,170 207,194 232,194 212,209 220,232 200,218 180,232 188,209 168,194 193,194"
            fill="rgba(220,184,108,0.45)"
          />
        </svg>

        {/* 6 sommets d'aptitude. */}
        {HEX_POINTS.map((p) => (
          <HexPoint
            key={p.ability}
            layout={p}
            score={character.abilities[p.ability]}
            disabled={readOnly}
            onTap={() => void performRoll(p.ability, 'normal')}
            onLongPress={() => setMenuFor(p.ability)}
          />
        ))}

        {/* Centre : Maîtrise / Proficiency Bonus. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
            Maîtrise
          </div>
          <div className="font-display text-[26px] font-black tracking-[-0.02em] text-gold-bright [text-shadow:0_0_18px_rgba(220,184,108,0.5)]">
            +{pb}
          </div>
        </div>

        {menuFor && (
          <AdvantageMenu
            target={HEX_POINTS.find((p) => p.ability === menuFor)!}
            onPick={(adv) => {
              setMenuFor(null);
              void performRoll(menuFor, adv);
            }}
            onClose={() => setMenuFor(null)}
          />
        )}
      </div>
    </Card>
  );
}

interface HexPointProps {
  layout: PointLayout;
  score: number;
  disabled: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

function HexPoint({ layout, score, disabled, onTap, onLongPress }: HexPointProps): JSX.Element {
  const handlers = useLongPress(onTap, onLongPress);
  const mod = abilityModifier(score);
  const signed = mod >= 0 ? `+${mod}` : `${mod}`;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Test de ${layout.ability.toUpperCase()} (long-press pour avantage/désavantage)`}
      className={cn(
        'absolute z-[5] flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border border-soft bg-bg-2/70 backdrop-blur-md transition-all',
        'hover:border-gold-bright hover:bg-gold-bright/10 active:scale-95',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
      style={{ left: layout.left, top: layout.top }}
      {...handlers}
    >
      <Icon name={layout.iconName} className="h-5 w-5 text-gold-bright" />
      <span
        className={cn(
          'font-display text-[20px] font-black leading-none tracking-[-0.02em]',
          mod >= 0 ? 'text-gold-bright' : 'text-crimson',
        )}
      >
        {signed}
      </span>
      <span className="font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
        {layout.shortLabel}
      </span>
    </button>
  );
}

interface AdvantageMenuProps {
  target: PointLayout;
  onPick: (advantage: Advantage) => void;
  onClose: () => void;
}

function AdvantageMenu({ target, onPick, onClose }: AdvantageMenuProps): JSX.Element {
  return (
    <>
      <button
        type="button"
        aria-label="Fermer le menu"
        className="absolute inset-0 z-[10] cursor-default bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="menu"
        className="absolute z-[11] flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1 rounded-card-sm border border-soft bg-bg-2/95 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
        style={{ left: target.left, top: target.top }}
      >
        <MenuButton onClick={() => onPick('advantage')}>Avantage</MenuButton>
        <MenuButton onClick={() => onPick('normal')}>Normal</MenuButton>
        <MenuButton onClick={() => onPick('disadvantage')}>Désavantage</MenuButton>
      </div>
    </>
  );
}

function MenuButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="rounded-pill border border-white-8 bg-white/[0.04] px-4 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:border-gold-bright hover:text-gold-bright"
    >
      {children}
    </button>
  );
}
