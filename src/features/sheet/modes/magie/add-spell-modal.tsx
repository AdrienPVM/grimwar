import { useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Icon } from '@/shared/components/icon';
import { Select } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { useUpdateCharacter } from '../../use-update-character';

interface AddSpellModalProps {
  character: Character;
  /** Classes lanceuses du perso — la cible d'écriture dans `knownSpells`. */
  spellcasterClassIds: readonly string[];
  open: boolean;
  onClose: () => void;
}

/** Nombre de résultats rendus. Au-delà, la recherche n'a pas encore fait son travail. */
const MAX_RESULTS = 40;

/**
 * Ajout d'un sort à la liste connue d'un personnage (M26).
 *
 * « Recopier Boule de feu depuis un parchemin trouvé », « un sort de domaine
 * hors liste de classe » : `knownSpells` n'était écrit que par le wizard de
 * création et la montée de niveau. Tout ce qui s'apprend EN JEU n'avait aucune
 * porte.
 *
 * Le catalogue vient de `useContent('spells')`, donc packs maison compris — un
 * sort importé s'ajoute comme un sort SRD. Aucun filtre par liste de classe :
 * c'est précisément le mur qu'on lève. La classe choisie dit sous quelle clé le
 * sort est rangé (elle détermine la caractéristique d'incantation), pas s'il a
 * le droit d'exister.
 */
export function AddSpellModal({
  character,
  spellcasterClassIds,
  open,
  onClose,
}: AddSpellModalProps): JSX.Element | null {
  const { data: spells } = useContent('spells');
  const { data: classCatalog } = useContent('classes');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [query, setQuery] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>(
    spellcasterClassIds[0] ?? '',
  );

  const classOptions = useMemo(
    () =>
      spellcasterClassIds.map((id) => ({
        value: id,
        label: localize(classCatalog.find((c) => c.id === id)?.name ?? { fr: id, en: id }),
      })),
    [spellcasterClassIds, classCatalog],
  );

  const activeClassId = targetClassId || (spellcasterClassIds[0] ?? '');

  const knownIds = useMemo(() => {
    const ids = new Set<string>();
    for (const list of Object.values(character.knownSpells)) {
      for (const id of list) ids.add(id);
    }
    for (const list of Object.values(character.preparedSpells)) {
      for (const id of list) ids.add(id);
    }
    return ids;
  }, [character.knownSpells, character.preparedSpells]);

  const results = useMemo(() => {
    const q = normalizeForSearch(query);
    if (q.length < 2) return [];
    return spells
      .filter((s) => normalizeForSearch(localize(s.name)).includes(q))
      .sort((a, b) => a.level - b.level || localize(a.name).localeCompare(localize(b.name), 'fr'))
      .slice(0, MAX_RESULTS);
  }, [spells, query]);

  async function add(spell: Spell): Promise<void> {
    if (!activeClassId || isUpdating) return;
    const current = character.knownSpells[activeClassId] ?? [];
    if (current.includes(spell.id)) return;
    await updateCharacter({
      knownSpells: { ...character.knownSpells, [activeClassId]: [...current, spell.id] },
    });
    setQuery('');
    onClose();
  }

  if (spellcasterClassIds.length === 0) return null;

  return (
    <DetailModal open={open} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-[18px] font-black uppercase tracking-[0.12em] text-gold-bright">
          {t('sheet.magie.addSpell.title')}
        </h2>

        {classOptions.length > 1 ? (
          <Select
            value={activeClassId}
            onValueChange={setTargetClassId}
            options={classOptions}
            aria-label={t('sheet.magie.addSpell.classAria')}
          />
        ) : null}

        <label className="flex items-center gap-2 rounded-card-sm border border-white-8 bg-bg-2/60 px-3 py-2">
          <Icon name="i-search" className="h-4 w-4 text-text-tertiary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('sheet.magie.addSpell.searchPlaceholder')}
            aria-label={t('sheet.magie.addSpell.searchLabel')}
            className="w-full bg-transparent font-serif text-body text-text placeholder:italic placeholder:text-text-faint focus:outline-none"
          />
        </label>

        {results.length === 0 ? (
          <p className="font-serif text-body-sm italic text-text-tertiary">
            {t('sheet.magie.addSpell.hint')}
          </p>
        ) : (
          <ul className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto">
            {results.map((spell) => {
              const already = knownIds.has(spell.id);
              return (
                <li key={spell.id}>
                  <button
                    type="button"
                    disabled={already || isUpdating}
                    onClick={() => void add(spell)}
                    className="flex w-full items-center gap-3 rounded-card-sm border border-white-8 bg-white/[0.025] px-3 py-2 text-left transition-colors duration-200 ease-base hover:border-gold hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="shrink-0 rounded-pill border border-white-8 px-2 py-0.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                      {spell.level === 0
                        ? t('sheet.magie.addSpell.cantrip')
                        : t('sheet.magie.prep.levelLabel').replace('{n}', String(spell.level))}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-serif text-body text-text">
                      {localize(spell.name)}
                    </span>
                    {already ? (
                      <span className="shrink-0 font-title text-[9px] uppercase tracking-[0.16em] text-text-faint">
                        {t('sheet.magie.addSpell.already')}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('sheet.identity.cancel')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
