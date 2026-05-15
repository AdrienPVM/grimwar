import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

type HeroEmblemProps = {
  hp: number;
  hpMax: number;
  letter: string;
  className?: string;
};

/**
 * Périmètre du polygone-diamant (100,14)→(186,100)→(100,186)→(14,100).
 * Côté = √(86² + 86²) = 121.62, périmètre = 486.49. Le prototype utilise 481
 * comme dasharray fixe ; on reste sur 481 pour rester pixel-identique.
 */
const DIAMOND_PERIMETER = 481;
const LOW_HP_RATIO = 0.25;

/**
 * Emblème diamant central du hero card : fond glass, contour HP draggable
 * via stroke-dashoffset, lettre stylisée au centre, étoiles de Damas ⚜
 * latérales, badge HP/HP max en bas.
 *
 * `useId()` garantit que plusieurs <HeroEmblem> sur la même page ont des
 * gradients SVG distincts (autrement les `<defs id="emGrad">` collideraient).
 */
export function HeroEmblem({ hp, hpMax, letter, className }: HeroEmblemProps): JSX.Element {
  const uid = useId().replace(/:/g, '');
  const emGradId = `em-${uid}`;
  const hpGradId = `hp-${uid}`;
  const letterGradId = `letter-${uid}`;

  const ratio = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
  const dashOffset = DIAMOND_PERIMETER * (1 - ratio);
  const isLowHp = ratio > 0 && ratio < LOW_HP_RATIO;

  return (
    <div className={cn('relative h-[200px] w-[200px] flex-shrink-0', className)}>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <linearGradient id={emGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--bg-elev)" />
            <stop offset="100%" stopColor="var(--bg-2)" />
          </linearGradient>
          <linearGradient id={hpGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="50%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--gold-bright)" />
          </linearGradient>
          <linearGradient id={letterGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-bright)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        {/* anneau extérieur (or très atténué) */}
        <polygon
          points="100,2 198,100 100,198 2,100"
          fill="none"
          stroke="rgba(220,184,108,0.1)"
          strokeWidth="1.5"
        />
        {/* fond diamant — glass dégradé */}
        <polygon points="100,14 186,100 100,186 14,100" fill={`url(#${emGradId})`} />
        {/* contour HP */}
        <polygon
          points="100,14 186,100 100,186 14,100"
          fill="none"
          stroke={isLowHp ? 'var(--crimson)' : `url(#${hpGradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={DIAMOND_PERIMETER}
          strokeDashoffset={dashOffset}
          style={{
            filter: isLowHp
              ? 'drop-shadow(0 0 10px rgba(232,90,90,0.5))'
              : 'drop-shadow(0 0 10px var(--gold-glow))',
            transition: 'stroke-dashoffset 0.7s var(--t-spring)',
          }}
        />
        {/* 4 points dorés aux sommets */}
        <circle cx="100" cy="6" r="3.5" fill="var(--gold)" />
        <circle cx="194" cy="100" r="3.5" fill="var(--gold)" />
        <circle cx="100" cy="194" r="3.5" fill="var(--gold)" />
        <circle cx="6" cy="100" r="3.5" fill="var(--gold)" />
        {/* cercle d'ombre intérieur */}
        <circle
          cx="100"
          cy="100"
          r="62"
          fill="none"
          stroke="rgba(220,184,108,0.1)"
          strokeWidth="0.8"
        />
        {/* lettre centrale Cinzel Decorative */}
        <text
          x="100"
          y="138"
          textAnchor="middle"
          fill={`url(#${letterGradId})`}
          style={{
            fontFamily: '"Cinzel Decorative", Georgia, serif',
            fontWeight: 700,
            fontSize: '100px',
            filter: 'drop-shadow(0 4px 16px rgba(220,184,108,0.5))',
          }}
        >
          {letter}
        </text>
      </svg>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[-22px] top-1/2 -translate-y-1/2 text-[28px] text-gold opacity-85 drop-shadow-[0_0_8px_var(--gold-glow)]"
      >
        ⚜
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[-22px] top-1/2 -translate-y-1/2 -scale-x-100 text-[28px] text-gold opacity-85 drop-shadow-[0_0_8px_var(--gold-glow)]"
      >
        ⚜
      </span>

      <div
        className={cn(
          'absolute -bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-baseline gap-1',
          'whitespace-nowrap rounded-pill border border-gold px-5 py-1.5',
          'bg-gradient-to-b from-bg-elev to-bg-2 font-serif',
          'shadow-[0_8px_24px_rgba(0,0,0,0.7),0_0_24px_rgba(220,184,108,0.2)]',
        )}
      >
        <span className="font-display text-[24px] font-semibold tracking-tight text-gold-bright">
          {hp}
        </span>
        <span className="text-[14px] italic text-text-tertiary">/ {hpMax}</span>
      </div>
    </div>
  );
}
