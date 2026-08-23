import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { useMyCampaigns } from '@/features/campaigns/use-my-campaigns';
import { CodexHitDetail } from '@/features/codex/browsers/codex-hit-view';
import {
  MIN_QUERY_LENGTH,
  rankedCodexHits,
  useCodexIndex,
  type CodexHit,
} from '@/features/codex/browsers/codex-search-index';
import { useCharactersList } from '@/features/library/use-characters-list';
import { Icon } from '@/shared/components/icon';
import { SkeletonList } from '@/shared/components/skeleton';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import { useCommandPaletteStore } from '@/shared/lib/slices/command-palette-slice';
import { DetailModal } from '@/shared/components/detail-modal';

import { CODEX_CATEGORIES } from '@/features/codex/codex-categories';

import {
  DESTINATIONS,
  filterRows,
  nextIndex,
  type PaletteRow,
} from './palette-rows';

/**
 * Palette de commandes — un seul champ pour atteindre n'importe quoi.
 *
 * POURQUOI : jusqu'ici, chaque chose se cherchait là où elle vivait. Un
 * personnage depuis l'accueil, une campagne depuis la liste des campagnes, une
 * règle depuis le Codex — et il fallait d'abord SAVOIR de quel genre était ce
 * qu'on cherchait pour choisir par où entrer. En pleine partie, la question
 * n'arrive jamais rangée : « c'est quoi déjà, Entrave ? », « la fiche de
 * Kaelen », « où est le journal ». La palette accepte les trois sans qu'on ait
 * à trancher d'avance.
 *
 * Trois partis pris :
 *  - **Le Codex n'est chargé que si on le cherche.** Ses dix bundles forment le
 *    plus gros chargement de l'app ; monter l'index sur chaque écran pour le cas
 *    où quelqu'un ouvrirait la palette serait payer partout ce qui sert parfois.
 *    D'où le sous-composant monté au-delà de {@link MIN_QUERY_LENGTH} frappes.
 *  - **Les fiches et les campagnes, elles, sont là dès l'ouverture** : ce sont
 *    quelques documents, et c'est ce qu'on cherche le plus souvent.
 *  - **Un résultat du Codex ouvre la MÊME modale que dans le Codex.** Pas de
 *    fiche appauvrie propre à la recherche (cf. `codex-hit-view`).
 *
 * Clavier : ⌘K / Ctrl+K ouvre et referme, ↑↓ parcourent, ⏎ ouvre, Échap ferme.
 * Le motif ARIA est celui d'une combobox à listbox (`aria-activedescendant`) :
 * le focus ne quitte JAMAIS le champ, sinon chaque flèche couperait la frappe.
 */

/**
 * Combien d'entrées du Codex la palette montre. Assez pour que la bonne y soit
 * (le classement s'en charge), pas assez pour noyer les personnages et les
 * campagnes qui la précèdent.
 */
const CODEX_ROWS_IN_PALETTE = 6;

/** Le raccourci global. Monté une fois, hors de la palette pour survivre à sa fermeture. */
export function CommandPaletteShortcut(): null {
  const toggle = useCommandPaletteStore((s) => s.togglePalette);
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      // `metaKey` (macOS) OU `ctrlKey` (Windows/Linux) — et `e.key` plutôt que
      // `e.code` pour suivre la disposition réelle du clavier.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
  return null;
}

export function CommandPalette(): JSX.Element {
  const open = useCommandPaletteStore((s) => s.open);
  const close = useCommandPaletteStore((s) => s.closePalette);
  return (
    <>
      <CommandPaletteShortcut />
      {/* Le corps ne se monte qu'à l'ouverture : il s'abonne aux personnages et
          va chercher les campagnes — deux choses qui n'ont rien à faire sur
          chaque écran de l'app. */}
      {open ? <PaletteDialog onClose={close} /> : null}
    </>
  );
}

function PaletteDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { characters } = useCharactersList();
  const { campaigns } = useMyCampaigns();
  const { data: classes } = useContent('classes');

  const [query, setQuery] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [openHit, setOpenHit] = useState<CodexHit | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // `DetailModal` place le focus sur son bouton de fermeture à l'ouverture (le
  // premier focusable du panneau). Les effets enfants s'exécutent AVANT ceux du
  // parent : poser le focus ici directement se ferait donc voler. Une image
  // plus tard, le champ le récupère — c'est là que la frappe doit atterrir.
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const go = useCallback(
    (to: string): void => {
      onClose();
      navigate(to);
    },
    [navigate, onClose],
  );

  const characterRows = useMemo<PaletteRow[]>(
    () =>
      characters.map((character) => {
        const first = character.classes[0];
        const cls = first ? classes.find((c) => c.id === first.classId) : null;
        const className = cls
          ? localize(cls.name)
          : (first?.classId ?? '');
        const meta = [
          className,
          `${t('palette.character.level')} ${character.totalLevel}`,
        ]
          .filter(Boolean)
          .join(' · ');
        return {
          key: `character:${character.id}`,
          label: character.name,
          meta,
          icon: 'i-feather' as const,
          haystack: normalizeForSearch(`${character.name} ${meta}`),
          activate: () => go(`/character/${character.id}`),
        };
      }),
    [characters, classes, go],
  );

  const campaignRows = useMemo<PaletteRow[]>(
    () =>
      campaigns.map((campaign) => {
        const isGm = user ? campaign.gmIds.includes(user.uid) : false;
        const meta = isGm ? t('palette.campaign.gm') : t('palette.campaign.player');
        return {
          key: `campaign:${campaign.id}`,
          label: campaign.name,
          meta,
          icon: 'i-shield' as const,
          haystack: normalizeForSearch(`${campaign.name} ${meta}`),
          activate: () => go(`/campaigns/${campaign.id}`),
        };
      }),
    [campaigns, user, go],
  );

  const destinationRows = useMemo<PaletteRow[]>(
    () =>
      DESTINATIONS.map((destination) => {
        const label = t(destination.labelKey);
        return {
          key: `go:${destination.to}`,
          label,
          icon: destination.icon,
          haystack: normalizeForSearch(
            `${label} ${destination.keywords.join(' ')}`,
          ),
          activate: () => go(destination.to),
        };
      }),
    [go],
  );

  const groups = useMemo(
    () => [
      { titleKey: 'palette.group.characters' as const, rows: filterRows(characterRows, query) },
      { titleKey: 'palette.group.campaigns' as const, rows: filterRows(campaignRows, query) },
      { titleKey: 'palette.group.destinations' as const, rows: filterRows(destinationRows, query) },
    ],
    [characterRows, campaignRows, destinationRows, query],
  );

  const [codexRows, setCodexRows] = useState<PaletteRow[]>([]);
  const [codexLoading, setCodexLoading] = useState<boolean>(false);
  const codexWanted = normalizeForSearch(query).length >= MIN_QUERY_LENGTH;

  /**
   * Le volet Codex remonte ses rangées ici. Le garde n'est pas une précaution
   * de style : sans lui, un enfant qui ré-émet une liste ÉQUIVALENTE mais d'une
   * autre identité relance le rendu du parent, qui relance l'enfant — boucle
   * infinie. Comparer les clés fait que seule une vraie liste différente
   * traverse. React abandonne le rendu quand l'état revient identique.
   */
  const publishCodexRows = useCallback((rows: PaletteRow[]) => {
    setCodexRows((prev) =>
      prev.length === rows.length && prev.every((r, i) => r.key === rows[i]?.key)
        ? prev
        : rows,
    );
  }, []);

  // Ordre de parcours au clavier = ordre de lecture à l'écran, Codex compris.
  const flatRows = useMemo(
    () => [...groups.flatMap((g) => g.rows), ...codexRows],
    [groups, codexRows],
  );

  // La sélection retombe en tête à chaque frappe : la première réponse d'une
  // nouvelle question est celle qu'on veut, pas la 4ᵉ de la question d'avant.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Garde la rangée choisie dans le champ de vision quand on descend la liste.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-palette-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, flatRows.length]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => nextIndex(i, flatRows.length, e.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    if (e.key === 'Enter') {
      const row = flatRows[activeIndex];
      if (row) {
        e.preventDefault();
        row.activate();
      }
    }
  }

  const activeKey = flatRows[activeIndex]?.key;
  const nothing = flatRows.length === 0;

  return (
    <>
      <DetailModal
        open={true}
        onClose={onClose}
        size="lg"
        closeLabel={t('palette.close')}
        className="sm:mt-[6vh] sm:self-start"
      >
        <div className="flex flex-col p-4 sm:p-5">
          <h2 className="sr-only">{t('palette.title')}</h2>

          {/* `mr-12` et non `pr-14` : le bouton ✕ de la modale est posé en
              absolu au-dessus du panneau, et un simple padding le laissait
              chevaucher la BORDURE dorée du champ. Il faut lui céder la place,
              pas juste écarter le texte. */}
          <label className="mr-12 flex items-center gap-3 rounded-card-sm border border-soft bg-bg-2/70 px-4 py-3 transition-colors duration-200 ease-base focus-within:border-gold-bright">
            <Icon name="i-search" className="h-4 w-4 flex-shrink-0 text-gold" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={true}
              aria-controls="palette-results"
              aria-activedescendant={activeKey ? `palette-row-${activeKey}` : undefined}
              aria-label={t('palette.placeholder')}
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('palette.placeholder')}
              className="w-full bg-transparent font-serif text-body text-text placeholder:italic placeholder:text-text-faint focus:outline-none"
            />
          </label>

          <div
            ref={listRef}
            id="palette-results"
            role="listbox"
            aria-label={t('palette.title')}
            // La liste s'arrête à mi-hauteur sur mobile pour ne pas passer
            // sous le clavier tactile — contrainte qui n'existe pas à la
            // souris, où la couper ferait disparaître la dernière destination
            // sans que rien ne l'annonce.
            className="mt-3 flex max-h-[52vh] flex-col gap-3 overflow-y-auto sm:max-h-[66vh]"
          >
            {groups.map((group) =>
              group.rows.length === 0 ? null : (
                <PaletteGroup
                  key={group.titleKey}
                  title={t(group.titleKey)}
                  rows={group.rows}
                  activeKey={activeKey}
                  onHover={(key) => setActiveIndex(flatRows.findIndex((r) => r.key === key))}
                />
              ),
            )}

            {codexWanted ? (
              <PaletteCodexSection
                query={query}
                onRows={publishCodexRows}
                onLoading={setCodexLoading}
                onOpenHit={setOpenHit}
                activeKey={activeKey}
                onHover={(key) => setActiveIndex(flatRows.findIndex((r) => r.key === key))}
              />
            ) : null}

            {/* « Rien » ne se dit qu'une fois TOUT interrogé : tant que le
                Codex charge, l'absence de réponse n'en est pas une. */}
            {nothing && !codexLoading ? (
              <p className="px-2 py-6 text-center font-serif italic text-text-tertiary">
                {t('palette.empty')}
              </p>
            ) : null}
          </div>

          <p className="mt-3 hidden items-center justify-center gap-4 font-ui text-[10px] uppercase tracking-[0.16em] text-text-faint sm:flex">
            <span>↑↓ {t('palette.keys.move')}</span>
            <span>⏎ {t('palette.keys.select')}</span>
            <span>Échap {t('palette.keys.close')}</span>
          </p>
        </div>
      </DetailModal>

      {/* Le détail d'une entrée du Codex s'ouvre PAR-DESSUS la palette — on
          consulte la règle sans perdre la recherche qui y menait. */}
      <CodexHitDetail
        hit={openHit}
        onClose={() => setOpenHit(null)}
        classCatalog={classes}
      />
    </>
  );
}

