import { useMemo, useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface ConditionsRowProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Rangée d'états en cours du PJ. Chip = état actif (tap pour retirer).
 * Chip "+" ouvre un picker inline qui liste tous les états du SRD, filtrables.
 *
 * On stocke des slugs (`character.conditions: string[]`) — la résolution du
 * libellé localisé passe par `useContent('conditions')`. Tant que le bundle
 * n'est pas chargé, on affiche le slug capitalisé pour rester ASCII-safe.
 */
export function ConditionsRow({ character, readOnly }: ConditionsRowProps): JSX.Element {
  const { data: conditions } = useContent('conditions');
  const { updateCharacter } = useUpdateCharacter(character.id);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');

  const activeIds = character.conditions;

  const byId = useMemo(() => new Map(conditions.map((c) => [c.id, c])), [conditions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const candidates = conditions.filter((c) => !activeIds.includes(c.id));
    if (!q) return candidates;
    return candidates.filter(
      (c) => localize(c.name).toLowerCase().includes(q) || c.id.includes(q),
    );
  }, [conditions, activeIds, query]);

  async function toggle(id: string, present: boolean): Promise<void> {
    if (readOnly) return;
    const next = present ? activeIds.filter((c) => c !== id) : [...activeIds, id];
    await updateCharacter({ conditions: next });
    const cond = byId.get(id);
    showToast({
      kind: 'info',
      title: present ? 'État retiré' : 'État appliqué',
      sub: cond ? localize(cond.name) : id,
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3>États</h3>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        {activeIds.map((id) => {
          const cond = byId.get(id);
          const label = cond ? localize(cond.name) : capitalize(id);
          return (
            <button
              key={id}
              type="button"
              disabled={readOnly}
              onClick={() => void toggle(id, true)}
              aria-label={`Retirer l'état ${label}`}
              className="inline-flex items-center gap-1.5 rounded-pill border border-crimson/40 bg-crimson/10 px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.14em] text-crimson transition-colors hover:border-crimson hover:bg-crimson/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {label}
              <span aria-hidden="true">✕</span>
            </button>
          );
        })}
        {activeIds.length === 0 && (
          <span className="font-serif text-body-sm italic text-text-tertiary">
            Aucun état actif.
          </span>
        )}
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setPickerOpen((open) => !open)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
            pickerOpen
              ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
              : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft hover:text-gold-bright',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
          aria-expanded={pickerOpen}
        >
          + État
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-4 rounded-card-sm border border-white-8 bg-bg-2/60 p-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un état…"
            className="mb-3 w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body-sm text-text outline-none transition-colors placeholder:italic placeholder:text-text-faint focus:border-gold"
          />
          <div className="flex flex-wrap gap-2">
            {filtered.length === 0 ? (
              <p className="w-full text-center font-serif text-body-sm italic text-text-tertiary">
                Aucun état correspondant.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    void toggle(c.id, false);
                    setQuery('');
                  }}
                  className="rounded-pill border border-white-8 bg-white/[0.04] px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-gold-bright hover:text-gold-bright"
                >
                  {localize(c.name)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}
