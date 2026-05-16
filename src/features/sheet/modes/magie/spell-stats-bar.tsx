import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import type { SpellcastingClassEntry } from './spell-slots';

interface SpellStatsBarProps {
  character: Character;
  spellcastingClasses: readonly SpellcastingClassEntry[];
}

/**
 * Barre de stats d'incantation : une ligne par classe lanceuse, avec son
 * ability, le DD du sort (8 + PB + mod), le bonus d'attaque (PB + mod) et la
 * capacité de préparation pour les casters préparés (Cleric/Druid/Wizard/etc.)
 * = max(1, abilityMod + classLevel).
 *
 * Plan 09 step 5 — design fidèle au prototype (`.spell-stats` 3 colonnes), mais
 * dupliqué par classe quand le perso est multi-class lanceur (ex : Wizard 5 /
 * Paladin 2 → 2 lignes : INT/DC/+att pour Wizard, CHA/DC/+att pour Paladin).
 */
export function SpellStatsBar({
  character,
  spellcastingClasses,
}: SpellStatsBarProps): JSX.Element | null {
  if (spellcastingClasses.length === 0) return null;
  const pb = proficiencyBonus(character.totalLevel);
  return (
    <div className="flex flex-col gap-3">
      {spellcastingClasses.map((cls) => {
        const mod = abilityModifier(character.abilities[cls.ability]);
        const dc = 8 + pb + mod;
        const attack = pb + mod;
        const prepared = isPreparedCaster(cls.progression)
          ? Math.max(1, mod + cls.level)
          : null;
        const abilityLabel = t(`ability.${cls.ability}`).slice(0, 3).toUpperCase();
        return (
          <div
            key={cls.classId}
            className="rounded-card-sm border border-amethyst/25 bg-gradient-to-b from-amethyst/10 to-ink/30 px-4 py-3 backdrop-blur-md"
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-title text-[10px] font-bold uppercase tracking-[0.22em] text-amethyst">
                {cls.name}
              </span>
              <span className="font-serif text-[12px] italic text-text-tertiary">
                Niv. {cls.level}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Caract." value={abilityLabel} small />
              <Stat label="DD" value={String(dc)} />
              <Stat label="+ attaque" value={signed(attack)} />
            </div>
            {prepared !== null && (
              <p className="mt-2 text-center font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                Préparation : <span className="text-gold-bright">{prepared} sorts</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  small?: boolean;
}

function Stat({ label, value, small }: StatProps): JSX.Element {
  return (
    <div className="rounded-card-sm border border-white-8 bg-ink/40 px-2 py-2">
      <div className="font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
        {label}
      </div>
      <div
        className={
          small
            ? 'font-display text-[18px] font-black tracking-[-0.02em] text-gold-bright'
            : 'font-display text-[26px] font-black tracking-[-0.03em] text-gold-bright [text-shadow:0_0_14px_rgba(220,184,108,0.4)]'
        }
      >
        {value}
      </div>
    </div>
  );
}

function isPreparedCaster(progression: 'full' | 'half' | 'third' | 'pact'): boolean {
  // SRD 2024 : les préparateurs canoniques sont Cleric, Druid, Paladin, Ranger
  // (half), Wizard. Sorcerer / Bard / Warlock connaissent leurs sorts. Le mode
  // de préparation se déduit du type de classe au niveau du content, mais ici
  // on l'approxime par progression : full + half = préparateurs, pact + third
  // = connus. C'est une approximation suffisante pour V1 ; un schéma plus fin
  // (champ `prepared: boolean`) atterrira en plan 17 avec les class features.
  return progression === 'full' || progression === 'half';
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
