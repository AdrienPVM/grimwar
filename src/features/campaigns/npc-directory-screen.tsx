import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Card } from '@/shared/components/card';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { PageContainer } from '@/shared/components/page-container';
import { Splash } from '@/shared/components/splash';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { NPC_ROLE_LABEL_KEY } from '@/shared/types/npc-labels';
import type { Npc, NpcRole } from '@/shared/types/npc';

import { NpcEditModal } from './npc-edit-modal';
import { NpcPortraitFor } from './npc-portrait';
import {
  collectNpcFacets,
  EMPTY_NPC_FILTER,
  filterNpcs,
  sortNpcs,
  type NpcFilter,
  type NpcSort,
} from './npc-filter';
import { useCampaign } from './use-campaign';
import { useNpcs } from './use-npcs';

/**
 * Route `/campaigns/:cid/npcs` — annuaire des PNJ récurrents (plan 28).
 * UN écran pour les deux rôles :
 *   - MJ : bouton « Nouveau PNJ » + TOUS les PNJ (les secrets `'dm'` portent un
 *     badge « Secret ») + édition via le détail.
 *   - Joueur : seulement les PNJ `visibility:'all'` (la rule borne déjà la query).
 * Filtres par rôle / tag / lieu, dérivés de la liste courante.
 */
