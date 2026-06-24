import { useState, type JSX } from 'react';

import type { LinkedMember } from '@/features/campaigns/use-encounter-party-draft';
import { Button } from '@/shared/components/button';
import { GlassPanel } from '@/shared/components/glass-panel';
import type { I18nString } from '@/shared/lib/i18n';
import { t } from '@/shared/lib/i18n';

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
  // Optimistic : on affiche le résultat de la dernière compilation locale sans
  // attendre le refresh du doc parent (puis `onCompiled` re-synchronise).
  const [localMarkdown, setLocalMarkdown] = useState<string | null>(null);
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const markdown = localMarkdown ?? journalCompiled;

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
      onCompiled();
    } catch {
      setError(t('sessions.journal.compileError'));
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
          <Button variant="secondary" size="sm" onClick={handleCompile} disabled={pending}>
            {pending ? t('sessions.journal.compiling') : t('sessions.journal.recompile')}
          </Button>
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
