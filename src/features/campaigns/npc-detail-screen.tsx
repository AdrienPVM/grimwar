import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { JournalMarkdown } from '@/features/journal/journal-markdown';
import { Button } from '@/shared/components/button';
import { Card } from '@/shared/components/card';
import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { PageContainer } from '@/shared/components/page-container';
import { Splash } from '@/shared/components/splash';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { deleteNpc } from '@/shared/lib/services/npcs';
import { showToast } from '@/shared/lib/slices/toast-slice';
import {
  NPC_ATTITUDE_LABEL_KEY,
  NPC_ROLE_LABEL_KEY,
} from '@/shared/types/npc-labels';
import type { NpcAttitude } from '@/shared/types/npc';

import { formatUid } from './roster';
import { NpcDuplicateModal } from './npc-duplicate-modal';
import { NpcEditModal } from './npc-edit-modal';
import { NpcPortraitFor } from './npc-portrait';
import { NpcRelationModal, type NpcRelationPlayer } from './npc-relation-modal';
import { useCampaign } from './use-campaign';
import { useMyCampaigns } from './use-my-campaigns';
import { useLinkedCharacterNames } from './use-linked-character-names';
import { useNpc } from './use-npcs';

/**
 * Route `/campaigns/:cid/npcs/:npcId` — détail d'un PNJ (plan 28 step 6).
 * Sections publiques (visibles de tout lecteur autorisé) + sections RÉSERVÉES MJ
 * (`dmNotes`, `combatStats`) masquées CLIENT quand le lecteur n'est pas MJ. Le
 * MJ dispose des actions Modifier / Supprimer / Relations.
 */
