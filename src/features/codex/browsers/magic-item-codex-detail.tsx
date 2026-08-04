import type { JSX } from 'react';

import { localize, t } from '@/shared/lib/i18n';
import type { MagicItem, Rarity } from '@/shared/types/content';

import { CodexField, CodexModalShell } from '../codex-ui';

/**
 * Corps de la modale détail d'un objet magique, et couleurs de rareté associées.
 * Extrait de `magic-item-browser.tsx` pour être partagé avec la recherche
 * transverse — même fiche, quel que soit le chemin d'accès.
 */

/** Ordre canonique des raretés (SRD). */
export const RARITY_ORDER: readonly Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'very rare',
  'legendary',
  'artifact',
];

/** Couleur de rareté (tokens existants), du plus commun au plus rare. */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: 'text-text-secondary',
  uncommon: 'text-teal',
  rare: 'text-gold',
  'very rare': 'text-amethyst',
  legendary: 'text-crimson',
  artifact: 'text-gold-bright',
};

export function magicItemAttunementText(item: MagicItem): string | null {
  if (item.attunement === true) return t('codex.item.attunementRequired');
  if (item.attunement && typeof item.attunement === 'object') {
    return localize(item.attunement);
  }
  return null;
}

export function MagicItemCodexDetail({
  item,
  titleId,
}: {
  item: MagicItem;
  titleId: string;
}): JSX.Element {
  const attunement = magicItemAttunementText(item);
  return (
    <CodexModalShell
      titleId={titleId}
      title={localize(item.name)}
      eyebrow={`${t(`item.category.${item.category}`)} · ${t(
        `rarity.${item.rarity}`,
      )}`}
    >
      {attunement ? (
        <CodexField label={t('codex.item.attunement')}>{attunement}</CodexField>
      ) : null}
      <p className="whitespace-pre-line text-amethyst">
        {localize(item.magicDescription)}
      </p>
      {item.description ? (
        <p className="whitespace-pre-line">{localize(item.description)}</p>
      ) : null}
    </CodexModalShell>
  );
}
