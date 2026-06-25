import { useId, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { logNpcAttitudeChanged } from '@/shared/lib/event-logger';
import { t } from '@/shared/lib/i18n';
import { setNpcAttitude } from '@/shared/lib/services/npcs';
import { showToast } from '@/shared/lib/slices/toast-slice';
import { NPC_ATTITUDE_LABEL_KEY } from '@/shared/types/npc-labels';
import { NPC_ATTITUDES, type Npc, type NpcAttitude } from '@/shared/types/npc';

/** PJ de la table sélectionnable pour une relation (characterId + libellé). */
export interface NpcRelationPlayer {
  characterId: string;
  label: string;
}

interface NpcRelationModalProps {
  open: boolean;
  campaignId: string;
  npc: Npc;
  players: NpcRelationPlayer[];
  onClose: () => void;
  /** Appelé après chaque changement d'attitude réussi (refresh du détail). */
  onChanged: () => void;
}

/**
 * Édition MJ des relations d'un PNJ (plan 28 step 12). Liste chaque PJ de la
 * table avec une rangée de pills d'attitude ; un clic pose l'attitude (upsert
 * `setNpcAttitude`) et journalise `npc-attitude-changed` (visibilité MIRROR du
 * PNJ — un PNJ secret ne fuite pas via le journal). Poser une attitude sur un PJ
 * sans relation préalable l'AJOUTE (c'est le « add new relationship » du plan).
 */
export function NpcRelationModal({
  open,
  campaignId,
  npc,
  players,
  onClose,
  onChanged,
}: NpcRelationModalProps): JSX.Element {
  const titleId = useId();
  // État local des relations pour un retour visuel immédiat (le parent refresh
  // ensuite la source de vérité). Reseed à l'ouverture via la key du DetailModal.
  const [relationships, setRelationships] = useState(npc.relationships);
  const [busyCharacterId, setBusyCharacterId] = useState<string | null>(null);

  function attitudeOf(characterId: string): NpcAttitude {
    return (
      relationships.find((r) => r.characterId === characterId)?.attitude ?? 'unknown'
    );
  }

  async function pick(characterId: string, attitude: NpcAttitude): Promise<void> {
    const before = attitudeOf(characterId);
    if (before === attitude) return;
    setBusyCharacterId(characterId);
    try {
      const next = await setNpcAttitude(
        campaignId,
        npc.id,
        characterId,
        attitude,
        relationships,
      );
      setRelationships(next);
      await logNpcAttitudeChanged(npc.id, characterId, before, attitude, npc.visibility);
      onChanged();
    } catch {
      showToast({ kind: 'grim', title: t('npcs.relations.error') });
    } finally {
      setBusyCharacterId(null);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      titleId={titleId}
      closeLabel={t('npcs.relations.close')}
      size="md"
    >
      <div className="flex flex-col gap-5 p-6">
        <h2
          id={titleId}
          className="pr-10 font-display text-xl font-bold uppercase tracking-[0.14em] text-gold-bright"
        >
          {t('npcs.relations.title')}
        </h2>

        {players.length === 0 ? (
          <p className="font-serif text-body-sm italic text-text-tertiary">
            {t('npcs.relations.noCharacters')}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {players.map((p) => (
              <li key={p.characterId} className="flex flex-col gap-2">
                <span className="font-serif text-body text-text">{p.label}</span>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={p.label}
                >
                  {NPC_ATTITUDES.map((attitude) => {
                    const active = attitudeOf(p.characterId) === attitude;
                    return (
                      <button
                        key={attitude}
                        type="button"
                        onClick={() => void pick(p.characterId, attitude)}
                        aria-pressed={active}
                        disabled={busyCharacterId === p.characterId}
                        className={cn(
                          'rounded-pill border px-3 py-1 font-ui text-body-sm transition-colors duration-200 ease-base disabled:opacity-50',
                          active
                            ? ATTITUDE_ACTIVE_CLASS[attitude]
                            : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft',
                        )}
                      >
                        {t(NPC_ATTITUDE_LABEL_KEY[attitude])}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>
            {t('npcs.relations.done')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}

/** Style « actif » d'une pill d'attitude — couleur sémantique de l'attitude. */
const ATTITUDE_ACTIVE_CLASS: Record<NpcAttitude, string> = {
  friendly: 'border-teal/50 bg-teal/[0.15] text-teal',
  neutral: 'border-gold-bright bg-gold-bright/15 text-gold-bright',
  hostile: 'border-crimson/50 bg-crimson/[0.15] text-crimson',
  unknown: 'border-soft bg-white/[0.06] text-text-secondary',
};
