import { useState, type JSX } from 'react';

import { Checkbox } from '@/shared/components/form/checkbox';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { setSessionAttendance } from '@/shared/lib/services/sessions';

import type { RosterEntry } from './roster';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  campaignId: string;
  sessionId: string;
  /** Roster complet de la campagne (MJ + joueurs), déjà dédupliqué. */
  roster: RosterEntry[];
  initialAttendance: string[];
  /** MJ ⇒ cases cochables. Membre ⇒ lecture seule. */
  canEdit: boolean;
}

/**
 * Onglet « Présence » de l'écran séance (step 6 du plan 23).
 *
 * MJ : une case par membre du roster ; cocher/décocher pousse la liste COMPLÈTE
 * des UIDs présents via `setSessionAttendance` (le service remplace le tableau,
 * cf. 23.1). Écriture immédiate à chaque toggle (pas de debounce — les toggles
 * sont peu fréquents et l'utilisateur attend un feedback direct).
 *
 * Membre (lecture seule) : cases désactivées reflétant l'état enregistré.
 *
 * V1 : on affiche l'UID tronqué (pas de displayName partagé — même contrainte
 * que le roster du détail campagne, cf. `campaign-detail-screen`).
 */
export function SessionAttendanceTab({
  campaignId,
  sessionId,
  roster,
  initialAttendance,
  canEdit,
}: Props): JSX.Element {
  const [present, setPresent] = useState<Set<string>>(() => new Set(initialAttendance));
  const [status, setStatus] = useState<SaveStatus>('idle');

  function toggle(uid: string): void {
    const next = new Set(present);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setPresent(next);
    setStatus('saving');
    setSessionAttendance(campaignId, sessionId, [...next])
      .then(() => setStatus('saved'))
      .catch(() => {
        // Rollback optimiste : on restaure l'état d'avant le toggle pour ne pas
        // afficher une présence qui n'a pas été persistée.
        setPresent(new Set(present));
        setStatus('error');
      });
  }

  if (roster.length === 0) {
    return <p className="font-serif text-body italic text-text-tertiary">{t('sessions.attendance.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('sessions.attendance.title')}
        </h2>
        <AttendanceStatus status={status} />
      </div>
      <ul className="flex flex-col divide-y divide-white-8">
        {roster.map((entry) => (
          <li key={entry.uid}>
            <Checkbox
              label={
                <span className="font-mono tracking-[0.16em]">
                  {entry.label}
                  {entry.isSelf ? (
                    <span className="ml-2 font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
                      {t('campaigns.detail.roster.youSuffix')}
                    </span>
                  ) : null}
                </span>
              }
              checked={present.has(entry.uid)}
              disabled={!canEdit}
              onChange={() => toggle(entry.uid)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttendanceStatus({ status }: { status: SaveStatus }): JSX.Element | null {
  if (status === 'idle') return null;
  const label =
    status === 'saving'
      ? t('sessions.attendance.status.saving')
      : status === 'saved'
        ? t('sessions.attendance.status.saved')
        : t('sessions.attendance.status.error');
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
