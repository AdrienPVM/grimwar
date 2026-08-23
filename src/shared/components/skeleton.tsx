import type { JSX } from 'react';

import { cn } from '../lib/cn';

/**
 * Ossature de chargement — la forme du contenu avant le contenu.
 *
 * **Pourquoi remplacer « Chargement… ».** Un mot au milieu du vide ne dit rien
 * de ce qui arrive : l'écran saute d'une ligne de texte à une pleine page, et le
 * regard doit tout relocaliser. Une ossature qui a déjà la silhouette du
 * contenu supprime ce saut — la page ne se remplit pas, elle se précise. C'est
 * aussi ce qui fait paraître une application rapide alors qu'elle attend
 * exactement aussi longtemps.
 *
 * **Accessibilité.** L'ossature est purement décorative (`aria-hidden`) et le
 * conteneur porte `aria-busy` avec le libellé d'attente en texte hors écran :
 * un lecteur d'écran entend « Chargement des personnages », pas quatorze
 * rectangles.
 *
 * Le miroitement respecte `prefers-reduced-motion` : sans lui, l'ossature reste
 * une forme sourde, immobile.
 */
export function Skeleton({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn('skeleton block rounded-card-sm', className)}
    />
  );
}

interface SkeletonBlockProps {
  /** Annoncé aux lecteurs d'écran à la place des formes. */
  label: string;
  className?: string;
  children: React.ReactNode;
}

/** Enveloppe une ossature : marque l'attente et la nomme. */
export function SkeletonBlock({
  label,
  className,
  children,
}: SkeletonBlockProps): JSX.Element {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * Ossature d'une liste de cartes — la silhouette la plus fréquente de l'app
 * (personnages, campagnes, séances, rencontres, PNJ).
 */
export function SkeletonList({
  label,
  rows = 3,
  className,
}: {
  label: string;
  rows?: number;
  className?: string;
}): JSX.Element {
  return (
    <SkeletonBlock label={label} className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-card border border-white-8 bg-white/[0.02] p-4"
        >
          <Skeleton className="h-11 w-11 flex-shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            {/* Deux barres de largeurs différentes : deux barres identiques se
                lisent comme un motif décoratif, pas comme du texte à venir. */}
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="mt-2 h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </SkeletonBlock>
  );
}

/** Ossature d'un bloc de texte — modales de détail, descriptions SRD. */
export function SkeletonText({
  label,
  lines = 4,
  className,
}: {
  label: string;
  lines?: number;
  className?: string;
}): JSX.Element {
  return (
    <SkeletonBlock label={label} className={cn('flex flex-col gap-2.5', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 && 'w-2/3')}
        />
      ))}
    </SkeletonBlock>
  );
}
