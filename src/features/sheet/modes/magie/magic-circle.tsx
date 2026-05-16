import { useMemo } from 'react';

import { Card, CardAction, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';
import {
  consumeSlot,
  restoreSlot,
  unlockedSlotLevels,
} from './spell-slots';

interface MagicCircleProps {
  character: Character;
  readOnly: boolean;
}

const VIEWBOX = 360;
const CENTER = VIEWBOX / 2;
const OUTER_R = 168;
const INNER_R = 44;

/**
 * Cercle d'invocation : SVG concentrique avec un anneau par niveau de slots
 * débloqué (1-9). Chaque slot est un petit hexagone positionné sur son anneau.
 *
 * - Tap un slot plein → consomme (clamp 0), toast.
 * - Long-press un slot vide → restaure (clamp max), toast.
 * - Bouton "Restaurer" en header → restaure tous les emplacements (ad-hoc).
 *
 * Décision tactique (plan 09 step 3) : pas de modal confirm sur tap. La carte
 * est mobile-first, un tap rapide doit pouvoir consommer sans friction ; long-
 * press restaure pour récupérer un mistap. Cohérent avec le ton de la fiche
 * (HP mega-card a la même mécanique tap=action, long-press=alternative).
 */
export function MagicCircle({ character, readOnly }: MagicCircleProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character.id);
  const { data: classCatalog } = useContent('classes');
  const levels = useMemo(
    () => unlockedSlotLevels(character, classCatalog),
    [character, classCatalog],
  );

  const hasAnySlot = levels.length > 0;

  async function handleConsume(level: number): Promise<void> {
    if (readOnly) return;
    const next = consumeSlot(character.spellSlots, level);
    if (!next) {
      showToast({
        kind: 'info',
        title: `Niveau ${level}`,
        sub: 'Plus aucun emplacement à consommer',
      });
      return;
    }
    await updateCharacter({ spellSlots: next });
    const after = next[String(level)]!;
    showToast({
      kind: 'roll',
      title: `Emplacement niv. ${level} consommé`,
      big: `${after.current}/${after.max}`,
      sub: 'Long-press pour restaurer',
    });
  }

  async function handleRestore(level: number): Promise<void> {
    if (readOnly) return;
    const next = restoreSlot(character.spellSlots, level);
    if (!next) return;
    await updateCharacter({ spellSlots: next });
    const after = next[String(level)]!;
    showToast({
      kind: 'heal',
      title: `Emplacement niv. ${level} restauré`,
      big: `${after.current}/${after.max}`,
    });
  }

  async function handleRestoreAll(): Promise<void> {
    if (readOnly) return;
    const next: typeof character.spellSlots = {};
    let changed = false;
    for (const [k, entry] of Object.entries(character.spellSlots)) {
      if (entry.current < entry.max) changed = true;
      next[k] = { current: entry.max, max: entry.max };
    }
    if (!changed) return;
    await updateCharacter({ spellSlots: next });
    showToast({
      kind: 'heal',
      title: 'Repos long simulé',
      sub: 'Tous les emplacements restaurés',
    });
  }

  if (!hasAnySlot) {
    return (
      <Card>
        <CardHeader>
          <h3>Cercle d'invocation</h3>
        </CardHeader>
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Aucun emplacement de sort débloqué pour le moment.
        </p>
      </Card>
    );
  }

  // Espacement des anneaux : INNER_R au centre, OUTER_R sur le bord. Maxi 9
  // niveaux ; pour 1 seul, on prend le rayon médian, sinon répartition linéaire.
  const ringRadii = computeRingRadii(levels.length);

  return (
    <Card>
      <CardHeader>
        <h3>Cercle d'invocation</h3>
        <CardAction onClick={() => void handleRestoreAll()} disabled={readOnly}>
          Restaurer
        </CardAction>
      </CardHeader>

      <div className="relative mx-auto aspect-square w-full max-w-[380px]">
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          {/* Anneau global externe + interne */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_R + 12}
            fill="none"
            stroke="rgba(220,184,108,0.18)"
            strokeWidth="0.8"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={INNER_R - 6}
            fill="none"
            stroke="rgba(220,184,108,0.25)"
            strokeWidth="0.5"
          />

          {/* Anneaux concentriques (un par niveau débloqué) */}
          {levels.map((lvl, i) => (
            <circle
              key={`ring-${lvl}`}
              cx={CENTER}
              cy={CENTER}
              r={ringRadii[i]}
              fill="none"
              stroke="rgba(220,184,108,0.28)"
              strokeWidth="0.6"
            />
          ))}

          {/* Lignes radiales décoratives */}
          <line
            x1={CENTER}
            y1={CENTER - (OUTER_R + 8)}
            x2={CENTER}
            y2={CENTER + (OUTER_R + 8)}
            stroke="rgba(220,184,108,0.18)"
            strokeWidth="0.4"
            strokeDasharray="2 5"
          />
          <line
            x1={CENTER - (OUTER_R + 8)}
            y1={CENTER}
            x2={CENTER + (OUTER_R + 8)}
            y2={CENTER}
            stroke="rgba(220,184,108,0.18)"
            strokeWidth="0.4"
            strokeDasharray="2 5"
          />

          {/* Sigil central : pentagramme stylé */}
          <polygon
            points="180,158 184,175 202,175 188,186 193,203 180,193 167,203 172,186 158,175 176,175"
            fill="rgba(220,184,108,0.4)"
          />
        </svg>

        {/* Slots positionnés sur chaque anneau */}
        {levels.map((lvl, i) => {
          const radius = ringRadii[i]!;
          const slot = character.spellSlots[String(lvl)] ?? { current: 0, max: 0 };
          const count = slot.max;
          if (count === 0) return null;
          // Phase de rotation alternée pour ne pas aligner les slots dessus.
          const phase = i % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / count;
          return Array.from({ length: count }).map((_, idx) => {
            const angle = phase + (idx / count) * Math.PI * 2;
            const x = CENTER + radius * Math.cos(angle);
            const y = CENTER + radius * Math.sin(angle);
            const filled = idx < slot.current;
            return (
              <SlotDot
                key={`s-${lvl}-${idx}`}
                level={lvl}
                viewBoxSize={VIEWBOX}
                x={x}
                y={y}
                filled={filled}
                disabled={readOnly}
                onConsume={() => void handleConsume(lvl)}
                onRestore={() => void handleRestore(lvl)}
              />
            );
          });
        })}

        {/* Labels de niveau (au-dessus/en-dessous des anneaux) */}
        {levels.map((lvl, i) => (
          <span
            key={`lbl-${lvl}`}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 font-title text-[8px] font-bold uppercase tracking-[0.2em] text-text-tertiary"
            style={{
              left: `${(CENTER / VIEWBOX) * 100}%`,
              top: `${((CENTER - ringRadii[i]! - 14) / VIEWBOX) * 100}%`,
            }}
          >
            Niv. {lvl}
          </span>
        ))}

        {/* Centre : indicateur "anneaux débloqués" */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="font-title text-[8px] font-bold uppercase tracking-[0.28em] text-text-tertiary">
            Cercle
          </div>
          <div className="font-display text-[28px] font-black tracking-[-0.02em] text-gold-bright [text-shadow:0_0_18px_rgba(220,184,108,0.5)]">
            {levels.length}
          </div>
          <div className="font-serif text-[11px] italic text-text-tertiary">anneaux</div>
        </div>
      </div>
    </Card>
  );
}

interface SlotDotProps {
  level: number;
  viewBoxSize: number;
  x: number;
  y: number;
  filled: boolean;
  disabled: boolean;
  onConsume: () => void;
  onRestore: () => void;
}

/**
 * Slot individuel : un petit hexagone gold quand plein, contour ambre dim quand
 * vide. Le bouton est rendu en HTML positionné en % (plus simple à styler avec
 * tailwind que des `<g>` SVG, et meilleur sur tap mobile).
 */
function SlotDot({
  level,
  viewBoxSize,
  x,
  y,
  filled,
  disabled,
  onConsume,
  onRestore,
}: SlotDotProps): JSX.Element {
  const handlers = useLongPress(onConsume, onRestore);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={
        filled
          ? `Consommer un emplacement de niveau ${level} (long-press pour restaurer)`
          : `Restaurer un emplacement de niveau ${level} (long-press)`
      }
      className={cn(
        'absolute z-[5] -translate-x-1/2 -translate-y-1/2 transition-all',
        'rounded-full border backdrop-blur-md',
        'h-7 w-7 sm:h-8 sm:w-8',
        filled
          ? 'border-gold-bright bg-gradient-to-br from-gold-bright/80 to-gold/30 shadow-[0_0_12px_rgba(220,184,108,0.55)]'
          : 'border-gold-dim/50 bg-ink/40',
        'hover:scale-110 active:scale-90',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
      style={{
        left: `${(x / viewBoxSize) * 100}%`,
        top: `${(y / viewBoxSize) * 100}%`,
      }}
      {...handlers}
    >
      <span className="block font-display text-[11px] font-black leading-none tracking-[-0.02em] text-ink">
        {filled ? level : ''}
      </span>
    </button>
  );
}

/**
 * Distribue `count` anneaux entre les rayons INNER_R+12 et OUTER_R. Pour 1 seul
 * niveau, retourne le rayon médian.
 */
function computeRingRadii(count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [(INNER_R + OUTER_R) / 2];
  const inner = INNER_R + 20;
  const outer = OUTER_R - 4;
  const step = (outer - inner) / (count - 1);
  return Array.from({ length: count }, (_, i) => inner + step * i);
}
