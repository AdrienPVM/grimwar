import { useState, type JSX } from 'react';

import { Select } from '@/shared/components/form';
import { t } from '@/shared/lib/i18n';

interface ExtraEntriesEditorProps {
  /** Intitulé du groupe (« Armures », « Langues »…). */
  label: string;
  /** Entrées BRUTES persistées, telles qu'écrites — pas les libellés résolus. */
  entries: readonly string[];
  /** Choix proposés en premier (registre SRD). Vide ⇒ saisie libre seule. */
  suggestions?: readonly { value: string; label: string }[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
}

/**
 * Éditeur d'un groupe de maîtrises ajoutées à la main (`extraProficiencies`).
 *
 * Il liste les valeurs BRUTES persistées, pas les libellés résolus affichés par
 * la carte : sans ça, retirer « Armures légères » demanderait de retrouver
 * laquelle des chaînes stockées a produit ce libellé — une correspondance que
 * la normalisation rend non injective (« Light » et « Light armor » donnent le
 * même libellé). On édite ce qu'on a écrit.
 *
 * Les maîtrises DÉRIVÉES (classe, historique, ascendance) n'apparaissent pas :
 * elles se recalculent depuis le contenu à chaque rendu, les retirer n'aurait
 * nulle part où être écrit.
 */
export function ExtraEntriesEditor({
  label,
  entries,
  suggestions = [],
  onAdd,
  onRemove,
  placeholder,
}: ExtraEntriesEditorProps): JSX.Element {
  const [draft, setDraft] = useState<string>('');
  const available = suggestions.filter((s) => !entries.includes(s.value));

  function commit(value: string): void {
    const clean = value.trim();
    if (clean.length === 0 || entries.includes(clean)) return;
    onAdd(clean);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-title text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </p>

      {entries.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <li key={entry}>
              <button
                type="button"
                onClick={() => onRemove(entry)}
                aria-label={t('sheet.essence.prof.removeAria').replace('{entry}', entry)}
                className="flex items-center gap-1.5 rounded-pill border border-gold/40 bg-gold-bright/[0.06] px-3 py-1.5 text-[12px] text-text-secondary transition-colors duration-200 ease-base hover:border-crimson hover:text-crimson"
              >
                {entry}
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {available.length > 0 ? (
        <Select
          value=""
          onValueChange={commit}
          options={available as { value: string; label: string }[]}
          placeholder={t('sheet.essence.prof.pick')}
          aria-label={t('sheet.essence.prof.pickAria').replace('{group}', label)}
        />
      ) : null}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          maxLength={60}
          placeholder={placeholder}
          aria-label={t('sheet.essence.prof.freeAria').replace('{group}', label)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            commit(draft);
          }}
          className="min-w-0 flex-1 rounded-card-sm border border-white-8 bg-ink/40 px-3 py-1.5 font-serif text-body-sm text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
        />
        <button
          type="button"
          onClick={() => commit(draft)}
          disabled={draft.trim().length === 0}
          className="shrink-0 rounded-pill border border-white-8 bg-white/[0.04] px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary transition-colors duration-200 ease-base hover:border-gold hover:text-gold-bright disabled:opacity-40"
        >
          {t('sheet.essence.prof.add')}
        </button>
      </div>
    </div>
  );
}
