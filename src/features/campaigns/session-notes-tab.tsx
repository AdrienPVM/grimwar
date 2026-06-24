import { useEffect, useId, useRef, useState, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { updateSessionNotes } from '@/shared/lib/services/sessions';

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface Props {
  campaignId: string;
  sessionId: string;
  initialNotes: string;
  /** MJ ⇒ éditable. Membre ⇒ lecture seule. */
  canEdit: boolean;
}

// Délai de debounce de l'auto-save (step 5 : « auto-saves every 5s »). On
// interprète « toutes les 5 s » comme un debounce de 5 s après la dernière frappe
// plutôt qu'un intervalle fixe : moins d'écritures Firestore, et l'utilisateur
// qui tape en continu ne déclenche pas un write à chaque seconde.
const AUTOSAVE_DELAY_MS = 5000;

/**
 * Onglet « Notes » de l'écran séance (step 5 du plan 23).
 *
 * MJ : éditeur `<textarea>` avec auto-save debounced (5 s) → `updateSessionNotes`.
 * Un indicateur de statut (Modifié / Enregistrement… / Enregistré / Échec) donne
 * le feedback. Flush au démontage si des modifications sont en attente (on ne
 * perd jamais les dernières frappes en changeant d'onglet/écran).
 *
 * Membre (lecture seule) : rend les notes avec retours à la ligne préservés
 * (`whitespace-pre-wrap`).
 *
 * ⚠️ Portée : les notes sont STOCKÉES en Markdown (le champ `notes` du schéma),
 * mais le RENDU Markdown enrichi (gras, titres, listes) est différé — il
 * requiert une dépendance externe (react-markdown ou équivalent), décision qui
 * relève d'Adrien (règle d'autonomie « new external dependency »). En attendant,
 * l'éditeur est un textarea Markdown-as-text et la vue lecture préserve la mise
 * en forme brute (sauts de ligne). Aucune perte de données : le texte saisi est
 * exactement ce qui est persisté.
 */
export function SessionNotesTab({
  campaignId,
  sessionId,
  initialNotes,
  canEdit,
}: Props): JSX.Element {
  const editorId = useId();
  const [value, setValue] = useState<string>(initialNotes);
  const [status, setStatus] = useState<SaveStatus>('idle');

  // Dernière valeur saisie (flush au démontage) et dernière valeur persistée
  // (évite un write quand rien n'a changé). Refs ⇒ pas de stale closure.
  const latestRef = useRef<string>(initialNotes);
  const savedRef = useRef<string>(initialNotes);

  // Auto-save debounced : 5 s après la dernière frappe.
  useEffect(() => {
    if (!canEdit) return;
    if (value === savedRef.current) return;
    const timer = setTimeout(() => {
      setStatus('saving');
      updateSessionNotes(campaignId, sessionId, value)
        .then(() => {
          savedRef.current = value;
          setStatus('saved');
        })
        .catch(() => {
          setStatus('error');
        });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, canEdit, campaignId, sessionId]);

  // Flush au démontage si des modifications sont en attente (changement d'onglet
  // avant la fin du debounce). Fire-and-forget — l'écran n'est plus monté.
  useEffect(() => {
    return () => {
      if (latestRef.current !== savedRef.current) {
        void updateSessionNotes(campaignId, sessionId, latestRef.current);
      }
    };
  }, [campaignId, sessionId]);

  if (!canEdit) {
    return (
      <div className="font-serif text-body text-text">
        {value.trim().length === 0 ? (
          <p className="italic text-text-tertiary">{t('sessions.notes.empty')}</p>
        ) : (
          <p className="whitespace-pre-wrap">{value}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={editorId}
          className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary"
        >
          {t('sessions.notes.label')}
        </label>
        <SaveIndicator status={status} />
      </div>
      <textarea
        id={editorId}
        value={value}
        rows={16}
        placeholder={t('sessions.notes.placeholder')}
        aria-label={t('sessions.notes.editorAria')}
        onChange={(e) => {
          setValue(e.target.value);
          latestRef.current = e.target.value;
          setStatus('pending');
        }}
        className={cn(
          'w-full resize-y rounded-card-sm border border-white-8 bg-bg-3/40',
          'px-3 py-2 font-serif text-body leading-relaxed text-text',
          'placeholder:text-text-tertiary',
          'focus:border-gold-bright focus:outline-none focus:ring-1 focus:ring-gold-bright/40',
          'transition-colors duration-200 ease-base',
        )}
      />
      <p className="font-serif text-[13px] text-text-tertiary">
        {t('sessions.notes.hint')}
      </p>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }): JSX.Element | null {
  if (status === 'idle') return null;
  const label =
    status === 'pending'
      ? t('sessions.notes.status.pending')
      : status === 'saving'
        ? t('sessions.notes.status.saving')
        : status === 'saved'
          ? t('sessions.notes.status.saved')
          : t('sessions.notes.status.error');
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'font-title text-meta uppercase tracking-[0.18em]',
        status === 'error' ? 'text-crimson' : 'text-text-tertiary',
      )}
    >
      {label}
    </span>
  );
}
