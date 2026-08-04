import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import type { WizardDraftProgress } from './draft-progress';

/**
 * Bandeau « Création commencée » de l'accueil — E10 de l'audit UX.
 *
 * Le brouillon de wizard survit déjà à la fermeture de l'onglet (`persist` sur
 * `localStorage`), mais l'accueil n'en disait rien : le même bouton « Créer un
 * personnage » y menait, et l'utilisateur retombait au milieu d'un formulaire
 * qu'il ne se rappelait pas avoir laissé là. On rend le brouillon visible, et
 * surtout ABANDONNABLE — sans ça, le seul moyen d'en sortir était de le mener
 * jusqu'au bout ou de vider son stockage local.
 *
 * Composant PRÉSENTATIONNEL : la lecture du store et la remise à zéro vivent
 * chez l'appelant, la règle « y a-t-il un brouillon » dans `draft-progress.ts`.
 *
 * Volontairement plus sourd que `OngoingPlayCard` (or plein, pastille qui
 * pulse) : une partie qui se joue maintenant prime sur un formulaire en pause.
 */
export function WizardDraftCard({
  progress,
  onDiscard,
  className,
}: {
  progress: WizardDraftProgress | null;
  onDiscard: () => void;
  className?: string;
}): JSX.Element | null {
  if (!progress) return null;

  const name = progress.characterName ?? t('home.draft.unnamed');
  const step = t('home.draft.step')
    .replace('{n}', String(progress.stepIndex))
    .replace('{total}', String(progress.stepCount))
    .replace('{step}', t(progress.stepLabelKey));

  return (
    <div
      className={cn(
        'flex w-full items-center gap-4 rounded-card border border-white-8 bg-white/[0.03] p-4',
        'transition-colors duration-200 ease-base',
        className,
      )}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-card-sm border border-white-8 bg-white/[0.04] text-text-tertiary"
        aria-hidden="true"
      >
        <Icon name="i-feather" className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-title text-meta font-bold uppercase tracking-[0.2em] text-text-tertiary">
          {t('home.draft.label')}
        </span>
        {/* `line-clamp-2` sans `block` : `line-clamp` pose son propre `display`. */}
        <span className="mt-1 line-clamp-2 font-display text-body font-bold uppercase tracking-[0.12em] text-text-secondary">
          {name}
        </span>
        <span className="mt-0.5 block truncate font-serif text-[12px] text-text-tertiary">
          {step}
        </span>
      </span>

      {/* Deux actions ⇒ pas de carte-lien : un `<button>` dans un `<a>` est du
          HTML invalide, et le lecteur d'écran annoncerait une cible pour deux
          gestes différents. */}
      <span className="flex flex-shrink-0 flex-col items-end gap-1">
        <Link
          to="/create"
          aria-label={`${t('home.draft.resumeAria')} ${name}`}
          className={cn(
            'font-title text-meta font-bold uppercase tracking-[0.18em] text-gold-bright',
            'transition-colors duration-150 ease-base hover:text-gold',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
          )}
        >
          {t('home.draft.resume')}
        </Link>
        <button
          type="button"
          onClick={onDiscard}
          aria-label={`${t('home.draft.discardAria')} ${name}`}
          className={cn(
            'font-title text-meta font-bold uppercase tracking-[0.18em] text-text-tertiary',
            'transition-colors duration-150 ease-base hover:text-crimson',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson/40',
          )}
        >
          {t('home.draft.discard')}
        </button>
      </span>
    </div>
  );
}