export function NpcDirectoryScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid } = useParams<{ cid: string }>();
  const { user } = useAuth();
  const { campaign, isLoading: campaignLoading } = useCampaign(cid);

  const isDM = useMemo<boolean>(
    () => !!campaign && !!user && campaign.gmIds.includes(user.uid),
    [campaign, user],
  );

  const { npcs, isLoading, error, refresh } = useNpcs(cid, isDM);
  const [filter, setFilter] = useState<NpcFilter>(EMPTY_NPC_FILTER);
  const [sort, setSort] = useState<NpcSort>('introduction');
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const facets = useMemo(() => collectNpcFacets(npcs), [npcs]);
  const visible = useMemo(
    () => sortNpcs(filterNpcs(npcs, filter), sort),
    [npcs, filter, sort],
  );

  if (campaignLoading) return <Splash />;

  function renderCard(npc: Npc): JSX.Element {
    return (
      <Card className="transition-colors duration-200 ease-base">
        <button
          type="button"
          onClick={() => navigate(`/campaigns/${cid}/npcs/${npc.id}`)}
          className="flex w-full items-start gap-4 text-left"
        >
          <NpcPortraitFor npc={npc} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-title text-body font-bold uppercase tracking-[0.1em] text-gold-bright">
                {npc.name}
              </h3>
              {isDM && npc.visibility === 'dm' ? (
                <Chip variant="damage">{t('npcs.card.secretBadge')}</Chip>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip variant="gold">{t(NPC_ROLE_LABEL_KEY[npc.role])}</Chip>
              {npc.location.trim() ? (
                <span className="font-serif text-body-sm italic text-text-tertiary">
                  {npc.location}
                </span>
              ) : null}
              {npc.combatStats !== null ? (
                <Chip variant="default">{t('npcs.card.combatBadge')}</Chip>
              ) : null}
            </div>
            {npc.shortDescription.trim() ? (
              <p className="line-clamp-2 font-serif text-body-sm text-text-secondary">
                {npc.shortDescription}
              </p>
            ) : null}
          </div>
        </button>
      </Card>
    );
  }

  return (
    <>
      <PageContainer width="content">
        <nav className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(cid ? `/campaigns/${cid}` : '/campaigns')}
            aria-label={t('npcs.screen.back')}
          >
            ← {t('npcs.screen.back')}
          </Button>
          {isDM ? (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              {t('npcs.screen.newCta')}
            </Button>
          ) : null}
        </nav>

        <header className="mt-4 text-center">
          <Divider className="mb-4" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {t('npcs.screen.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-[60ch] font-serif text-body italic text-text-secondary">
            {isDM ? t('npcs.screen.subtitleDm') : t('npcs.screen.subtitlePlayer')}
          </p>
        </header>

        {npcs.length > 0 ? (
          <>
            {/* Recherche + ordre (M41). Trois facettes fermées ne retrouvent pas
                « Aldric » parmi quarante PNJ, et l'ordre d'introduction devient
                inutilisable passé une dizaine d'entrées. */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <input
                type="search"
                value={filter.query}
                onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                placeholder={t('npcs.search.placeholder')}
                aria-label={t('npcs.search.aria')}
                data-testid="npc-search"
                className="min-w-[16rem] flex-1 rounded-pill border border-white-8 bg-ink/40 px-4 py-2 font-serif text-body text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
              />
              <div
                role="group"
                aria-label={t('npcs.sort.aria')}
                className="flex flex-wrap gap-2"
              >
                {(['introduction', 'alpha'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={sort === key}
                    data-testid={`npc-sort-${key}`}
                    onClick={() => setSort(key)}
                    className={cn(
                      'rounded-pill border px-4 py-1.5 font-title text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 ease-base',
                      sort === key
                        ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
                        : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft hover:text-gold-bright',
                    )}
                  >
                    {t(
                      key === 'introduction'
                        ? 'npcs.sort.introduction'
                        : 'npcs.sort.alpha',
                    )}
                  </button>
                ))}
              </div>
            </div>
            <NpcFilters facets={facets} filter={filter} onChange={setFilter} />
          </>
        ) : null}

        {error ? (
          <p className="mt-10 text-center font-serif text-body-sm text-crimson">
            {t('npcs.screen.loadError')}
          </p>
        ) : isLoading ? (
          <p className="mt-10 text-center font-serif text-body-sm italic text-text-tertiary">
            {t('npcs.screen.loading')}
          </p>
        ) : npcs.length === 0 ? (
          <p className="mt-10 text-center font-serif text-body italic text-text-tertiary">
            {isDM ? t('npcs.screen.empty.dm') : t('npcs.screen.empty.player')}
          </p>
        ) : visible.length === 0 ? (
          <p className="mt-10 text-center font-serif text-body-sm italic text-text-tertiary">
            {t('npcs.screen.noMatch')}
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {visible.map((npc) => (
              <li key={npc.id}>{renderCard(npc)}</li>
            ))}
          </ul>
        )}
      </PageContainer>

      {isDM && cid && user ? (
        <NpcEditModal
          open={createOpen}
          campaignId={cid}
          createdByUid={user.uid}
          npc={null}
          onClose={() => setCreateOpen(false)}
          onSaved={refresh}
        />
      ) : null}
    </>
  );
}

interface NpcFiltersProps {
  facets: ReturnType<typeof collectNpcFacets>;
  filter: NpcFilter;
  onChange: (next: NpcFilter) => void;
}

/** Rangées de filtres pill (rôle / tag / lieu). « Tous » réinitialise la facette. */
function NpcFilters({ facets, filter, onChange }: NpcFiltersProps): JSX.Element {
  return (
    <div
      className="mt-6 flex flex-col gap-3"
      role="group"
      aria-label={t('npcs.filters.aria')}
    >
      <FilterRow
        label={t('npcs.filters.role')}
        options={facets.roles.map((r) => ({ value: r, label: t(NPC_ROLE_LABEL_KEY[r]) }))}
        active={filter.role}
        onPick={(value) => onChange({ ...filter, role: value as NpcRole | null })}
      />
      {facets.tags.length > 0 ? (
        <FilterRow
          label={t('npcs.filters.tag')}
          options={facets.tags.map((tag) => ({ value: tag, label: tag }))}
          active={filter.tag}
          onPick={(value) => onChange({ ...filter, tag: value })}
        />
      ) : null}
      {facets.locations.length > 0 ? (
        <FilterRow
          label={t('npcs.filters.location')}
          options={facets.locations.map((loc) => ({ value: loc, label: loc }))}
          active={filter.location}
          onPick={(value) => onChange({ ...filter, location: value })}
        />
      ) : null}
    </div>
  );
}

interface FilterRowProps {
  label: string;
  options: { value: string; label: string }[];
  active: string | null;
  onPick: (value: string | null) => void;
}

function FilterRow({ label, options, active, onPick }: FilterRowProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </span>
      <FilterPill label={t('npcs.filters.all')} active={active === null} onClick={() => onPick(null)} />
      {options.map((opt) => (
        <FilterPill
          key={opt.value}
          label={opt.label}
          active={active === opt.value}
          onClick={() => onPick(active === opt.value ? null : opt.value)}
        />
      ))}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-pill border px-3 py-1 font-ui text-body-sm transition-colors duration-200 ease-base',
        active
          ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
          : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft hover:text-gold-bright',
      )}
    >
      {label}
    </button>
  );
}
