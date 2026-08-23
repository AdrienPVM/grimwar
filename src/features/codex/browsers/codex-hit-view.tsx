import { useId, type JSX, type ReactNode } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { t } from '@/shared/lib/i18n';
import { formatCr } from '@/shared/lib/rules/challenge-rating';
import type { ClassEntity } from '@/shared/types/content';

import { CodexModalShell } from '../codex-ui';
import {
  buildAncestryEntries,
  buildBackgroundEntries,
  buildClassEntries,
} from './codex-build-browsers';
import type { CodexHit } from './codex-search-index';
import {
  buildConditionEntries,
  buildFeatEntries,
  buildInvocationEntries,
} from './codex-text-browsers';
import { ItemCodexDetail, formatItemDamage } from './item-codex-detail';
import { MagicItemCodexDetail, RARITY_COLOR } from './magic-item-codex-detail';
import { MonsterStatBlock } from './monster-stat-block';
import { SpellCodexModal } from './spell-codex-modal';
import type { CodexEntry } from './text-entity-browser';

/**
 * Présentation d'un résultat de recherche transverse — la ligne de méta et la
 * modale de détail. Partagé par l'onglet « Tout » du Codex et la palette de
 * commandes (⌘K) : un résultat s'ouvre sur la MÊME fiche quel que soit l'endroit
 * d'où on l'a cherché, plutôt que sur une version appauvrie propre à la palette.
 */

/** Ligne de méta d'un résultat : ce qui distingue l'entrée DANS sa catégorie. */
export function hitMeta(hit: CodexHit): ReactNode {
  switch (hit.category) {
    case 'spells':
      return (
        <>
          <span>
            {hit.value.level === 0
              ? t('spell.level.cantrip')
              : `${t('spell.level.prefix')} ${hit.value.level}`}
          </span>
          <span>{t(`school.${hit.value.school}`)}</span>
        </>
      );
    case 'magicItems':
      return (
        <span className={RARITY_COLOR[hit.value.rarity]}>
          {t(`rarity.${hit.value.rarity}`)}
        </span>
      );
    case 'items':
      return (
        <>
          <span>{t(`item.category.${hit.value.category}`)}</span>
          {formatItemDamage(hit.value) ? (
            <span className="text-crimson">{formatItemDamage(hit.value)}</span>
          ) : null}
        </>
      );
    case 'monsters':
      return (
        <>
          <span>{t(`size.${hit.value.size}` as 'size.medium')}</span>
          <span className="text-gold">FP {formatCr(hit.value.cr)}</span>
        </>
      );
    case 'classes':
      return <span>{hit.value.hitDie}</span>;
    case 'ancestries':
      return <span>{t(`size.${hit.value.size}` as 'size.medium')}</span>;
    case 'backgrounds':
    case 'feats':
    case 'invocations':
    case 'conditions':
      return null;
  }
}

/**
 * Entrée `CodexEntry` d'un résultat « texte », reconstruite à la demande pour
 * le SEUL résultat ouvert. Construire les entrées des dix bundles d'avance
 * fabriquerait des milliers d'arbres React à chaque frappe pour n'en afficher
 * qu'un.
 */
function textEntry(hit: CodexHit): CodexEntry | null {
  switch (hit.category) {
    case 'ancestries':
      return buildAncestryEntries([hit.value])[0] ?? null;
    case 'backgrounds':
      return buildBackgroundEntries([hit.value])[0] ?? null;
    case 'classes':
      return buildClassEntries([hit.value])[0] ?? null;
    case 'feats':
      return buildFeatEntries([hit.value])[0] ?? null;
    case 'invocations':
      return buildInvocationEntries([hit.value])[0] ?? null;
    case 'conditions':
      return buildConditionEntries([hit.value])[0] ?? null;
    default:
      return null;
  }
}

interface CodexHitDetailProps {
  /** `null` → rien d'ouvert. */
  hit: CodexHit | null;
  onClose: () => void;
  /** Catalogue des classes, pour la liste des lanceurs d'un sort. */
  classCatalog: readonly ClassEntity[];
}

/** La modale de détail correspondant à la catégorie du résultat ouvert. */
export function CodexHitDetail({
  hit,
  onClose,
  classCatalog,
}: CodexHitDetailProps): JSX.Element {
  const titleId = useId();
  const entry = hit ? textEntry(hit) : null;

  return (
    <>
      {hit?.category === 'spells' ? (
        <SpellCodexModal
          spell={hit.value}
          classCatalog={[...classCatalog]}
          onClose={onClose}
        />
      ) : null}

      <DetailModal
        open={hit !== null && hit.category !== 'spells'}
        onClose={onClose}
        titleId={titleId}
        size="lg"
      >
        {hit?.category === 'monsters' ? (
          <MonsterStatBlock monster={hit.value} titleId={titleId} />
        ) : hit?.category === 'items' ? (
          <ItemCodexDetail item={hit.value} titleId={titleId} />
        ) : hit?.category === 'magicItems' ? (
          <MagicItemCodexDetail item={hit.value} titleId={titleId} />
        ) : entry ? (
          <CodexModalShell
            titleId={titleId}
            title={entry.name}
            eyebrow={entry.eyebrow}
            subtitle={entry.subtitle}
          >
            {entry.body}
          </CodexModalShell>
        ) : null}
      </DetailModal>
    </>
  );
}
