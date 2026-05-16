import type { JSX, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * Carte pédagogique (plan 05 §D.1).
 *
 * Affichée à côté d'une liste de choix (desktop = colonne droite, mobile =
 * sous le choix sélectionné). Sert à expliquer une option en langage débutant :
 *   - slogan + difficulté
 *   - paragraphe « À choisir si tu veux… »
 *   - 3 bullets « Tu vas faire ça en jeu »
 */

export type HelpDifficulty = 'easy' | 'medium' | 'expert';

const DIFFICULTY_LABEL: Record<HelpDifficulty, string> = {
  easy: 'Facile à prendre en main',
  medium: 'Demande un peu de stratégie',
  expert: 'Pour joueurs expérimentés',
};

const DIFFICULTY_DOT: Record<HelpDifficulty, string> = {
  easy: 'bg-emerald',
  medium: 'bg-gold',
  expert: 'bg-crimson',
};

interface HelpPanelProps {
  title: string;
  tagline?: string;
  difficulty?: HelpDifficulty;
  whyChoose?: string;
  inGame?: ReadonlyArray<string>;
  /** Slot libre pour des chips ou détails additionnels (ex. stats clés). */
  extra?: ReactNode;
  className?: string;
}

export function HelpPanel({
  title,
  tagline,
  difficulty,
  whyChoose,
  inGame,
  extra,
  className,
}: HelpPanelProps): JSX.Element {
  return (
    <aside
      aria-label={`Aide — ${title}`}
      className={cn(
        'flex flex-col gap-4 rounded-card border border-soft bg-bg-3/30 p-5',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <h3 className="font-display text-display text-gold-bright">{title}</h3>
        {tagline ? (
          <p className="font-serif italic text-text-secondary text-[15px]">{tagline}</p>
        ) : null}
        {difficulty ? (
          <p className="mt-1 flex items-center gap-2 font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            <span
              aria-hidden="true"
              className={cn('h-2 w-2 rounded-full', DIFFICULTY_DOT[difficulty])}
            />
            {DIFFICULTY_LABEL[difficulty]}
          </p>
        ) : null}
      </header>

      {whyChoose ? (
        <div>
          <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            À choisir si tu veux…
          </p>
          <p className="mt-1 font-serif text-body text-text">{whyChoose}</p>
        </div>
      ) : null}

      {inGame && inGame.length > 0 ? (
        <div>
          <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            Tu vas faire ça en jeu
          </p>
          <ul className="mt-1 flex flex-col gap-1.5 font-serif text-body text-text">
            {inGame.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="text-gold-bright">
                  ✦
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {extra}
    </aside>
  );
}

/**
 * Bandeau d'intro (1-2 phrases) en haut d'une étape pédagogique.
 * Plus discret que <HelpPanel>, on l'utilise comme premier élément de chaque
 * étape de choix structurant.
 */
export function StepIntro({ children }: { children: ReactNode }): JSX.Element {
  return (
    <p className="font-serif italic text-body text-text-secondary border-l-2 border-gold-dim/40 pl-4">
      {children}
    </p>
  );
}