export function NpcDetailScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid, npcId } = useParams<{ cid: string; npcId: string }>();
  const { user } = useAuth();
  const { campaign, members, isLoading: campaignLoading } = useCampaign(cid);
  const { npc, isLoading, notFound, refresh } = useNpc(cid, npcId);
  const characterNames = useLinkedCharacterNames(members);
  // Bestiaire chargé pour résoudre le NOM du monstre lié (SRD + packs custom).
  const { data: monsters } = useContent('monsters');
  const monsterLabel = useMemo<string | null>(() => {
    const id = npc?.combatStats?.monsterContentId;
    if (!id) return null;
    const found = monsters.find((m) => m.id === id);
    return found ? localize(found.name) : null;
  }, [monsters, npc]);

  const isDM = useMemo<boolean>(
    () => !!campaign && !!user && campaign.gmIds.includes(user.uid),
    [campaign, user],
  );

  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [relationOpen, setRelationOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [duplicateOpen, setDuplicateOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Campagnes où l'on est meneur, la courante exclue — cibles de duplication.
  // Chargées seulement pour un MJ : un joueur n'a pas ce geste.
  const { campaigns } = useMyCampaigns(isDM);
  const duplicateTargets = useMemo(
    () =>
      campaigns.filter(
        (c) => c.id !== cid && !!user && c.gmIds.includes(user.uid),
      ),
    [campaigns, cid, user],
  );

  const players = useMemo<NpcRelationPlayer[]>(
    () =>
      members
        .filter((m) => !!m.characterId)
        .map((m) => ({
          characterId: m.characterId as string,
          label: characterNames[m.characterId as string] ?? formatUid(m.userId),
        })),
    [members, characterNames],
  );

  if (campaignLoading || isLoading) return <Splash />;

  if (notFound || !npc) {
    return (
      <PageContainer width="content">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(cid ? `/campaigns/${cid}/npcs` : '/campaigns')}
        >
          ← {t('npcs.detail.back')}
        </Button>
        <p className="mt-10 text-center font-serif text-body italic text-text-tertiary">
          {t('npcs.detail.notFound')}
        </p>
      </PageContainer>
    );
  }

  async function onConfirmDelete(): Promise<void> {
    if (!cid || !npc) return;
    setDeleting(true);
    try {
      await deleteNpc(cid, npc.id);
      showToast({ kind: 'info', title: t('npcs.detail.deletedToast'), sub: npc.name });
      navigate(`/campaigns/${cid}/npcs`);
    } catch {
      setDeleting(false);
      showToast({ kind: 'grim', title: t('npcs.detail.deleteError') });
    }
  }

  /** Chip d'attitude avec couleur sémantique. */
  function attitudeChip(attitude: NpcAttitude): JSX.Element {
    const variant =
      attitude === 'friendly' ? 'heal' : attitude === 'hostile' ? 'damage' : 'default';
    return <Chip variant={variant}>{t(NPC_ATTITUDE_LABEL_KEY[attitude])}</Chip>;
  }

  return (
    <>
      <PageContainer width="content">
        {/* `flex-wrap` sur les deux niveaux : une 3ᵉ action sur une rangée
            dense comprime le voisin jusqu'à zéro pixel en 375 px de large. */}
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/campaigns/${cid}/npcs`)}
            aria-label={t('npcs.detail.back')}
          >
            ← {t('npcs.detail.back')}
          </Button>
          {isDM ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditOpen(true)}
                tooltip={t('campaigns.tip.editNpc')}
              >
                {t('npcs.detail.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDuplicateOpen(true)}
                tooltip={t('campaigns.tip.duplicateNpc')}
              >
                {t('npcs.detail.duplicate')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                tooltip={t('campaigns.tip.deleteNpc')}
              >
                {t('npcs.detail.delete')}
              </Button>
            </div>
          ) : null}
        </nav>

        <header className="mt-4 flex flex-col items-center text-center">
          <NpcPortraitFor npc={npc} size="lg" />
          <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-[0.14em] text-gold-bright">
            {npc.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Chip variant="gold">{t(NPC_ROLE_LABEL_KEY[npc.role])}</Chip>
            {npc.location.trim() ? (
              <span className="font-serif text-body-sm italic text-text-secondary">
                {npc.location}
              </span>
            ) : null}
            {isDM && npc.visibility === 'dm' ? (
              <Chip variant="damage">{t('npcs.detail.secretBadge')}</Chip>
            ) : null}
          </div>
          {npc.shortDescription.trim() ? (
            <p className="mx-auto mt-3 max-w-[60ch] font-serif text-body italic text-text-secondary">
              {npc.shortDescription}
            </p>
          ) : null}
          {npc.tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {npc.tags.map((tag) => (
                <li key={tag}>
                  <Chip variant="default">{tag}</Chip>
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <Divider className="my-6" />

        {/* Description publique — visible de tout lecteur autorisé. */}
        {npc.publicDescription.trim() ? (
          <section aria-label={t('npcs.detail.publicHeading')} className="mb-6">
            <h2 className="mb-3 font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('npcs.detail.publicHeading')}
            </h2>
            <JournalMarkdown markdown={npc.publicDescription} />
          </section>
        ) : null}

        {/* Relations — visibles de tous ; édition MJ only. */}
        <section aria-label={t('npcs.detail.relationsHeading')} className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('npcs.detail.relationsHeading')}
            </h2>
            {isDM ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRelationOpen(true)}
                tooltip={t('campaigns.tip.editRelations')}
              >
                {t('npcs.detail.relations.editCta')}
              </Button>
            ) : null}
          </div>
          {npc.relationships.length === 0 ? (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              {t('npcs.detail.relations.empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {npc.relationships.map((rel) => (
                <li
                  key={rel.characterId}
                  className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-3 py-2"
                >
                  <span className="truncate font-serif text-body text-text">
                    {characterNames[rel.characterId] ?? rel.characterId}
                  </span>
                  {attitudeChip(rel.attitude)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Sections RÉSERVÉES MJ (masquées client pour les joueurs) ── */}
        {isDM ? (
          <>
            {npc.combatStats !== null ? (
              <Card className="mb-6 flex flex-col gap-2 border-gold/30">
                <h2 className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
                  {t('npcs.detail.combatHeading')}
                </h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 font-serif text-body-sm sm:grid-cols-3">
                  {npc.combatStats.cr !== undefined ? (
                    <StatRow label={t('npcs.detail.combat.cr')} value={String(npc.combatStats.cr)} />
                  ) : null}
                  {npc.combatStats.ac !== undefined ? (
                    <StatRow label={t('npcs.detail.combat.ac')} value={String(npc.combatStats.ac)} />
                  ) : null}
                  {npc.combatStats.hp !== undefined ? (
                    <StatRow label={t('npcs.detail.combat.hp')} value={String(npc.combatStats.hp)} />
                  ) : null}
                  {npc.combatStats.monsterContentId ? (
                    <StatRow
                      label={t('npcs.detail.combat.monster')}
                      // Le NOM de la créature, pas son slug : « Gobelours »
                      // dit quelque chose à la table, « bugbear » non. Repli
                      // sur le slug si le bestiaire ne connaît pas l'entrée
                      // (pack désinstallé) — mieux vaut un identifiant brut
                      // qu'un champ vide qui laisserait croire au délien.
                      value={monsterLabel ?? npc.combatStats.monsterContentId}
                    />
                  ) : null}
                </dl>
                {npc.combatStats.notes?.trim() ? (
                  <p className="mt-1 font-serif text-body-sm italic text-text-secondary">
                    {npc.combatStats.notes}
                  </p>
                ) : null}
              </Card>
            ) : null}

            <Card className="mb-6 flex flex-col gap-2 border-crimson/25">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-title text-meta uppercase tracking-[0.18em] text-crimson">
                  {t('npcs.detail.dmNotesHeading')}
                </h2>
                <span className="font-serif text-meta italic text-text-tertiary">
                  {t('npcs.detail.dmOnlyHint')}
                </span>
              </div>
              {npc.dmNotes.trim() ? (
                <JournalMarkdown markdown={npc.dmNotes} />
              ) : (
                <p className="font-serif text-body-sm italic text-text-tertiary">
                  {t('npcs.detail.dmNotesEmpty')}
                </p>
              )}
            </Card>
          </>
        ) : null}
      </PageContainer>

      {isDM && cid && user ? (
        <NpcEditModal
          open={editOpen}
          campaignId={cid}
          createdByUid={user.uid}
          npc={npc}
          onClose={() => setEditOpen(false)}
          onSaved={refresh}
        />
      ) : null}

      {isDM && cid && user && duplicateOpen ? (
        <NpcDuplicateModal
          open={duplicateOpen}
          npc={npc}
          targets={duplicateTargets}
          createdByUid={user.uid}
          onClose={() => setDuplicateOpen(false)}
        />
      ) : null}

      {isDM && cid && relationOpen ? (
        <NpcRelationModal
          open={relationOpen}
          campaignId={cid}
          npc={npc}
          players={players}
          onClose={() => setRelationOpen(false)}
          onChanged={refresh}
        />
      ) : null}

      {isDM ? (
        <DetailModal open={deleteOpen} onClose={() => setDeleteOpen(false)} size="sm">
          <div className="flex flex-col gap-4 p-6">
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.14em] text-gold-bright">
              {t('npcs.detail.deleteConfirm.title')}
            </h2>
            <p className="font-serif text-body text-text-secondary">
              {t('npcs.detail.deleteConfirm.body').replace('{name}', npc.name)}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                {t('npcs.detail.deleteConfirm.cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => void onConfirmDelete()}
                disabled={deleting}
              >
                {deleting
                  ? t('npcs.detail.deleteConfirm.deleting')
                  : t('npcs.detail.deleteConfirm.confirm')}
              </Button>
            </div>
          </div>
        </DetailModal>
      ) : null}
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
        {label}
      </dt>
      <dd className="font-display text-body text-text">{value}</dd>
    </div>
  );
}
