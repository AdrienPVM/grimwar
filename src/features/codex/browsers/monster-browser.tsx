import { useId, useMemo, useState, type JSX } from 'react';

import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { ScrollRow } from '@/shared/components/scroll-row';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { formatCr } from '@/shared/lib/rules/challenge-rating';
import type { Monster } from '@/shared/types/content';

import {
  CodexEmpty,
  CodexLoading,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';

import { MonsterStatBlock } from './monster-stat-block';

/**
 * Navigateur de bestiaire du Codex (directive 2026-06-27). Recherche par nom +
 * filtre par taille ; modale = bloc de stats complet (CA, PV, vitesses en
 * mètres, 6 caracs, sens, FP/PX, résistances/immunités/langues, traits +
 * actions + réactions + actions légendaires). Dérivé de `useContent('monsters')`
 * — donc inclut AUTOMATIQUEMENT les monstres importés via packs custom.
 *
 * Le bundle SRD `monsters.json` est vide aujourd'hui : ce navigateur sert
 * d'abord le bestiaire d'extension de l'utilisateur (packs privés). Quand le
 * SRD sera peuplé, il s'affichera ici sans changement de code.
 */
export function MonsterBrowser(): JSX.Element {
  const { data: monsters, loading } = useContent('monsters');
  const [query, setQuery] = useState<string>('');
  const [size, setSize] = useState<string>('all');
  const [active, setActive] = useState<Monster | null>(null);
  const titleId = useId();

  const presentSizes = useMemo(() => {
    const order = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
    const set = new Set(monsters.map((m) => m.size));
    return order.filter((s) => set.has(s as Monster['size']));
  }, [monsters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    return monsters
      .filter((m) => {
        if (size !== 'all' && m.size !== size) return false;
        if (q && !localize(m.name).toLocaleLowerCase('fr').includes(q))
          return false;
        return true;
      })
      .sort((a, b) => a.cr - b.cr || localize(a.name).localeCompare(localize(b.name), 'fr'));
  }, [monsters, query, size]);

  if (loading) return <CodexLoading />;

  return (
    <div className="flex flex-col gap-3">
      <CodexSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('codex.search.monsters')}
      />

      {presentSizes.length > 0 ? (
        <ScrollRow>
          <Chip active={size === 'all'} onToggle={() => setSize('all')}>
            {t('codex.monster.allSizes')}
          </Chip>
          {presentSizes.map((s) => (
            <Chip
              key={s}
              active={size === s}
              onToggle={() => setSize(s)}
              className="whitespace-nowrap"
            >
              {t(`size.${s}` as 'size.medium')}
            </Chip>
          ))}
        </ScrollRow>
      ) : null}

      <CodexResultCount count={filtered.length} />

      {filtered.length === 0 ? (
        <CodexEmpty />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((m) => (
            <li key={m.id}>
              <CodexRow
                title={localize(m.name)}
                onClick={() => setActive(m)}
                meta={
                  <>
                    <span>{t(`size.${m.size}` as 'size.medium')}</span>
                    <span>{m.type}</span>
                    <span className="text-gold">FP {formatCr(m.cr)}</span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <DetailModal
        open={active !== null}
        onClose={() => setActive(null)}
        titleId={titleId}
        size="lg"
      >
        {active ? <MonsterStatBlock monster={active} titleId={titleId} /> : null}
      </DetailModal>
    </div>
  );
}
