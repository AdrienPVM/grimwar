import { useMemo, useState } from 'react';

import { useDice } from '@/features/dice/use-dice';
import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import type { Advantage } from '@/shared/lib/dice/types';
import { localize } from '@/shared/lib/i18n';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import type { Character } from '@/shared/types/character';
import type { Item } from '@/shared/types/content';

import { useUpdateCharacter } from '../../use-update-character';

interface AttacksListProps {
  character: Character;
  readOnly: boolean;
}

interface AttackEntry {
  itemId: string;
  weapon: Item;
  attackBonus: number;
  damageFormula: string;
  damageTypeLabel: string;
  ranged: boolean;
}

/**
 * Liste d'attaques dérivée des armes équipées. Le bonus d'attaque combine la
 * caractéristique pertinente (FOR mêlée, DEX distance ou finesse) + bonus de
 * maîtrise. La formule de dégâts est la dice de l'arme + même modificateur.
 *
 * Tap : roll attaque (d20+bonus) + roll dégâts → toast combiné.
 * Long-press : ouvre un mini menu Avantage / Désavantage / Crit.
 */
export function AttacksList({ character, readOnly }: AttacksListProps): JSX.Element {
  const { data: items } = useContent('items');
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const pb = proficiencyBonus(character.totalLevel);
  const forMod = abilityModifier(character.abilities.for);
  const dexMod = abilityModifier(character.abilities.dex);
  const dice = useDice();
  const { updateCharacter } = useUpdateCharacter(character.id);

  const attacks = useMemo<AttackEntry[]>(() => {
    return character.inventory.items
      .filter((entry) => entry.equipped)
      .map<AttackEntry | null>((entry) => {
        const weapon = itemsById.get(entry.contentId);
        if (!weapon || weapon.category !== 'weapon' || !weapon.damage) return null;
        const ranged = Boolean(weapon.range) || (weapon.properties ?? []).some(
          (p) => p.toLowerCase() === 'thrown' || p.includes('ranged'),
        );
        const finesse = (weapon.properties ?? []).some((p) => p.toLowerCase() === 'finesse');
        const baseMod = ranged ? dexMod : finesse ? Math.max(forMod, dexMod) : forMod;
        return {
          itemId: entry.contentId,
          weapon,
          attackBonus: baseMod + pb,
          damageFormula: addModifier(weapon.damage.dice, baseMod),
          damageTypeLabel: localize(weapon.damage.typeLabel),
          ranged,
        };
      })
      .filter((a): a is AttackEntry => a !== null);
  }, [character.inventory.items, itemsById, forMod, dexMod, pb]);

  const [menuFor, setMenuFor] = useState<string | null>(null);

  async function performRoll(
    entry: AttackEntry,
    advantage: Advantage,
    forceCrit: boolean,
  ): Promise<void> {
    if (readOnly) return;
    const name = localize(entry.weapon.name);
    // Plan 12.5 : `rollAttackDamage` peut renvoyer `{attack:null, damage:null}`
    // en mode physique si le joueur « Passe » le prompt. Aucun side-effect
    // additionnel n'est attendu côté UI (le pivot émet déjà un toast adéquat
    // ou rien selon le chemin). Pas d'early return nécessaire — toute future
    // logique post-roll (HP, statut, etc.) DOIT guard sur `attack === null`.
    await dice.rollAttackDamage(entry.attackBonus, entry.damageFormula, {
      character,
      label: name,
      damageTypeLabel: entry.damageTypeLabel,
      advantage,
      forceCrit,
      // Plan 12 : les attaques routent désormais via rollWithFlags ; l'inspiration
      // est respectée comme pour les autres jets d20 (vs plan 07 qui by-passait).
      consumeInspiration: async () => {
        await updateCharacter({ inspiration: false });
      },
    });
  }

  if (attacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3>Attaques</h3>
        </CardHeader>
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Aucune arme équipée. Va dans <strong className="not-italic text-gold-bright">Avoir</strong> pour équiper une arme.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3>Attaques</h3>
      </CardHeader>
      <div className="flex flex-col gap-2">
        {attacks.map((entry) => (
          <AttackRow
            key={entry.itemId}
            entry={entry}
            readOnly={readOnly}
            menuOpen={menuFor === entry.itemId}
            onOpenMenu={() => setMenuFor(entry.itemId)}
            onCloseMenu={() => setMenuFor(null)}
            onPerform={(advantage, crit) => {
              setMenuFor(null);
              void performRoll(entry, advantage, crit);
            }}
          />
        ))}
      </div>
    </Card>
  );
}

interface AttackRowProps {
  entry: AttackEntry;
  readOnly: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onPerform: (advantage: Advantage, forceCrit: boolean) => void;
}

function AttackRow({
  entry,
  readOnly,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
  onPerform,
}: AttackRowProps): JSX.Element {
  const handlers = useLongPress(
    () => onPerform('normal', false),
    () => onOpenMenu(),
  );
  const name = localize(entry.weapon.name);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={readOnly}
        {...handlers}
        className={cn(
          'flex w-full items-center gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] px-4 py-3 text-left transition-all',
          'hover:border-soft hover:bg-white/[0.04] active:scale-[0.99]',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="truncate font-serif text-body text-text">{name}</div>
          <div className="font-ui text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
            {entry.ranged ? 'Distance' : 'Mêlée'} · {entry.damageFormula} {entry.damageTypeLabel}
          </div>
        </div>
        <span className="font-display text-[18px] font-bold tracking-[-0.02em] text-gold-bright">
          {signed(entry.attackBonus)}
        </span>
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 flex gap-1 rounded-card-sm border border-soft bg-glass-2 p-1 shadow-card backdrop-blur-2xl"
        >
          <MenuItem label="Avantage" onClick={() => onPerform('advantage', false)} />
          <MenuItem label="Désav." onClick={() => onPerform('disadvantage', false)} />
          <MenuItem label="Crit" onClick={() => onPerform('normal', true)} />
          <MenuItem label="✕" onClick={onCloseMenu} variant="dim" />
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'dim';
}

function MenuItem({ label, onClick, variant = 'default' }: MenuItemProps): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'rounded-pill px-3 py-1 font-title text-[9px] font-bold uppercase tracking-[0.16em] transition-colors',
        variant === 'default'
          ? 'text-text-secondary hover:bg-white/[0.06] hover:text-gold-bright'
          : 'text-text-tertiary hover:bg-white/[0.04]',
      )}
    >
      {label}
    </button>
  );
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Ajoute `mod` à une formule "NdX" → "NdX+M" (jamais "NdX+-1", qui reste "NdX-1").
 * Si `mod === 0`, renvoie la formule inchangée.
 */
function addModifier(dice: string, mod: number): string {
  if (mod === 0) return dice;
  return mod > 0 ? `${dice}+${mod}` : `${dice}${mod}`;
}
