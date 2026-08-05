import { useEffect, useId, useState, type JSX } from 'react';

import { JournalMarkdown } from '@/features/journal/journal-markdown';
import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { logHandoutSent } from '@/shared/lib/event-logger';
import { t } from '@/shared/lib/i18n';
import { createHandout, updateHandout } from '@/shared/lib/services/handouts';
import { showToast } from '@/shared/lib/slices/toast-slice';
import { HANDOUT_RECIPIENTS_ALL, type Handout } from '@/shared/types/handout';

/** Joueur sélectionnable comme destinataire (UID + libellé affiché). */
export interface HandoutPlayer {
  uid: string;
  label: string;
}

interface HandoutEditorModalProps {
  open: boolean;
  campaignId: string;
  createdByUid: string;
  /** Joueurs de la campagne (hors MJ) — destinataires possibles. */
  players: HandoutPlayer[];
  /**
   * Document à corriger (M12). `null` → mode création. Quand il est fourni, le
   * formulaire est prérempli et l'envoi devient une mise à jour.
   */
  editing?: Handout | null;
  onClose: () => void;
  /** Appelé après un envoi ou une correction réussie (rafraîchit la liste). */
  onSent: () => void;
}

type FormError = 'title' | 'content' | 'recipients' | 'send' | null;

/**
 * Création ET correction d'un document MJ (plan 27 steps 4-6 ; correction =
 * M12 de l'audit de malléabilité). V1 = texte/Markdown uniquement : le sélecteur
 * de type expose Image / Les deux en DÉSACTIVÉ avec une note (upload Firebase
 * Storage différé en sous-plan 27b). Aperçu Markdown live via `JournalMarkdown`.
 * Destinataires : toute la table ou sélection.
 *
 * Un SEUL formulaire pour les deux gestes : corriger un document, c'est remplir
 * le même formulaire avec les valeurs existantes. Deux composants jumeaux
 * auraient divergé dès la première évolution de l'aperçu Markdown.
 */
