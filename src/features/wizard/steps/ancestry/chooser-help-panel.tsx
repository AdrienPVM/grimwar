import type { JSX } from 'react';

import { HelpPanel } from '../../help/help-panel';
import type { AncestryHelpEntry } from '../../help/ancestry-help';

interface Props {
  title: string;
  entry: AncestryHelpEntry | undefined;
}

/**
 * Wrapper standard pour le panneau d'aide inline d'un sous-choix
 * d'ascendance (plan 13.8 step 22).
 *
 * Rendu UNIQUEMENT si une option est sélectionnée et qu'une entrée
 * pédagogique existe pour elle. Pas de placeholder « rien à montrer »
 * pour éviter le bruit visuel quand l'utilisateur n'a pas encore choisi.
 */
export function ChooserHelpPanel({ title, entry }: Props): JSX.Element | null {
  if (!entry) return null;
  return (
    <HelpPanel
      title={title}
      tagline={entry.tagline}
      whyChoose={entry.whyChoose}
      inGame={entry.inGame}
      difficulty={entry.difficulty}
    />
  );
}
