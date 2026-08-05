import { useId, useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { createNpc } from '@/shared/lib/services/npcs';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Campaign } from '@/shared/types/campaign';
import type { Npc } from '@/shared/types/npc';

/**
 * Duplique un PNJ vers une AUTRE campagne dont on est meneur (M42 de l'audit de
 * malléabilité).
 *
 * Les PNJ vivent sous `campaigns/{cid}/npcs` et le service n'offrait qu'un CRUD
 * DANS une campagne — contrairement aux PJ, explicitement portables (decision
 * log). Un Elminster maison se retapait donc à la main d'une table à l'autre.
 *
 * Deux choix assumés :
 *   - les RELATIONS ne suivent pas. Elles pointent des `characterId` de la
 *     campagne d'origine, qui ne désignent rien chez la destinataire ; les
 *     recopier fabriquerait des liens fantômes.
 *   - la VISIBILITÉ retombe sur « secret ». Un PNJ public chez soi peut être une
 *     révélation ailleurs ; mieux vaut que le meneur l'ouvre lui-même que de le
 *     divulguer par recopie.
 *
 * `isDMOf` couvre source et destination — aucune rule à déployer.
 */
interface Props {
  readonly open: boolean;
  readonly npc: Npc;
  /** Campagnes où l'utilisateur est meneur, source EXCLUE (filtrée par le caller). */
  readonly targets: readonly Campaign[];
  readonly createdByUid: string;
  readonly onClose: () => void;
}

export function NpcDuplicateModal({
  open,
  npc,
  targets,
  createdByUid,
  onClose,
}: Props): JSX.Element {
  const titleId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  const sorted = useMemo(
    () => [...targets].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [targets],
  );

  async function handleDuplicate(): Promise<void> {
    if (selected === null) return;
    setBusy(true);
    setFailed(false);
    try {
      await createNpc(selected, createdByUid, {
        name: npc.name,
        role: npc.role,
        location: npc.location,
        shortDescription: npc.shortDescription,
        publicDescription: npc.publicDescription,
        dmNotes: npc.dmNotes,
        portrait: npc.portrait,
        combatStats: npc.combatStats,
        relationships: [],
        tags: [...npc.tags],
        visibility: 'dm',
      });
      showToast({
        kind: 'info',
        title: t('npcs.duplicate.doneToast'),
        sub: npc.name,
      });
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={busy ? () => undefined : onClose}
      titleId={titleId}
      closeLabel={t('npcs.duplicate.cancel')}
      size="sm"
    >
      <div className="flex flex-col gap-5 p-6">
        <h2
          id={titleId}
          className="pr-10 font-display text-2xl font-bold uppercase tracking-[0.14em] text-gold-bright"
        >
          {t('npcs.duplicate.title')}
        </h2>
        <p className="font-serif text-body-sm text-text-secondary">
          {t('npcs.duplicate.intro')}
        </p>

        {sorted.length === 0 ? (
          <p
            data-testid="npc-duplicate-empty"
            className="font-serif text-body-sm italic text-text-tertiary"
          >
            {t('npcs.duplicate.noTarget')}
          </p>
        ) : (
          <ul
            role="radiogroup"
            aria-label={t('npcs.duplicate.title')}
            className="flex flex-col gap-2"
          >
            {sorted.map((campaign) => {
              const active = selected === campaign.id;
              return (
                <li key={campaign.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`npc-duplicate-target-${campaign.id}`}
                    onClick={() => setSelected(campaign.id)}
                    className={cn(
                      'w-full rounded-card-sm border px-4 py-3 text-left font-serif text-body transition-colors duration-200 ease-base',
                      active
                        ? 'border-gold-bright bg-gold-bright/10 text-gold-bright'
                        : 'border-white-8 text-text-secondary hover:border-soft hover:text-gold-bright',
                    )}
                  >
                    {campaign.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="font-serif text-meta italic text-text-tertiary">
          {t('npcs.duplicate.helper')}
        </p>

        {failed ? (
          <p role="alert" className="font-serif text-body-sm text-crimson">
            {t('npcs.duplicate.error')}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
            {t('npcs.duplicate.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={busy || selected === null}
            onClick={() => void handleDuplicate()}
          >
            {busy ? t('npcs.duplicate.busy') : t('npcs.duplicate.confirm')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
