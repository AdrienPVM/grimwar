import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';

const STORAGE_KEY_PREFIX = 'grimwar.dm.notes.v1.';

interface QuickNotesProps {
  /**
   * Suffixe de portée (ex. `campaignId`) pour cloisonner les notes par
   * campagne. Absent → scratchpad global du MJ (comportement S1 d'origine).
   * Permet d'avoir un bloc-notes distinct par table sans collision.
   */
  scopeKey?: string;
}

/**
 * Scratchpad MJ — texte libre persisté en localStorage (clé par user uid,
 * éventuellement par portée `scopeKey`).
 *
 * Pas encore de modèle Firestore pour ces notes volatiles : on stocke local
 * pour permettre au MJ de noter ses intrigues entre 2 sessions sans qu'elles
 * ne voyagent. Les notes de séance structurées vivent ailleurs (plan 23,
 * `session.notes` Firestore) ; ce scratchpad reste le brouillon volatil du MJ.
 *
 * Anti-collision : préfixe + uid (+ scopeKey) → un même device qui change de
 * compte ou de campagne ne mélange pas les scratchpads.
 */
export function QuickNotes({ scopeKey }: QuickNotesProps = {}): JSX.Element {
  const { user } = useAuth();
  const key = user
    ? `${STORAGE_KEY_PREFIX}${user.uid}${scopeKey ? `.${scopeKey}` : ''}`
    : null;
  const [value, setValue] = useState<string>('');

  // Hydrate depuis localStorage au montage / au changement de user.
  useEffect(() => {
    if (!key) {
      setValue('');
      return;
    }
    try {
      const stored = window.localStorage.getItem(key);
      setValue(stored ?? '');
    } catch {
      // Mode privé Safari / quota plein → on tombe en mode in-memory.
      setValue('');
    }
  }, [key]);

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    const next = event.target.value;
    setValue(next);
    if (!key) return;
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Quota plein — on garde la valeur en mémoire, l'utilisateur a un
      // signal visuel implicite (le texte s'affiche) sans interruption.
    }
  }

  return (
    <GlassPanel className="flex flex-col gap-3 p-5">
      <header className="flex items-center justify-between">
        <h2 className="font-title text-[11px] font-bold uppercase tracking-[0.22em] text-gold-bright">
          {t('dm.notes.title')}
        </h2>
        {value.length > 0 && (
          <span
            className="font-title text-meta text-text-tertiary"
            aria-label={t('dm.notes.charsAria')}
          >
            {value.length}
          </span>
        )}
      </header>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={t('dm.notes.placeholder')}
        aria-label={t('dm.notes.title')}
        className="min-h-[180px] w-full resize-y rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-serif text-body-sm text-text outline-none transition-colors placeholder:italic placeholder:text-text-faint focus:border-gold"
      />
      <p className="font-serif text-meta italic text-text-tertiary">
        {t('dm.notes.localOnly')}
      </p>
    </GlassPanel>
  );
}
