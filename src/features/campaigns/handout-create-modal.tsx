import { useId, useState, type JSX } from 'react';

import { JournalMarkdown } from '@/features/journal/journal-markdown';
import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { logHandoutSent } from '@/shared/lib/event-logger';
import { t } from '@/shared/lib/i18n';
import { createHandout } from '@/shared/lib/services/handouts';
import { showToast } from '@/shared/lib/slices/toast-slice';
import { HANDOUT_RECIPIENTS_ALL } from '@/shared/types/handout';

/** Joueur sélectionnable comme destinataire (UID + libellé affiché). */
export interface HandoutPlayer {
  uid: string;
  label: string;
}

interface HandoutCreateModalProps {
  open: boolean;
  campaignId: string;
  createdByUid: string;
  /** Joueurs de la campagne (hors MJ) — destinataires possibles. */
  players: HandoutPlayer[];
  onClose: () => void;
  /** Appelé après un envoi réussi (rafraîchit la liste). */
  onSent: () => void;
}

type FormError = 'title' | 'content' | 'recipients' | 'send' | null;

/**
 * Création d'un document MJ (plan 27 steps 4-6). V1 = texte/Markdown
 * uniquement : le sélecteur de type expose Image / Les deux en DÉSACTIVÉ avec
 * une note (upload Firebase Storage différé en sous-plan 27b). Aperçu Markdown
 * live via `JournalMarkdown`. Destinataires : toute la table ou sélection.
 */
export function HandoutCreateModal({
  open,
  campaignId,
  createdByUid,
  players,
  onClose,
  onSent,
}: HandoutCreateModalProps): JSX.Element {
  const titleId = useId();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [recipientsMode, setRecipientsMode] = useState<'all' | 'some'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<FormError>(null);

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
      const id = await createHandout(campaignId, createdByUid, {
        title: trimmedTitle,
        type: 'text',
        content: { text: trimmedContent },
        recipients,
      });
      await logHandoutSent(id, recipients, trimmedTitle);
      showToast({ kind: 'info', title: t('handouts.create.sentToast'), sub: trimmedTitle });
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
          {t('handouts.create.title')}
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
            {sending ? t('handouts.create.sending') : t('handouts.create.send')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
