import type { JSX } from 'react';
import { useId } from 'react';

import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { localize, t } from '@/shared/lib/i18n';
import type { ClassEntity, Spell } from '@/shared/types/content';

import { CodexField, CodexModalShell } from '../codex-ui';

interface SpellCodexModalProps {
  spell: Spell;
  classCatalog: readonly ClassEntity[];
  onClose: () => void;
}

function levelLabel(level: number): string {
  return level === 0
    ? t('spell.level.cantrip')
    : `${t('spell.level.prefix')} ${level}`;
}

function componentsLabel(components: Spell['components']): string {
  const parts: string[] = [];
  if (components.v) parts.push('V');
  if (components.s) parts.push('S');
  if (components.m) parts.push('M');
  const base = parts.join(' · ');
  if (components.m && components.material) {
    return `${base} — ${localize(components.material)}`;
  }
  return base || '—';
}

/**
 * Détail d'un sort en contexte CONSULTATION (Codex). Volontairement distinct de
 * la modale de la fiche : pas de `character`, pas de flow de lancement, pas de
 * consommation d'emplacement — on lit le sort, on ne le jette pas. Tous les
 * libellés réutilisent les clés `spell.*` / `school.*` de la fiche pour rester
 * cohérents mot pour mot.
 */
export function SpellCodexModal({
  spell,
  classCatalog,
  onClose,
}: SpellCodexModalProps): JSX.Element {
  const titleId = useId();
  const schoolLabel = t(`school.${spell.school}`);
  const higher = spell.atHigherLevels ? localize(spell.atHigherLevels) : null;

  const classNames = spell.classes
    .map((slug) => {
      const entity = classCatalog.find((c) => c.id === slug);
      return entity ? localize(entity.name) : null;
    })
    .filter((name): name is string => name !== null)
    .sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <DetailModal open onClose={onClose} titleId={titleId} size="lg">
      <CodexModalShell
        titleId={titleId}
        title={localize(spell.name)}
        eyebrow={`${levelLabel(spell.level)} · ${schoolLabel}`}
        subtitle={
          <>
            {spell.concentration ? (
              <Chip variant="magic">{t('spell.flag.concentration')}</Chip>
            ) : null}
            {spell.ritual ? (
              <Chip variant="heal">{t('spell.flag.ritual')}</Chip>
            ) : null}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <CodexField label={t('spell.meta.castingTime')}>
            {localize(spell.castingTime)}
          </CodexField>
          <CodexField label={t('spell.meta.range')}>
            {localize(spell.range)}
          </CodexField>
          <CodexField label={t('spell.meta.components')}>
            {componentsLabel(spell.components)}
          </CodexField>
          <CodexField label={t('spell.meta.duration')}>
            {localize(spell.duration)}
          </CodexField>
        </div>

        <p className="whitespace-pre-line">{localize(spell.description)}</p>

        {higher ? (
          <CodexField label={t('spell.meta.atHigherLevels')}>
            <span className="whitespace-pre-line">{higher}</span>
          </CodexField>
        ) : null}

        {classNames.length > 0 ? (
          <CodexField label={t('codex.spell.classesLabel')}>
            {classNames.join(', ')}
          </CodexField>
        ) : null}
      </CodexModalShell>
    </DetailModal>
  );
}
