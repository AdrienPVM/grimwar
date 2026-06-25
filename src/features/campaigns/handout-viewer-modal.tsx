import { useEffect, useId, useRef, type JSX } from 'react';

import { JournalMarkdown } from '@/features/journal/journal-markdown';
import { DetailModal } from '@/shared/components/detail-modal';
import { logHandoutRevealed } from '@/shared/lib/event-logger';
import { t } from '@/shared/lib/i18n';
import { revealHandout } from '@/shared/lib/services/handouts';
import { handoutTargetsUser, type Handout } from '@/shared/types/handout';

interface HandoutViewerModalProps {
  /** Handout ouvert, ou `null` (modale fermée). */
  handout: Handout | null;
  campaignId: string;
  /** UID du lecteur courant. */
  viewerUid: string | null;
  /** Le MJ ouvre en aperçu — il ne s'ajoute jamais à `revealedTo`. */
  isDM: boolean;
  onClose: () => void;
  /** Appelé après un self-reveal réussi (rafraîchit la liste appelante). */
  onRevealed?: () => void;
}

/**
 * Visionneuse de document (plan 27 step 9). Rend le titre, l'image (si présente
 * — chemin 27b) et le texte Markdown via `JournalMarkdown`.
 *
 * À l'ouverture par un JOUEUR destinataire non encore marqué « lu », s'ajoute
 * lui-même à `revealedTo` (self-reveal, best-effort) et journalise
 * `handout-revealed`. Le MJ ouvre en aperçu sans rien révéler. L'échec du
 * tracking n'empêche jamais la lecture.
 */
export function HandoutViewerModal({
  handout,
  campaignId,
  viewerUid,
  isDM,
  onClose,
  onRevealed,
}: HandoutViewerModalProps): JSX.Element {
  const titleId = useId();
  // Garde anti-double-écriture : on ne tente le self-reveal qu'une fois par id.
  const revealedAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!handout || isDM || !viewerUid) return;
    if (!handoutTargetsUser(handout, viewerUid)) return; // garde-fou (la rule garde déjà)
    if (handout.revealedTo.includes(viewerUid)) return;
    if (revealedAttemptRef.current === handout.id) return;
    revealedAttemptRef.current = handout.id;
    void revealHandout(campaignId, handout.id, viewerUid, handout.revealedTo)
      .then(() => {
        void logHandoutRevealed(handout.id, viewerUid);
        onRevealed?.();
      })
      .catch(() => {
        // Best-effort : l'échec du tracking ne bloque pas la lecture ; on
        // autorise une nouvelle tentative à la prochaine ouverture.
        revealedAttemptRef.current = null;
      });
  }, [handout, isDM, viewerUid, campaignId, onRevealed]);

  return (
    <DetailModal
      open={handout !== null}
      onClose={onClose}
      titleId={titleId}
      closeLabel={t('handouts.detail.close')}
      size="lg"
    >
      {handout !== null ? (
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <h2
            id={titleId}
            className="pr-10 font-display text-2xl font-bold uppercase tracking-[0.14em] text-gold-bright"
          >
            {handout.title}
          </h2>
          {handout.content.imageUrl ? (
            <img
              src={handout.content.imageUrl}
              alt={handout.title}
              className="w-full rounded-card border border-soft"
            />
          ) : null}
          {handout.content.text ? <JournalMarkdown markdown={handout.content.text} /> : null}
        </div>
      ) : null}
    </DetailModal>
  );
}
