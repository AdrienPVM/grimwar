import type { JSX, ReactNode } from 'react';

import { Icon } from '@/shared/components/icon';
import { SkeletonList } from '@/shared/components/skeleton';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

/**
 * Briques d'UI partagées par les navigateurs du Codex (plan 19). Centralise le
 * champ de recherche, la ligne « N résultats », l'état vide et l'état de
 * chargement pour que tous les browsers (sorts, dons, états…) aient un rendu
 * cohérent sans dupliquer la même structure.
 *
 * Le Codex est un navigateur en LECTURE SEULE dérivé des bundles
 * `public/data/*.json` — aucune écriture Firestore, aucun event, aucun
 * `character`. C'est volontaire : on consulte la matière SRD, on ne joue pas.
 */

interface CodexSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function CodexSearchField({
  value,
  onChange,
  placeholder,
}: CodexSearchFieldProps): JSX.Element {
  return (
    <label className="flex items-center gap-2 rounded-card-sm border border-white-8 bg-bg-2/60 px-3 py-2.5">
      <Icon name="i-search" className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent font-serif text-body text-text placeholder:text-text-faint focus:outline-none"
      />
    </label>
  );
}

/** Ligne « 42 résultats » avec singulier/pluriel correct. */
export function CodexResultCount({ count }: { count: number }): JSX.Element {
  const label =
    count === 1 ? t('codex.result.singular') : t('codex.result.plural');
  return (
    <p
      aria-live="polite"
      className="font-title text-[10px] font-bold uppercase tracking-[0.22em] text-text-tertiary"
    >
      {count} · {label}
    </p>
  );
}

export function CodexEmpty(): JSX.Element {
  return (
    <p className="rounded-card-sm border border-white-8 bg-white/[0.02] px-5 py-8 text-center font-serif italic text-text-tertiary">
      {t('codex.empty')}
    </p>
  );
}

/**
 * Attente du Codex — l'ossature des rangées à venir, pas un mot au milieu du
 * vide. Le Codex charge des bundles de plusieurs centaines d'entrées : c'est
 * l'écran de l'app où l'attente se voit le plus.
 */
export function CodexLoading(): JSX.Element {
  return <SkeletonList label={t('codex.loading')} rows={6} className="mt-1" />;
}

interface CodexRowProps {
  onClick: () => void;
  /** Badge de gauche (losange niveau, glyphe rareté…). */
  badge?: ReactNode;
  title: string;
  /** Ligne de méta sous le titre (école · composantes, prérequis…). */
  meta?: ReactNode;
  className?: string;
}

/**
 * Rangée cliquable standard du Codex — losange/badge à gauche, titre + méta à
 * droite, micro-interaction de lift au hover (identique aux lignes de sort de
 * la fiche).
 */
export function CodexRow({
  onClick,
  badge,
  title,
  meta,
  className,
}: CodexRowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-card-sm border border-white-8 bg-white/[0.025] px-4 py-3 text-left',
        'transition-all duration-150 ease-base hover:-translate-y-px hover:border-soft hover:bg-white/[0.04] active:scale-[0.99]',
        className,
      )}
    >
      {badge}
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-body text-text">{title}</div>
        {meta ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {meta}
          </div>
        ) : null}
      </div>
      <span aria-hidden="true" className="font-title text-meta text-text-faint">
        ›
      </span>
    </button>
  );
}

interface CodexModalShellProps {
  titleId: string;
  title: string;
  /** Sur-titre méta (catégorie, niveau…) au-dessus du titre. */
  eyebrow?: ReactNode;
  /** Bandeau de méta sous le titre (chips, école…). */
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * Mise en page commune du contenu d'une modale de détail du Codex : eyebrow
 * méta doré, titre Cinzel, séparateur, puis corps. Le `<DetailModal>` parent
 * fournit le portal + le bouton de fermeture + le piège de focus.
 */
export function CodexModalShell({
  titleId,
  title,
  eyebrow,
  subtitle,
  children,
}: CodexModalShellProps): JSX.Element {
  return (
    <div className="p-6 sm:p-7">
      {eyebrow ? (
        <p className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={titleId}
        className="pr-10 font-display text-xl font-bold uppercase tracking-[0.12em] text-gold-bright [text-shadow:0_0_16px_rgba(220,184,108,0.25)]"
      >
        {title}
      </h2>
      {subtitle ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">{subtitle}</div>
      ) : null}
      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="mt-4 flex flex-col gap-4 font-serif text-body leading-relaxed text-text-secondary">
        {children}
      </div>
    </div>
  );
}

/** Bloc « label + valeur » des fiches détail (Prérequis, Portée…). */
export function CodexField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div>
      <p className="font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
        {label}
      </p>
      <div className="mt-1 text-body text-text-secondary">{children}</div>
    </div>
  );
}
