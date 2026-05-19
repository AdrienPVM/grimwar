import type { JSX } from 'react';

import { HelpPanel, type HelpDifficulty } from '../../help/help-panel';

/**
 * Wrapper standard pour le panneau d'aide inline d'un sous-choix de
 * classe (plan 13.9 commit 2). Pattern identique à
 * `<ChooserHelpPanel>` d'ascendance, mais découplé du type
 * `AncestryHelpEntry` pour permettre l'évolution indépendante des deux
 * sous-trees.
 *
 * Rendu UNIQUEMENT si une option est sélectionnée et qu'une entrée
 * pédagogique existe pour elle. Pas de placeholder « rien à montrer »
 * pour éviter le bruit visuel quand l'utilisateur n'a pas encore choisi.
 */

export interface ClassSubChoiceHelpEntry {
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

interface Props {
  title: string;
  entry: ClassSubChoiceHelpEntry | undefined;
  /**
   * ID DOM optionnel posé sur le `<h3>` interne. Branché par `<DetailModal>`
   * à `aria-labelledby` quand le panneau est rendu à l'intérieur d'une modale
   * (correctif Bug A — pré-consult mobile via le « ? »).
   */
  headingId?: string;
}

export function ClassChooserHelpPanel({
  title,
  entry,
  headingId,
}: Props): JSX.Element | null {
  if (!entry) return null;
  return (
    <HelpPanel
      title={title}
      tagline={entry.tagline}
      whyChoose={entry.whyChoose}
      inGame={entry.inGame}
      difficulty={entry.difficulty}
      headingId={headingId}
    />
  );
}
