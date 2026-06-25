import { type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import type { Npc, NpcPortrait as NpcPortraitData } from '@/shared/types/npc';

interface NpcPortraitProps {
  portrait: NpcPortraitData;
  /** Repli sur la 1ʳᵉ lettre du nom si le portrait n'a pas de valeur. */
  name: string;
  size?: 'sm' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'lg', string> = {
  sm: 'h-14 w-14 text-2xl',
  lg: 'h-28 w-28 text-5xl',
};

/**
 * Médaillon-portrait d'un PNJ — rond enluminé (anneau or, fond glass, glyphe or
 * centré). Distinct du losange HP des PJ (`HeroEmblem`, qui porte la barre de
 * vie) : un PNJ n'a pas de PV affiché ici, juste une identité visuelle.
 *
 * En V1 (plan 28) on rend la VALEUR comme un glyphe (lettre/emoji), exactement
 * comme les cartes de PJ (`character-card.tsx`) — le système de portrait n'a pas
 * de pipeline SVG/image rendu. L'upload d'image (`type:'image'`) est différé en
 * sous-plan 28b (Firebase Storage). On évite `dangerouslySetInnerHTML` pour le
 * `type:'svg'` (interdit sans sanitisation) : la valeur retombe sur le glyphe.
 */
export function NpcPortrait({
  portrait,
  name,
  size = 'sm',
  className,
}: NpcPortraitProps): JSX.Element {
  const glyph = (portrait.value || name[0] || '?').slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'border border-gold/60 bg-gradient-to-b from-bg-elev to-bg-2',
        'font-display font-semibold text-gold-bright',
        'shadow-[0_4px_16px_rgba(0,0,0,0.5),0_0_18px_rgba(220,184,108,0.12)]',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {glyph}
    </span>
  );
}

/** Raccourci : rend le portrait d'un PNJ complet. */
export function NpcPortraitFor({
  npc,
  size,
  className,
}: {
  npc: Pick<Npc, 'portrait' | 'name'>;
  size?: 'sm' | 'lg';
  className?: string;
}): JSX.Element {
  return (
    <NpcPortrait portrait={npc.portrait} name={npc.name} size={size} className={className} />
  );
}
