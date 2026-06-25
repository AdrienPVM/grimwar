import { useEffect, useRef } from 'react';

import { t } from '@/shared/lib/i18n';

import type { PersonalityEdit } from './use-personality-edit';

interface PersonalityEditorProps {
  edit: PersonalityEdit;
  placeholder: string;
  ariaLabel: string;
  rows?: number;
}

/**
 * Zone de saisie partagée (mode Âme) : textarea + Enregistrer / Annuler.
 * Pilotée par l'objet `usePersonalityEdit`. Focus auto à l'ouverture (ressenti
 * « tap = j'écris »). Transitions douces via les tokens du design system.
 */
export function PersonalityEditor({
  edit,
  placeholder,
  ariaLabel,
  rows = 3,
}: PersonalityEditorProps): JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <textarea
        ref={textareaRef}
        value={edit.draft}
        onChange={(e) => edit.setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={rows}
        className="w-full resize-y rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2 font-serif text-body-sm text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={edit.cancel}
          disabled={edit.isUpdating}
          className="rounded-pill px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary transition-colors duration-200 ease-base hover:text-text-secondary disabled:opacity-50"
        >
          {t('sheet.ame.personality.cancel')}
        </button>
        <button
          type="button"
          onClick={() => void edit.save()}
          disabled={edit.isUpdating}
          className="rounded-pill border border-gold bg-gradient-to-b from-gold-bright to-gold px-4 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-ink shadow-[0_4px_14px_rgba(220,184,108,0.35)] transition-all duration-200 ease-base hover:brightness-110 disabled:opacity-50"
        >
          {t('sheet.ame.personality.save')}
        </button>
      </div>
    </div>
  );
}
