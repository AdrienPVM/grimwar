import { useId, useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { formatCr } from '@/shared/lib/rules/challenge-rating';
import type { Monster } from '@/shared/types/content';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Appelé quand le MJ choisit un monstre — le parent crée le jeton. */
  onPick: (monster: Monster) => void;
}

/**
 * Sélecteur de monstre pour l'autofill carte (directive 2026-06-27).
 *
 * Ouvert depuis la barre Tokens de la vue live, il liste le bestiaire
 * (`useContent('monsters')` → SRD + packs custom de l'utilisateur), filtre par
 * nom, et au tap d'une ligne appelle `onPick(monster)` : un seul geste, pas de
 * second écran de confirmation (UX « le plus rapide possible »).
 *
 * Le bundle SRD `monsters.json` est vide aujourd'hui → l'état vide oriente
 * explicitement vers l'import de pack d'extension (Mon compte › Contenu). Dès
 * qu'un monstre custom est importé, il apparaît ici sans changement de code.
 */
export function MonsterPickerModal({ open, onClose, onPick }: Props): JSX.Element {
  const { data: monsters, loading } = useContent('monsters');
  const [query, setQuery] = useState<string>('');
  const titleId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    return monsters
      .filter((m) => !q || localize(m.name).toLocaleLowerCase('fr').includes(q))
      .sort(
        (a, b) =>
          a.cr - b.cr || localize(a.name).localeCompare(localize(b.name), 'fr'),
      );
  }, [monsters, query]);

  return (
    <DetailModal open={open} onClose={onClose} titleId={titleId} size="md">
      <div className="flex flex-col gap-3 p-5 pt-12">
        <h2
          id={titleId}
          className="font-title text-[12px] uppercase tracking-[0.18em] text-gold-bright"
        >
          Ajouter depuis le bestiaire
        </h2>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un monstre…"
          aria-label="Rechercher un monstre"
          className="w-full rounded-pill border border-gold-dim/40 bg-glass-2 px-4 py-2 font-serif text-body text-text placeholder:text-text-tertiary focus:border-gold-bright focus:outline-none transition-colors duration-200 ease-base"
        />

        {loading ? (
          <p className="py-6 text-center font-serif text-[13px] text-text-tertiary">
            Chargement du bestiaire…
          </p>
        ) : monsters.length === 0 ? (
          <div className="rounded-card border border-gold-dim/20 bg-glass-2 p-4">
            <p className="font-serif text-[13px] text-text">
              Votre bestiaire est vide.
            </p>
            <p className="mt-1 font-serif text-[12px] text-text-tertiary">
              Importez un pack d'extension (monstres) depuis Mon compte ›
              Contenu, puis revenez ici : vos créatures seront posables d'un tap.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center font-serif text-[13px] text-text-tertiary">
            Aucun monstre ne correspond à « {query.trim()} ».
          </p>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  data-testid={`monster-pick-${m.id}`}
                  onClick={() => onPick(m)}
                  className="flex w-full items-center justify-between gap-3 rounded-card border border-transparent px-3 py-2 text-left transition-colors duration-200 ease-base hover:border-gold-dim/40 hover:bg-gold/[0.06]"
                >
                  <span className="font-serif text-body text-text">
                    {localize(m.name)}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                    <span>{t(`size.${m.size}` as 'size.medium')}</span>
                    <span className="text-gold">FP {formatCr(m.cr)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailModal>
  );
}
