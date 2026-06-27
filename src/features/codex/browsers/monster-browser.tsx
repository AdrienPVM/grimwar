import { useId, useMemo, useState, type JSX } from 'react';

import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Monster } from '@/shared/types/content';

import {
  CodexEmpty,
  CodexField,
  CodexLoading,
  CodexModalShell,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';

/** FP affiché en fraction lisible (1/8, 1/4, 1/2) sinon entier. */
function formatCr(cr: number): string {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}

/** Vitesses non nulles → « 9 m, vol 18 m » (pieds → mètres, convention FR). */
function formatSpeed(speed: Monster['speed']): string {
  const parts: string[] = [];
  const toM = (ft: number): string => `${Math.round(ft * 0.3)} m`;
  if (speed.walk) parts.push(toM(speed.walk));
  if (speed.fly) parts.push(`${t('customContent.editor.monsterForm.speedFly')} ${toM(speed.fly)}`);
  if (speed.swim) parts.push(`${t('customContent.editor.monsterForm.speedSwim')} ${toM(speed.swim)}`);
  if (speed.climb) parts.push(`${t('customContent.editor.monsterForm.speedClimb')} ${toM(speed.climb)}`);
  if (speed.burrow) parts.push(`${t('customContent.editor.monsterForm.speedBurrow')} ${toM(speed.burrow)}`);
  return parts.join(', ');
}

/** Une ligne de bloc nom + description (traits, actions…). */
function NamedBlock({
  label,
  entries,
}: {
  label: string;
  entries: { name: { fr: string; en?: string }; description: { fr: string; en?: string } }[];
}): JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <CodexField label={label}>
      <ul className="flex flex-col gap-2">
        {entries.map((e, idx) => (
          <li key={idx}>
            <span className="font-semibold text-text">{localize(e.name)}.</span>{' '}
            <span className="whitespace-pre-line">{localize(e.description)}</span>
          </li>
        ))}
      </ul>
    </CodexField>
  );
}

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
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
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
        </div>
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
        {active ? (
          <CodexModalShell
            titleId={titleId}
            title={localize(active.name)}
            eyebrow={`${t(`size.${active.size}` as 'size.medium')} · ${active.type} · FP ${formatCr(active.cr)}`}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <CodexField label={t('customContent.editor.monsterForm.ac')}>
                {active.ac}
                {active.acDetail ? ` (${localize(active.acDetail)})` : ''}
              </CodexField>
              <CodexField label={t('customContent.editor.monsterForm.hpAvg')}>
                {active.hp.avg} ({active.hp.formula})
              </CodexField>
              <CodexField label={t('customContent.editor.monsterForm.speedWalk')}>
                {formatSpeed(active.speed)}
              </CodexField>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(['for', 'dex', 'con', 'int', 'sag', 'cha'] as const).map((code) => (
                <div key={code} className="text-center">
                  <p className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                    {t(`ability.${code}`)}
                  </p>
                  <p className="font-serif text-body text-text">
                    {active.abilities[code]}
                  </p>
                </div>
              ))}
            </div>

            <CodexField label={t('codex.monster.senses')}>
              {t('customContent.editor.monsterForm.passivePerception')}{' '}
              {active.senses.passivePerception}
              {active.senses.darkvision
                ? ` · ${t('customContent.editor.monsterForm.darkvision')} ${Math.round(active.senses.darkvision * 0.3)} m`
                : ''}
              {active.senses.blindsight
                ? ` · ${t('customContent.editor.monsterForm.blindsight')} ${Math.round(active.senses.blindsight * 0.3)} m`
                : ''}
              {active.senses.tremorsense
                ? ` · ${t('customContent.editor.monsterForm.tremorsense')} ${Math.round(active.senses.tremorsense * 0.3)} m`
                : ''}
              {active.senses.truesight
                ? ` · ${t('customContent.editor.monsterForm.truesight')} ${Math.round(active.senses.truesight * 0.3)} m`
                : ''}
            </CodexField>

            {active.languages.length > 0 ? (
              <CodexField label={t('customContent.editor.monsterForm.languages')}>
                {active.languages.join(', ')}
              </CodexField>
            ) : null}
            {active.resistances.length > 0 ? (
              <CodexField
                label={t('customContent.editor.monsterForm.resistances')}
              >
                {active.resistances.join(', ')}
              </CodexField>
            ) : null}
            {active.immunities.length > 0 ? (
              <CodexField label={t('customContent.editor.monsterForm.immunities')}>
                {active.immunities.join(', ')}
              </CodexField>
            ) : null}

            <NamedBlock
              label={t('customContent.editor.monsterForm.traits')}
              entries={active.traits}
            />
            <NamedBlock
              label={t('customContent.editor.monsterForm.actions')}
              entries={active.actions}
            />
            <NamedBlock
              label={t('customContent.editor.monsterForm.reactions')}
              entries={active.reactions ?? []}
            />
            <NamedBlock
              label={t('customContent.editor.monsterForm.legendaryActions')}
              entries={active.legendaryActions ?? []}
            />
          </CodexModalShell>
        ) : null}
      </DetailModal>
    </div>
  );
}