export function HandoutEditorModal({
  open,
  campaignId,
  createdByUid,
  players,
  editing = null,
  onClose,
  onSent,
}: HandoutEditorModalProps): JSX.Element {
  const titleId = useId();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [recipientsMode, setRecipientsMode] = useState<'all' | 'some'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<FormError>(null);

  const isEditing = editing !== null;

  // Préremplissage à l'ouverture en correction. Effet légitime (synchronisation
  // d'un état de formulaire sur une prop externe, pas un état dérivé) : le
  // formulaire doit rester librement éditable ensuite, donc on ne peut pas
  // simplement calculer les champs au rendu.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setContent(editing.content.text ?? '');
      const all = editing.recipients === HANDOUT_RECIPIENTS_ALL;
      setRecipientsMode(all ? 'all' : 'some');
      setSelected(all ? [] : [...editing.recipients]);
    } else {
      setTitle('');
      setContent('');
      setRecipientsMode('all');
      setSelected([]);
    }
    setError(null);
  }, [open, editing]);

  function reset(): void {
    setTitle('');
    setContent('');
    setRecipientsMode('all');
    setSelected([]);
    setError(null);
    setSending(false);
  }

  function handleClose(): void {
    if (sending) return;
    reset();
    onClose();
  }

  function togglePlayer(uid: string): void {
    setSelected((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );
  }

  async function handleSend(): Promise<void> {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      setError('title');
      return;
    }
    if (!trimmedContent) {
      setError('content');
      return;
    }
    const recipients =
      recipientsMode === 'all' ? HANDOUT_RECIPIENTS_ALL : [...selected];
    if (recipientsMode === 'some' && recipients.length === 0) {
      setError('recipients');
      return;
    }
    setError(null);
    setSending(true);
    try {
      if (editing) {
        // Correction : aucun `handout-sent` re-journalisé — le document n'est
        // pas renvoyé, il est corrigé. Un second event ferait croire à une
        // seconde diffusion dans le récit de séance.
        // Le nouveau destinataire, lui, est prévenu tout seul : le doc entre
        // dans sa query `recipients array-contains uid` → son listener le voit
        // en `added` et lève le toast (cf. `updateHandout`).
        await updateHandout(campaignId, editing.id, {
          title: trimmedTitle,
          text: trimmedContent,
          recipients,
        });
        showToast({
          kind: 'info',
          title: t('handouts.edit.savedToast'),
          sub: trimmedTitle,
        });
      } else {
        const id = await createHandout(campaignId, createdByUid, {
          title: trimmedTitle,
          type: 'text',
          content: { text: trimmedContent },
          recipients,
        });
        await logHandoutSent(id, recipients, trimmedTitle);
        showToast({ kind: 'info', title: t('handouts.create.sentToast'), sub: trimmedTitle });
      }
      reset();
      onSent();
      onClose();
    } catch {
      setError('send');
      setSending(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={handleClose}
      titleId={titleId}
      closeLabel={t('handouts.create.cancel')}
      size="lg"
    >
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <h2
          id={titleId}
          className="pr-10 font-display text-2xl font-bold uppercase tracking-[0.14em] text-gold-bright"
        >
          {isEditing ? t('handouts.edit.title') : t('handouts.create.title')}
        </h2>

        {/* Titre */}
        <label className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('handouts.create.fieldTitle')}
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('handouts.create.titlePlaceholder')}
            className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-serif text-body text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
          />
        </label>

        {/* Type — texte seul en V1 ; image/mixte désactivés (27b). */}
        <div className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('handouts.create.fieldType')}
          </span>
          <div className="flex gap-2" role="group" aria-label={t('handouts.create.fieldType')}>
            {(
              [
                { key: 'text', label: t('handouts.create.type.text'), enabled: true },
                { key: 'image', label: t('handouts.create.type.image'), enabled: false },
                { key: 'mixed', label: t('handouts.create.type.mixed'), enabled: false },
              ] as const
            ).map((opt) => (
              <span
                key={opt.key}
                aria-disabled={!opt.enabled}
                className={cn(
                  'rounded-pill border px-4 py-1.5 font-title text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 ease-base',
                  opt.enabled
                    ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
                    : 'cursor-not-allowed border-white-8 bg-white/[0.03] text-text-faint',
                )}
              >
                {opt.label}
              </span>
            ))}
          </div>
          <p className="font-serif text-meta italic text-text-tertiary">
            {t('handouts.create.imageDeferred')}
          </p>
        </div>

        {/* Contenu Markdown + aperçu */}
        <label className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('handouts.create.fieldContent')}
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('handouts.create.contentPlaceholder')}
            className="min-h-[160px] w-full resize-y rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-serif text-body-sm text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
          />
        </label>

        <div className="rounded-card-sm border border-white-8 bg-bg-2/40 p-4">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('handouts.create.previewLabel')}
          </span>
          <div className="mt-3">
            {content.trim() ? (
              <JournalMarkdown markdown={content} />
            ) : (
              <p className="font-serif text-body-sm italic text-text-faint">
                {t('handouts.create.previewEmpty')}
              </p>
            )}
          </div>
        </div>

        {/* Destinataires */}
        <div className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('handouts.create.fieldRecipients')}
          </span>
          <div className="flex gap-2" role="group" aria-label={t('handouts.create.fieldRecipients')}>
            {(
              [
                { key: 'all', label: t('handouts.create.recipientsAll') },
                { key: 'some', label: t('handouts.create.recipientsSome') },
              ] as const
            ).map((opt) => {
              const active = recipientsMode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRecipientsMode(opt.key)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-pill border px-4 py-1.5 font-title text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 ease-base',
                    active
                      ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
                      : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft hover:text-gold-bright',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {recipientsMode === 'some' ? (
            players.length === 0 ? (
              <p className="font-serif text-body-sm italic text-text-tertiary">
                {t('handouts.create.noPlayers')}
              </p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-2">
                {players.map((p) => {
                  const checked = selected.includes(p.uid);
                  return (
                    <li key={p.uid}>
                      <button
                        type="button"
                        onClick={() => togglePlayer(p.uid)}
                        aria-pressed={checked}
                        className={cn(
                          'rounded-pill border px-3 py-1.5 font-ui text-body-sm transition-colors duration-200 ease-base',
                          checked
                            ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
                            : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft',
                        )}
                      >
                        {checked ? '✓ ' : ''}
                        {p.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </div>

        {error !== null ? (
          <p role="alert" className="font-serif text-body-sm text-crimson">
            {error === 'title'
              ? t('handouts.create.error.title')
              : error === 'content'
                ? t('handouts.create.error.content')
                : error === 'recipients'
                  ? t('handouts.create.error.recipients')
                  : t('handouts.create.error.send')}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" onClick={handleClose} disabled={sending}>
            {t('handouts.create.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSend()}
            disabled={sending}
          >
            {isEditing
              ? sending
                ? t('handouts.edit.saving')
                : t('handouts.edit.save')
              : sending
                ? t('handouts.create.sending')
                : t('handouts.create.send')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
