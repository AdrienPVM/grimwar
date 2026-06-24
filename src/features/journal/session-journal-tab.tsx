import { useId, useState, type JSX } from 'react';

import type { LinkedMember } from '@/features/campaigns/use-encounter-party-draft';
import { Button } from '@/shared/components/button';
import { GlassPanel } from '@/shared/components/glass-panel';
import type { I18nString } from '@/shared/lib/i18n';
import { t } from '@/shared/lib/i18n';
import { updateSessionJournal } from '@/shared/lib/services/sessions';

import { compileSessionJournal } from './compile-session-journal';
import { JournalMarkdown } from './journal-markdown';

interface NamedContent {
  id: string;
  name: I18nString;
}

interface SessionJournalTabProps {
  campaignId: string;
  sessionId: string;
  /** Snapshot persisté (`journalCompiled`), `null` tant que jamais compilé. */
  journalCompiled: string | null;
  /** MJ : peut (re)compiler. Les joueurs lisent seulement. */
  canEdit: boolean;
  /** Roster lié (characterId → userId) pour résoudre les noms (cross-owner). */
  linkedMembers: readonly LinkedMember[];
  /** Contenu chargé par l'écran (libellés de la narration). */
  spells: readonly NamedContent[];
  items: readonly NamedContent[];
  conditions: readonly NamedContent[];
  /** Rafraîchit le doc séance parent après une compilation réussie. */
  onCompiled: () => void;
}

/**
 * Onglet « Journal » de l'écran de séance (plan 25.2). Rend le journal compilé
 * (`journalCompiled`) en Markdown. Le MJ peut le (re)compiler à partir des
 * événements ; les joueurs le lisent seulement. La compilation se fait aussi
 * automatiquement à la clôture de séance (cf. `SessionScreen.handleEnd`).
 *
 * Le contenu (sorts / objets / états) est chargé ici pour résoudre les libellés
 * dans la narration ; les noms de personnages sont résolus en cross-owner par
 * `compileSessionJournal`.
 */
export function SessionJournalTab({
  campaignId,
  sessionId,
  journalCompiled,
  canEdit,
  linkedMembers,
  spells,
  items,
  conditions,
  onCompiled,
}: SessionJournalTabProps): JSX.Element {
  // Optimistic : on affiche le résultat de la dernière compilation/édition locale
  // sans attendre le refresh du doc parent (puis `onCompiled` re-synchronise).
  const [localMarkdown, setLocalMarkdown] = useState<string | null>(null);
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Édition manuelle (plan 25.3, step 6) : `draft` non-null = mode édition.
  const [draft, setDraft] = useState<string | null>(null);
  // Confirmation de re-compilation (step 7) : écrase l'édition manuelle.
  const [confirmingRecompile, setConfirmingRecompile] = useState<boolean>(false);
  const editorId = useId();

  const markdown = localMarkdown ?? journalCompiled;
  const isEditing = draft !== null;

  async function handleCompile(): Promise<void> {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await compileSessionJournal({
        campaignId,
        sessionId,
        linkedMembers,
        spells,
        items,
        conditions,
      });
      setLocalMarkdown(result);
      setConfirmingRecompile(false);
      onCompiled();
    } catch {
      setError(t('sessions.journal.compileError'));
    } finally {
      setPending(false);
    }
  }

  // Enregistre l'édition manuelle (step 6). L'édition devient le snapshot
  // « final » ; les events restent la source de vérité (re-compilable).
  async function handleSaveEdit(): Promise<void> {
    if (pending || draft === null) return;
    setPending(true);
    setError(null);
    try {
      await updateSessionJournal(campaignId, sessionId, draft);
      setLocalMarkdown(draft);
      setDraft(null);
      onCompiled();
    } catch {
      setError(t('sessions.journal.saveError'));
    } finally {
      setPending(false);
    }
  }

  if (markdown === null) {
    return (
      <GlassPanel className="px-6 py-10 text-center">
        <h2 className="font-title text-body uppercase tracking-[0.18em] text-text-secondary">
          {t('sessions.journal.emptyTitle')}
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] font-serif text-body-sm italic text-text-tertiary">
          {canEdit ? t('sessions.journal.emptyBodyDm') : t('sessions.journal.emptyBody')}
        </p>
        {canEdit ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button variant="primary" size="md" onClick={handleCompile} disabled={pending}>
              {pending ? t('sessions.journal.compiling') : t('sessions.journal.compile')}
            </Button>
            {error ? (
              <p role="alert" className="font-serif text-body-sm text-crimson">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </GlassPanel>
    );
  }

  // ── Mode édition manuelle (MJ) ─────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="flex flex-col gap-4">
        <label
          htmlFor={editorId}
          className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary"
        >
          {t('sessions.journal.editLabel')}
        </label>
        <textarea
          id={editorId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={16}
          className="w-full resize-y rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3 font-serif text-body text-text outline-none transition-colors duration-150 ease-base focus:border-gold"
        />
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(null);
              setError(null);
            }}
            disabled={pending}
          >
            {t('sessions.journal.cancel')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={pending}>
            {pending ? t('sessions.journal.saving') : t('sessions.journal.save')}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-right font-serif text-body-sm text-crimson">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  // ── Lecture (+ contrôles MJ) ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="px-5 py-6 sm:px-6">
        <JournalMarkdown markdown={markdown} />
      </GlassPanel>

      <p className="text-center font-serif text-meta italic text-text-tertiary">
        {t('sessions.journal.compiledHint')}
      </p>

      {canEdit ? (
        <div className="flex flex-col items-center gap-3">
          {confirmingRecompile ? (
            <GlassPanel className="w-full max-w-[460px] px-5 py-4 text-center">
              <p className="font-title text-meta uppercase tracking-[0.16em] text-crimson">
                {t('sessions.journal.recompileConfirmTitle')}
              </p>
              <p className="mx-auto mt-2 max-w-[40ch] font-serif text-body-sm text-text-secondary">
                {t('sessions.journal.recompileConfirmBody')}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingRecompile(false)}
                  disabled={pending}
                >
                  {t('sessions.journal.cancel')}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCompile} disabled={pending}>
                  {pending
                    ? t('sessions.journal.compiling')
                    : t('sessions.journal.recompileConfirm')}
                </Button>
              </div>
            </GlassPanel>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setDraft(markdown)}>
                {t('sessions.journal.edit')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingRecompile(true)}
              >
                {t('sessions.journal.recompile')}
              </Button>
            </div>
          )}
          {error ? (
            <p role="alert" className="font-serif text-body-sm text-crimson">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