interface PaletteGroupProps {
  title: string;
  rows: readonly PaletteRow[];
  activeKey: string | undefined;
  onHover: (key: string) => void;
}

function PaletteGroup({
  title,
  rows,
  activeKey,
  onHover,
}: PaletteGroupProps): JSX.Element {
  return (
    <section>
      <h3 className="mb-1 px-1 font-title text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
        {title}
      </h3>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => {
          const active = row.key === activeKey;
          return (
            <li key={row.key}>
              <button
                type="button"
                id={`palette-row-${row.key}`}
                role="option"
                aria-selected={active}
                data-palette-active={active}
                onMouseEnter={() => onHover(row.key)}
                onClick={row.activate}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card-sm border px-3 py-2.5 text-left',
                  'transition-all duration-150 ease-base',
                  active
                    ? 'border-soft bg-gold-bright/10'
                    : 'border-transparent hover:bg-white/[0.04]',
                )}
              >
                {row.icon ? (
                  <Icon
                    name={row.icon}
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-colors duration-150 ease-base',
                      active ? 'text-gold-bright' : 'text-text-tertiary',
                    )}
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-body text-text">
                    {row.label}
                  </span>
                  {row.meta ? (
                    <span className="mt-0.5 block truncate font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                      {row.meta}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'font-title text-meta transition-opacity duration-150 ease-base',
                    active ? 'text-gold-bright opacity-100' : 'text-text-faint opacity-0',
                  )}
                >
                  ⏎
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface PaletteCodexSectionProps {
  query: string;
  /** Remonte les rangées au parent, qui tient l'ordre de parcours au clavier. */
  onRows: (rows: PaletteRow[]) => void;
  onOpenHit: (hit: CodexHit) => void;
  /** Tant que c'est vrai, l'absence de résultat n'est pas une réponse. */
  onLoading: (loading: boolean) => void;
  activeKey: string | undefined;
  onHover: (key: string) => void;
}

/**
 * Le volet Codex de la palette. Composant à part et monté tardivement : c'est
 * lui qui déclenche le chargement des dix bundles, et il ne doit le faire que
 * lorsque quelqu'un cherche vraiment une règle.
 *
 * Chaque catégorie est bornée à trois entrées — la palette répond « voilà de
 * quel genre est ta réponse », l'onglet « Tout » du Codex déroule la liste
 * entière quand il en faut plus.
 */
function PaletteCodexSection({
  query,
  onRows,
  onOpenHit,
  onLoading,
  activeKey,
  onHover,
}: PaletteCodexSectionProps): JSX.Element | null {
  const { catalog, loading } = useCodexIndex();

  useEffect(() => {
    onLoading(loading);
    return () => onLoading(false);
  }, [loading, onLoading]);

  const rows = useMemo<PaletteRow[]>(
    () =>
      rankedCodexHits(catalog, query, CODEX_ROWS_IN_PALETTE).map((indexed) => {
        const category = CODEX_CATEGORIES.find((c) => c.id === indexed.hit.category);
        return {
          key: `codex:${indexed.key}`,
          label: indexed.name,
          // La catégorie est la réponse à la moitié de la question : savoir que
          // « Entravé » est un ÉTAT, c'est déjà savoir où ça se joue.
          meta: category ? t(category.labelKey) : undefined,
          icon: category?.icon,
          haystack: indexed.searchText,
          activate: () => onOpenHit(indexed.hit),
        };
      }),
    [catalog, query, onOpenHit],
  );

  // Le parent a besoin des rangées pour le clavier ; l'enfant est le seul à
  // savoir les produire. On les lui remonte à chaque changement réel.
  useEffect(() => {
    onRows(rows);
  }, [rows, onRows]);

  // Vider AU DÉMONTAGE seulement. Le faire dans le nettoyage de l'effet
  // ci-dessus viderait la liste à chaque frappe, une image avant de la
  // reremplir — et le clavier perdrait sa cible entre les deux.
  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;
  useEffect(() => () => onRowsRef.current([]), []);

  if (loading) {
    return <SkeletonList label={t('palette.loading')} rows={3} />;
  }
  if (rows.length === 0) return null;

  return (
    <PaletteGroup
      title={t('palette.group.codex')}
      rows={rows}
      activeKey={activeKey}
      onHover={onHover}
    />
  );
}
