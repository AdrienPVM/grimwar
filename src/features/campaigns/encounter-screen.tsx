import { useMemo, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { CodexOverlay } from '@/features/codex/codex-overlay';
import { DmToolsOverlay } from '@/features/dm-view/dm-tools-overlay';
import { Button } from '@/shared/components/button';
import { PageContainer } from '@/shared/components/page-container';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import {
  logEncounterEnd,
  logEncounterStart,
  logMonsterHpChange,
  logTurnStart,
} from '@/shared/lib/event-logger';
import { localize, t, type StringKey } from '@/shared/lib/i18n';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import {
  addParticipant,
  advanceTurn,
  applyInitiativeRolls,
  applyParticipantHpDelta,
  endEncounter,
  EncounterServiceError,
  grantParticipantTempHp,
  removeParticipant,
  reopenEncounter,
  rewindTurn,
  rollInitiativeFor,
  setParticipantCondition,
  setParticipantNote,
  startEncounter,
  updateParticipant,
  type CreateParticipantInput,
  type ParticipantPatch,
} from '@/shared/lib/services/encounters';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import {
  ENCOUNTER_OUTCOMES,
  type EncounterOutcome,
  type EncounterParticipant,
  type EncounterStatus,
} from '@/shared/types/encounter';

import { customConditionLabel } from './custom-condition';
import { deriveHandoffRows, HANDOFF_TTL_MS } from './encounter-handoff';
import { EncounterHandoffPanel, type HandoffTarget } from './encounter-handoff-panel';
import { hpBarColor, hpRatio } from './encounter-hp';
import { EncounterPartyView } from './encounter-party-view';
import { ParticipantAddModal } from './participant-add-modal';
import { ParticipantControlModal } from './participant-control-modal';
import { PlayerControlModal } from './player-control-modal';
import { resolveInitiativeModifiers } from './resolve-initiative-modifiers';
import { RosterOverlay } from './roster-overlay';
import { useCampaign } from './use-campaign';
import { useCampaignEvents } from './use-campaign-events';
import { useEncounter } from './use-encounter';
import type { LinkedMember } from './use-encounter-party-draft';

const STATUS_CHIP: Record<
  EncounterStatus,
  { variant: 'default' | 'gold' | 'heal' | 'damage'; labelKey: StringKey }
> = {
  planned: { variant: 'default', labelKey: 'encounters.status.planned' },
  active: { variant: 'gold', labelKey: 'encounters.status.active' },
  completed: { variant: 'heal', labelKey: 'encounters.status.completed' },
  aborted: { variant: 'damage', labelKey: 'encounters.status.aborted' },
};

const OUTCOME_LABEL: Record<EncounterOutcome, StringKey> = {
  victory: 'encounters.outcome.victory',
  defeat: 'encounters.outcome.defeat',
  fled: 'encounters.outcome.fled',
};

/**
 * Route `/campaigns/:cid/encounters/:eid` — écran de combat (tracker partagé,
 * JALON 24.3). S'abonne EN TEMPS RÉEL à la rencontre (`useEncounter`, step 10) :
 * MJ et joueurs voient le même ordre d'initiative, le même round et le tour
 * actif sans rafraîchir.
 *
 * Contrôles MJ-only (la défense ultime reste la rule `create/update : isDMOf`) :
 *   - `planned` : « Lancer l'initiative » (jet 1d20 + mod pour chaque participant
 *     — mod joueur résolu via la fiche liée, monstre = 0) ; re-roll par
 *     participant ; « Démarrer le combat ».
 *   - `active`  : « Fin du tour » (avance le pointeur de tour, wrap → round +1) ;
 *     « Clôturer le combat » avec sélecteur d'issue (victoire/défaite/fuite).
 *
 * Loggers câblés (24.1) : `encounter-start` au démarrage, `turn-start` au
 * démarrage (1ᵉʳ participant) et à chaque fin de tour, `encounter-end` à la
 * clôture. Le pointeur `activeEncounterId` (+ la campagne active, requise par
 * l'event-logger) est posé avant chaque écriture d'event, libéré à la clôture.
 *
 * Contrôle MJ des PV / états (step 7, JALON 24.4) : chaque carte de monstre / PNJ
 * porte un bouton « PV / États » (MJ-only) ouvrant `ParticipantControlModal` —
 * dégâts/soin (journalisés `monster-hp-change`, visibilité `dm`) + bascule des
 * états (persistés sur le doc partagé, sans event dédié). Les états actifs
 * s'affichent en chips sur la carte. Le PJ se gère sur sa fiche, pas ici.
 *
 * Hand-off des dégâts physiques (step 7b, JALON 24.4) : un panneau MJ-only liste
 * les jets physiques récents des joueurs (events `roll` mode physique, lus via le
 * feed existant + filtrés côté client — aucun index/rule en plus). Le MJ choisit
 * la cible (monstre / PNJ) sur qui appliquer le total ; le joueur ne cible jamais.
 *
 * Vue de groupe (step 8, JALON 24.4) : `EncounterPartyView` montre la santé de
 * tous les participants (groupée PJ / adversaires), lisible par TOUS. Les joueurs
 * voient les PV des monstres en live (ils lisent déjà `currentHp` via la rule) ;
 * les masquer nécessiterait un champ `hpVisible` = changement de schéma (décision
 * Adrien), reporté.
 *
 * Reste reporté : le re-roll côté JOUEUR (qui écrirait sa propre init sur le doc)
 * est bloqué par la rule d'écriture `isDMOf` — il nécessiterait un élargissement
 * de rule (décision Adrien) ; en V1 single-MJ le meneur lance/relance pour toute
 * la table.
 */
export function EncounterScreen(): JSX.Element {
  const navigate = useNavigate();
  const { cid, eid } = useParams<{ cid: string; eid: string }>();
  const { user } = useAuth();
  const { campaign, members, isLoading: campaignLoading } = useCampaign(cid);
  const { encounter, isLoading: encounterLoading, error: encounterError } = useEncounter(cid, eid);

  const [actionPending, setActionPending] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [endMode, setEndMode] = useState<boolean>(false);
  const [rerollingId, setRerollingId] = useState<string | null>(null);
  // instanceId du participant dont la modale de contrôle MJ est ouverte (24.4).
  const [controlTargetId, setControlTargetId] = useState<string | null>(null);
  // Ajout d'un combattant en cours de rencontre (M2).
  const [addOpen, setAddOpen] = useState<boolean>(false);
  // eventId des jets physiques déjà appliqués / ignorés par le MJ (step 7b).
  const [dismissedHandoffIds, setDismissedHandoffIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Codex consultable par-dessus le tracker, sans quitter le combat (E6).
  const [codexOpen, setCodexOpen] = useState<boolean>(false);
  const [dmToolsOpen, setDmToolsOpen] = useState<boolean>(false);
  // La compagnie, consultable par-dessus le tracker (E7).
  const [rosterOpen, setRosterOpen] = useState<boolean>(false);

  const { data: conditionDefs } = useContent('conditions');
  // Bestiaire (∪ contenu custom) — sert à résoudre la fiche d'un participant lié
  // par son `monsterContentId` pour la modale de contrôle MJ. Vide tant qu'aucun
  // pack monstre n'est importé : la fiche n'est alors simplement pas proposée.
  const { data: monsterDefs } = useContent('monsters');

  // Modificateur d'initiative des créatures (M3) : mod de DEX de leur fiche de
  // bestiaire, indexé par slug. Jusqu'ici tout non-joueur lançait à +0 — un
  // gobelin (DEX 14) partait donc systématiquement trop bas dans l'ordre.
  const monsterInitModifiers = useMemo<Map<string, number>>(
    () => new Map(monsterDefs.map((m) => [m.id, abilityModifier(m.abilities.dex)])),
    [monsterDefs],
  );

  const setActiveCampaign = useActiveCampaignStore((s) => s.setActiveCampaign);
  const setActiveEncounter = useActiveCampaignStore((s) => s.setActiveEncounter);

  // Résout le libellé localisé d'un slug d'état (repli : slug capitalisé tant
  // que le bundle `conditions` n'est pas chargé).
  const conditionLabel = useMemo(() => {
    const byId = new Map(conditionDefs.map((c) => [c.id, localize(c.name)]));
    return (id: string): string =>
      // Un état maison (M8) porte son libellé verbatim derrière son préfixe :
      // on le rend tel que le MJ l'a tapé, accents et casse compris.
      customConditionLabel(id) ?? byId.get(id) ?? capitalizeSlug(id);
  }, [conditionDefs]);

  const isGm = useMemo<boolean>(() => {
    if (!campaign || !user) return false;
    return campaign.gmIds.includes(user.uid);
  }, [campaign, user]);

  // Hand-off des dégâts physiques (step 7b) — MJ-only. On réutilise le feed
  // d'événements existant (visibilité `all`/`dm` côté MJ) et on filtre côté
  // client les jets physiques récents : aucun nouvel index ni rule. `undefined`
  // côté joueur ⇒ pas d'abonnement (le panneau est MJ-only de toute façon).
  const { events: recentEvents } = useCampaignEvents(isGm ? cid : undefined, { isDM: isGm });

  // Roster lié — sert à résoudre le modificateur d'init des joueurs (characterId
  // → ownerUid → fiche). Mirror du calcul de `EncountersListScreen`.
  const linkedMembers = useMemo<LinkedMember[]>(
    () =>
      members
        .filter((m) => m.characterId !== null)
        .map((m) => ({ userId: m.userId, characterId: m.characterId as string })),
    [members],
  );

  const backToEncounters = (): void =>
    navigate(cid ? `/campaigns/${cid}/encounters` : '/campaigns');

  // Pose les pointeurs requis par l'event-logger AVANT toute écriture d'event :
  // la campagne active (sinon `writeEvent` no-op) + la rencontre active (tag
  // `encounterId`). On préserve le pointeur de séance courant. Robuste à un
  // reload en cours de combat (Zustand repart à null).
  function ensurePointers(campaignId: string, encounterId: string): void {
    const sessionId = useActiveCampaignStore.getState().activeSessionId;
    setActiveCampaign(campaignId, sessionId);
    setActiveEncounter(encounterId);
  }

  // ─── Initiative (step 4) — MJ-only, status `planned` uniquement (l'ordre est
  // figé une fois le combat démarré pour ne pas désynchroniser `turnIndex`).
  async function handleRollInitiative(): Promise<void> {
    if (!encounter || !cid || !eid || actionPending) return;
    if (encounter.participants.length === 0) return;
    setActionPending(true);
    setActionError(null);
    try {
      const modifiers = await resolveInitiativeModifiers(
        encounter.participants,
        linkedMembers,
        monsterInitModifiers,
      );
      const rolls = encounter.participants.map((p) =>
        rollInitiativeFor(p.instanceId, modifiers.get(p.instanceId) ?? 0),
      );
      // Relit l'état serveur avant d'écrire (DEBT D31 volet 1) : réécrire le
      // tableau depuis la closure annulerait des PV/états appliqués entre-temps.
      await applyInitiativeRolls(cid, eid, rolls);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  async function handleReroll(participant: EncounterParticipant): Promise<void> {
    if (!encounter || !cid || !eid || actionPending || rerollingId) return;
    setRerollingId(participant.instanceId);
    setActionError(null);
    try {
      const modifiers = await resolveInitiativeModifiers(
        [participant],
        linkedMembers,
        monsterInitModifiers,
      );
      const roll = rollInitiativeFor(
        participant.instanceId,
        modifiers.get(participant.instanceId) ?? 0,
      );
      await applyInitiativeRolls(cid, eid, [roll]);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setRerollingId(null);
    }
  }

  // ─── Démarrage (step 5) — pose le pointeur APRÈS la transition réussie, puis
  // journalise encounter-start + le tour du 1ᵉʳ participant.
  async function handleStart(): Promise<void> {
    if (!encounter || !cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await startEncounter(cid, eid);
      ensurePointers(cid, eid);
      await logEncounterStart(eid, {
        name: encounter.name,
        participantCount: encounter.participants.length,
      });
      const first = encounter.participants[0];
      if (first) {
        await logTurnStart(eid, {
          participantId: first.instanceId,
          participantName: first.name,
          round: 1,
        });
      }
    } catch (err) {
      setActionError(mapActionError(err));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Fin de tour (step 6) — avance le pointeur, journalise le tour du nouveau
  // participant actif. On (re)pose les pointeurs au cas où la session a été
  // rechargée en cours de combat.
  async function handleEndTurn(): Promise<void> {
    if (!encounter || !cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      const computed = await advanceTurn(cid, eid);
      const active = encounter.participants[computed.turnIndex];
      if (active) {
        ensurePointers(cid, eid);
        await logTurnStart(eid, {
          participantId: active.instanceId,
          participantName: active.name,
          round: computed.round,
        });
      }
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Tour précédent (M7) — symétrique de « Fin du tour », sans event : on
  // corrige la feuille de suivi, on ne fait pas rejouer le tour dans le récit
  // (rejouer `turn-start` inscrirait deux fois le même tour au journal).
  async function handlePreviousTurn(): Promise<void> {
    if (!encounter || !cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await rewindTurn(cid, eid);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Abandon (M7) — `'aborted'` était déclaré, traduit, doté de sa pastille,
  // et aucun code ne l'écrivait. AUCUN event `encounter-end` : un combat que la
  // table abandonne n'a pas d'issue, et l'enum du payload n'en propose aucune
  // qui ne mentirait pas (victoire / défaite / fuite).
  async function handleAbort(): Promise<void> {
    if (!encounter || !cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await endEncounter(cid, eid, 'aborted');
      setActiveEncounter(null);
      setEndMode(false);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Réouverture (M7) — une clôture erronée n'était plus rattrapable. Repose
  // le pointeur de rencontre active : le tracker redevient la scène en cours.
  async function handleReopen(): Promise<void> {
    if (!encounter || !cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await reopenEncounter(cid, eid);
      ensurePointers(cid, eid);
    } catch (err) {
      setActionError(mapActionError(err));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Clôture (step 9) — l'issue vit dans l'event `encounter-end` (pas sur le
  // doc, cf. 24.1). On (re)pose le pointeur avant de logguer, puis on libère la
  // rencontre active (la campagne reste active).
  async function handleEnd(outcome: EncounterOutcome): Promise<void> {
    if (!encounter || !cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      ensurePointers(cid, eid);
      await endEncounter(cid, eid);
      await logEncounterEnd(eid, { name: encounter.name, outcome });
      setActiveEncounter(null);
      setEndMode(false);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Contrôle MJ des PV monstres (step 7) — applique un delta puis journalise
  // `monster-hp-change` (visibilité `dm`) UNIQUEMENT si les PV ont changé (au
  // plancher 0 / plafond maxHp, un delta peut être absorbé sans changement).
  // Réservé aux participants non-joueurs (la rule `isDMOf` est la défense ultime).
  async function handleApplyHp(participant: EncounterParticipant, delta: number): Promise<void> {
    if (!cid || !eid || actionPending || delta === 0) return;
    setActionPending(true);
    setActionError(null);
    try {
      const { before, after } = await applyParticipantHpDelta(
        cid,
        eid,
        participant.instanceId,
        delta,
      );
      if (before !== after) {
        ensurePointers(cid, eid);
        await logMonsterHpChange(eid, {
          monsterInstanceId: participant.instanceId,
          monsterName: participant.name,
          before,
          after,
        });
      }
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Contrôle MJ des états (step 7) — persiste sur le doc partagé (live), pas
  // d'event (aucun kind `monster-condition-change` ; cf. service).
  async function handleToggleCondition(
    participant: EncounterParticipant,
    condition: string,
    action: 'add' | 'remove',
  ): Promise<void> {
    if (!cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await setParticipantCondition(cid, eid, participant.instanceId, condition, action);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── PV temporaires (M6) — `tempHp` était consommé par `applyHpDelta` mais
  // aucun geste ne pouvait l'accorder. Pas d'event : le payload
  // `monster-hp-change` porte les PV RÉELS, qui ne bougent pas ici.
  async function handleGrantTempHp(
    participant: EncounterParticipant,
    amount: number,
  ): Promise<void> {
    if (!cid || !eid || actionPending || amount <= 0) return;
    setActionPending(true);
    setActionError(null);
    try {
      await grantParticipantTempHp(cid, eid, participant.instanceId, amount);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Note de combattant (M6) — aide-mémoire de MJ sur le doc partagé, pas un
  // fait de jeu : aucun event journalisé.
  async function handleSaveNote(
    participant: EncounterParticipant,
    note: string,
  ): Promise<void> {
    if (!cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await setParticipantNote(cid, eid, participant.instanceId, note);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Édition d'un combattant (M2/M3) — nom, PV, initiative. Aucun event : ce
  // n'est pas un fait de jeu mais une correction de la feuille de suivi (les PV
  // qui bougent VRAIMENT passent par `handleApplyHp`, qui journalise).
  async function handleUpdateParticipant(
    participant: EncounterParticipant,
    patch: ParticipantPatch,
  ): Promise<void> {
    if (!cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await updateParticipant(cid, eid, participant.instanceId, patch);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Retrait d'un combattant (M2) — ferme la modale de contrôle, qui pointe
  // sur un participant qui n'existe plus.
  async function handleRemoveParticipant(participant: EncounterParticipant): Promise<void> {
    if (!cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await removeParticipant(cid, eid, participant.instanceId);
      setControlTargetId(null);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Reflet des PV d'un PJ sur la rencontre (M5) — les PV d'un participant
  // joueur sont un INSTANTANÉ figé à la création, que rien ne rafraîchissait :
  // la carte du tracker affichait 24/24 pendant que le PJ agonisait. La fiche
  // reste la source de vérité ; on ne recopie ici que pour que la table voie
  // juste. Aucun event : `useUpdateCharacter` a déjà journalisé le vrai
  // changement (`hp-change` + audit `dm-edit`).
  async function handleMirrorPlayerHp(
    participant: EncounterParticipant,
    currentHp: number,
    maxHp: number,
  ): Promise<void> {
    if (!cid || !eid) return;
    try {
      await updateParticipant(cid, eid, participant.instanceId, { currentHp, maxHp });
    } catch {
      // Le reflet a échoué mais les PV réels sont posés : on ne remonte pas une
      // erreur qui laisserait croire que les dégâts n'ont pas été appliqués.
    }
  }

  // ─── Renfort (M2) — entre en fin d'ordre, initiative 0 : le MJ la saisit ou
  // la relance ensuite, sans déplacer le tour actif sous ses pieds.
  async function handleAddParticipant(input: CreateParticipantInput): Promise<void> {
    if (!cid || !eid || actionPending) return;
    setActionPending(true);
    setActionError(null);
    try {
      await addParticipant(cid, eid, input);
    } catch {
      setActionError(t('encounters.action.error.generic'));
    } finally {
      setActionPending(false);
    }
  }

  // ─── Hand-off dégâts (step 7b, élargi aux dés numériques par M4) — le MJ
  // applique un jet récent d'un joueur sur la cible qu'il choisit (jamais le
  // joueur). Réutilise `handleApplyHp` (monster-hp-change), puis retire l'event
  // du panneau.
  async function handleApplyHandoff(
    eventId: string,
    total: number,
    targetInstanceId: string,
  ): Promise<void> {
    const target = encounter?.participants.find((p) => p.instanceId === targetInstanceId);
    if (!target) return;
    await handleApplyHp(target, -total);
    dismissHandoff(eventId);
  }

  function dismissHandoff(eventId: string): void {
    setDismissedHandoffIds((prev) => {
      const next = new Set(prev);
      next.add(eventId);
      return next;
    });
  }

  if (campaignLoading || encounterLoading) return <Splash />;

  if (encounterError || !encounter || !cid || !eid) {
    const isNotFound = encounterError?.message === 'encounter-not-found';
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {isNotFound
              ? t('encounters.detail.error.notFoundTitle')
              : t('encounters.detail.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {isNotFound
              ? t('encounters.detail.error.notFoundBody')
              : t('encounters.detail.error.body')}
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" size="sm" onClick={backToEncounters}>
              {t('encounters.detail.back')}
            </Button>
          </div>
        </GlassPanel>
      </main>
    );
  }

  const statusChip = STATUS_CHIP[encounter.status];
  const hasRolled = encounter.participants.some((p) => p.initiative !== 0);
  const canRoll = isGm && encounter.status === 'planned';
  const isActive = encounter.status === 'active';
  // Affiche l'ordre d'initiative dès que le combat est lancé (statut ≠ planned) OU
  // que l'initiative a été jetée en préparation. Sinon (planned + non jeté), la vue
  // de groupe groupée prend le relais — l'ordre n'existe pas encore. On ne se fie
  // PAS au seul `hasRolled` (une init légitime à 0 le mettrait à false en plein
  // combat) : le statut prime.
  const showInitiativeOrder = encounter.status !== 'planned' || hasRolled;
  // Rencontre encore jouable (préparation ou combat en cours) vs close. Une
  // rencontre close n'offre au MJ que la réouverture (M7).
  const isGmPlayable = encounter.status === 'planned' || isActive;

  // Participant ciblé par la modale de contrôle, dérivé EN LIVE du doc : les PV /
  // états affichés se rafraîchissent via `onSnapshot` après chaque application.
  // Si le participant a disparu (clôture, retrait), la cible retombe à null.
  const controlTarget =
    controlTargetId !== null
      ? (encounter.participants.find((p) => p.instanceId === controlTargetId) ?? null)
      : null;

  // Propriétaire de la fiche d'un participant joueur (M5) — sans lui, aucune
  // écriture n'est possible (le doc vit sous `users/{ownerUid}`) : le contrôle
  // n'est alors pas proposé.
  const ownerOfCharacter = (characterId: string | null): string | null =>
    characterId === null
      ? null
      : (linkedMembers.find((m) => m.characterId === characterId)?.userId ?? null);

  // Cible de contrôle joueur — distincte de `controlTarget` : les PV d'un PJ
  // vivent sur SA fiche, pas sur le participant (qui n'en porte qu'un reflet).
  const playerControlTarget =
    controlTarget?.type === 'player' && ownerOfCharacter(controlTarget.characterId) !== null
      ? controlTarget
      : null;

  // Fiche de créature liée à la cible de contrôle (si autofill depuis le
  // bestiaire) — `null` pour une ligne saisie à la main ou si le slug n'est plus
  // dans le bestiaire chargé.
  const controlTargetMonster =
    controlTarget?.monsterContentId != null
      ? (monsterDefs.find((m) => m.id === controlTarget.monsterContentId) ?? null)
      : null;

  // Hand-off (step 7b) — jets physiques récents à appliquer, MJ-only et combat en
  // cours uniquement. Les cibles sont les non-joueurs (un PJ se gère sur sa fiche).
  const handoffRows =
    isGm && isActive
      ? deriveHandoffRows(
          recentEvents,
          encounter.participants,
          dismissedHandoffIds,
          Date.now(),
          HANDOFF_TTL_MS,
        )
      : [];
  const handoffTargets: HandoffTarget[] = encounter.participants
    .filter((p) => p.type !== 'player')
    .map((p) => ({ instanceId: p.instanceId, name: p.name }));

  return (
    <PageContainer width="content">
      <nav className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={backToEncounters}
          aria-label={t('encounters.detail.back')}
        >
          ← {t('encounters.detail.back')}
        </Button>

        {/* Consultation en cours de combat (audit UX, E6 / M6) : le Codex
            s'ouvre PAR-DESSUS le tracker. Naviguer vers `/codex` perdrait la
            position de défilement, et son bouton Retour ramènerait à la
            bibliothèque — pas au combat. */}
        <div className="flex items-center gap-1">
          {/* E7 / scénario M5 — la fiche d'un joueur coûtait 4 gestes en plein
              tour de jeu. Le besoin fréquent (PV, CA, états) est servi ici même
              par les cartes live ; la fiche entière reste une navigation. */}
          {campaign ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRosterOpen(true)}
              tooltip={t('encounters.detail.rosterTip')}
            >
              {t('encounters.detail.roster')}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCodexOpen(true)}
            tooltip={t('encounters.detail.codexTip')}
          >
            {t('encounters.detail.codex')}
          </Button>

          {/* E12 / scénario M8 — jet secret et bloc-notes n'existaient qu'en bas
              du détail de campagne. En plein combat, les atteindre coûtait de
              quitter le tracker et d'en perdre le défilement. */}
          {isGm && campaign ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDmToolsOpen(true)}
              tooltip={t('campaigns.dmTools.openTip')}
            >
              {t('campaigns.dmTools.open')}
            </Button>
          ) : null}
        </div>
      </nav>

      <header className="mt-4 text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright lg:text-4xl">
          {encounter.name}
        </h1>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Chip variant={statusChip.variant}>{t(statusChip.labelKey)}</Chip>
          {isActive ? (
            <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('encounters.detail.round')} {encounter.round}
            </span>
          ) : null}
        </div>

        {isGm && isGmPlayable ? (
          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {canRoll ? (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleRollInitiative}
                  disabled={actionPending || encounter.participants.length === 0}
                  tooltip={t('campaigns.tip.rollInit')}
                >
                  {actionPending
                    ? t('encounters.action.rollingInit')
                    : t('encounters.action.rollInit')}
                </Button>
              ) : null}

              {encounter.status === 'planned' ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStart}
                  disabled={actionPending || encounter.participants.length === 0}
                  tooltip={t('campaigns.tip.startCombat')}
                >
                  {actionPending ? t('encounters.action.starting') : t('encounters.action.start')}
                </Button>
              ) : (
                <>
                  {/* Revenir d'un tour (M7) : « Fin du tour » n'avait aucun
                      symétrique — un tour avancé par erreur était définitif. */}
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handlePreviousTurn}
                    disabled={actionPending || (encounter.round <= 1 && encounter.turnIndex === 0)}
                    tooltip={t('campaigns.tip.previousTurn')}
                  >
                    {t('encounters.action.previousTurn')}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleEndTurn}
                    disabled={actionPending}
                    tooltip={t('campaigns.tip.endTurn')}
                  >
                    {t('encounters.action.endTurn')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setEndMode((v) => !v)}
                    disabled={actionPending}
                    tooltip={t('campaigns.tip.endCombat')}
                  >
                    {t('encounters.action.end')}
                  </Button>
                </>
              )}

              {/* Le renfort (M2) : disponible en préparation ET en plein combat
                  — c'est justement au round 3 qu'on en a besoin. */}
              <Button
                variant="ghost"
                size="md"
                onClick={() => setAddOpen(true)}
                disabled={actionPending}
                tooltip={t('campaigns.tip.addParticipant')}
              >
                {t('encounters.add.open')}
              </Button>
            </div>

            {endMode && isActive ? (
              <GlassPanel className="w-full max-w-[420px] px-5 py-4">
                <p className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
                  {t('encounters.outcome.prompt')}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {ENCOUNTER_OUTCOMES.map((outcome) => (
                    <Button
                      key={outcome}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEnd(outcome)}
                      disabled={actionPending}
                    >
                      {t(OUTCOME_LABEL[outcome])}
                    </Button>
                  ))}
                  {/* Abandon (M7) : à côté des trois issues, parce que c'est
                      une quatrième façon de sortir d'un combat — celle où il
                      n'y a rien à raconter. */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAbort}
                    disabled={actionPending}
                    className="text-crimson"
                    tooltip={t('campaigns.tip.abortCombat')}
                  >
                    {t('encounters.action.abort')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEndMode(false)}
                    disabled={actionPending}
                  >
                    {t('encounters.action.cancelEnd')}
                  </Button>
                </div>
              </GlassPanel>
            ) : null}

            {actionError ? (
              <p
                role="alert"
                className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
              >
                {actionError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Rencontre close (M7) — une clôture erronée était définitive. La
            rouvrir reprend round et tour là où ils s'étaient arrêtés. */}
        {isGm && !isGmPlayable ? (
          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="max-w-[46ch] font-serif text-body-sm italic text-text-secondary">
              {t('encounters.detail.closedHint')}
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={handleReopen}
              disabled={actionPending}
              tooltip={t('campaigns.tip.reopenCombat')}
            >
              {actionPending
                ? t('encounters.action.reopening')
                : t('encounters.action.reopen')}
            </Button>
            {actionError ? (
              <p
                role="alert"
                className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
              >
                {actionError}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {handoffRows.length > 0 ? (
        <EncounterHandoffPanel
          rows={handoffRows}
          targets={handoffTargets}
          pending={actionPending}
          onApply={(eventId, total, targetInstanceId) =>
            void handleApplyHandoff(eventId, total, targetInstanceId)
          }
          onDismiss={dismissHandoff}
        />
      ) : null}

      {showInitiativeOrder ? (
        // ── Combat : ordre d'initiative — UNE seule source d'info par combattant.
        // Chaque carte porte l'ordre, le tour actif, les PV ET les états : la vue
        // de groupe (santé groupée par camp) n'est PAS rendue en parallèle, elle
        // ferait doublon avec ces cartes (corrigé suite à l'UAT du 2026-06-25 —
        // « ordre d'initiative » et « état du groupe » affichaient la même chose).
        <section className="mt-8">
          <h2 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('encounters.turnOrder.title')}
          </h2>
          <ul
            aria-label={t('encounters.turnOrder.aria')}
            // `mt-2 py-2` et non `mt-4 pb-2` : `overflow-x: auto` fait
            // recalculer `overflow-y` en `auto` par la spec, ce qui rogne
            // l'anneau du participant dont c'est le tour. On déplace la moitié
            // de la marge haute dans le rembourrage — le contenu ne bouge pas
            // (8 + 8 = les 16 px d'avant) et l'anneau a sa place des deux côtés.
            // Même famille de correctif que `<ScrollRow>` (cf. sa doc).
            className="mt-2 flex gap-3 overflow-x-auto py-2 lg:flex-wrap lg:overflow-x-visible"
          >
            {encounter.participants.map((participant, idx) => (
              <ParticipantCard
                key={participant.instanceId}
                participant={participant}
                isActiveTurn={isActive && idx === encounter.turnIndex}
                showInit
                canReroll={canRoll}
                rerolling={rerollingId === participant.instanceId}
                onReroll={() => handleReroll(participant)}
                // Contrôle MJ (step 7). Un PJ y donne accès aussi (M5), à
                // condition que sa fiche soit joignable — sinon il n'y a rien
                // à écrire.
                canControl={
                  isGm &&
                  (participant.type !== 'player' ||
                    ownerOfCharacter(participant.characterId) !== null)
                }
                controlLabel={
                  participant.type === 'player'
                    ? t('encounters.playerControl.open')
                    : t('encounters.control.open')
                }
                onControl={() => setControlTargetId(participant.instanceId)}
                resolveConditionLabel={conditionLabel}
              />
            ))}
          </ul>
        </section>
      ) : (
        // ── Préparation (avant le jet d'initiative) : la vue de groupe groupée
        // PJ / adversaires est ICI à sa place — l'ordre des tours n'existe pas
        // encore. Dès l'initiative lancée, elle cède la place à l'ordre
        // d'initiative ci-dessus (santé portée par les cartes) : jamais les deux.
        <>
          <EncounterPartyView
            participants={encounter.participants}
            resolveConditionLabel={conditionLabel}
          />
          {encounter.status === 'planned' ? (
            <p className="mt-4 text-center font-serif text-body-sm italic text-text-secondary">
              {t('encounters.turnOrder.empty')}
            </p>
          ) : null}
        </>
      )}

      {/* Un PJ ciblé ouvre SA fiche, pas la modale de monstre : les PV d'un
          personnage joueur n'ont qu'un reflet sur la rencontre (M5). */}
      {isGm && playerControlTarget ? (
        <PlayerControlModal
          characterId={playerControlTarget.characterId as string}
          ownerUid={ownerOfCharacter(playerControlTarget.characterId) as string}
          fallbackName={playerControlTarget.name}
          onApplied={(currentHp, maxHp) =>
            void handleMirrorPlayerHp(playerControlTarget, currentHp, maxHp)
          }
          onClose={() => setControlTargetId(null)}
        />
      ) : null}

      {isGm && controlTarget && !playerControlTarget ? (
        <ParticipantControlModal
          participant={controlTarget}
          conditions={conditionDefs}
          monster={controlTargetMonster}
          pending={actionPending}
          onApplyHp={(delta) => void handleApplyHp(controlTarget, delta)}
          onGrantTempHp={(amount) => void handleGrantTempHp(controlTarget, amount)}
          onSaveNote={(note) => void handleSaveNote(controlTarget, note)}
          onToggleCondition={(condition, action) =>
            void handleToggleCondition(controlTarget, condition, action)
          }
          onUpdate={(patch) => void handleUpdateParticipant(controlTarget, patch)}
          onRemove={() => void handleRemoveParticipant(controlTarget)}
          onClose={() => setControlTargetId(null)}
        />
      ) : null}

      {isGm ? (
        <ParticipantAddModal
          open={addOpen}
          pending={actionPending}
          onAdd={(input) => void handleAddParticipant(input)}
          onClose={() => setAddOpen(false)}
        />
      ) : null}

      {/* Arrivée sur les ÉTATS et non sur le bestiaire : « empoigné », « à
          terre », « effrayé » sont ce qu'on cherche en plein tour de jeu — et
          surtout `monsters.json` est vide à ce jour (le sourcing SRD du
          bestiaire attend son propre plan), donc ouvrir là-dessus donnerait un
          écran « 0 résultat » à chaque fois. À revoir quand le bundle existe. */}
      <CodexOverlay
        open={codexOpen}
        onClose={() => setCodexOpen(false)}
        initialCategory="conditions"
      />

      {/* Sans campagne chargée il n'y a pas de roster à montrer — le tracker,
          lui, reste lisible (il ne dépend que de la rencontre). */}
      {campaign ? (
        <RosterOverlay
          open={rosterOpen}
          onClose={() => setRosterOpen(false)}
          campaign={campaign}
          members={members}
          viewerIsGm={isGm}
          myUid={user?.uid ?? null}
          myDisplayName={user?.displayName ?? null}
          onViewSheet={(entry) =>
            navigate(`/campaigns/${campaign.id}/members/${entry.uid}/sheet`)
          }
        />
      ) : null}

      {isGm && campaign ? (
        <DmToolsOverlay
          open={dmToolsOpen}
          onClose={() => setDmToolsOpen(false)}
          campaignId={campaign.id}
        />
      ) : null}
    </PageContainer>
  );
}

/** Slug → libellé de repli capitalisé (« blinded » → « Blinded »). */
function capitalizeSlug(slug: string): string {
  if (!slug) return slug;
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

function mapActionError(err: unknown): string {
  if (err instanceof EncounterServiceError) {
    if (err.kind === 'another-encounter-active') {
      return t('encounters.action.error.anotherActive');
    }
    if (err.kind === 'no-participants') {
      return t('encounters.action.error.noParticipants');
    }
  }
  return t('encounters.action.error.generic');
}

interface ParticipantCardProps {
  participant: EncounterParticipant;
  isActiveTurn: boolean;
  showInit: boolean;
  canReroll: boolean;
  rerolling: boolean;
  onReroll: () => void;
  /** Le MJ peut ouvrir la modale de contrôle. */
  canControl: boolean;
  /** Libellé du bouton — un PJ mène à sa fiche, pas à la modale de monstre. */
  controlLabel: string;
  onControl: () => void;
  resolveConditionLabel: (id: string) => string;
}

function ParticipantCard({
  participant,
  isActiveTurn,
  showInit,
  canReroll,
  rerolling,
  onReroll,
  canControl,
  controlLabel,
  onControl,
  resolveConditionLabel,
}: ParticipantCardProps): JSX.Element {
  const ratio = hpRatio(participant.currentHp, participant.maxHp);
  const hpPercent = Math.round(ratio * 100);
  const barColor = hpBarColor(ratio);

  return (
    <li
      aria-current={isActiveTurn ? 'true' : undefined}
      className={cn(
        'flex w-[160px] shrink-0 flex-col gap-2 rounded-card-sm border px-3 py-3',
        'lg:w-[200px] lg:gap-2.5 lg:px-4 lg:py-4',
        // `transition-all` car la carte active s'élargit (lg:w) en plus de changer
        // de bordure — la dominance du tour actif doit se lire à distance (TV).
        'transition-all duration-200 ease-base',
        isActiveTurn
          ? 'border-gold bg-gold/[0.12] shadow-[0_0_16px_var(--gold-glow)] lg:w-[248px]'
          : 'border-white-8 bg-bg-3/40',
      )}
    >
      {isActiveTurn ? (
        <span className="font-title text-[10px] uppercase tracking-[0.14em] text-gold-bright">
          {t('encounters.turnOrder.currentTurn')}
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'min-w-0 truncate font-serif text-body text-text lg:text-lg',
            // Le combattant dont c'est le tour porte un nom doré, plus grand :
            // signal n°1 du combat, lisible depuis le canapé / la TV.
            isActiveTurn && 'text-gold-bright lg:text-2xl',
          )}
        >
          {participant.name}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {participant.type === 'monster' ? (
          <Chip variant="damage">{t('encounters.participant.typeMonster')}</Chip>
        ) : (
          <span />
        )}
        <span className="font-title text-meta uppercase tracking-[0.12em] text-text-secondary">
          {t('encounters.participant.initLabel')} {showInit ? participant.initiative : '—'}
        </span>
      </div>

      <div className="mt-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
            {t('encounters.participant.hpLabel')}
          </span>
          <span className="font-serif text-body-sm tabular-nums text-text-secondary lg:text-base">
            {participant.currentHp}/{participant.maxHp}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] lg:h-2">
          <div
            className={cn('h-full rounded-full transition-[width] duration-300 ease-base', barColor)}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {participant.conditions.length > 0 ? (
        <ul
          aria-label={t('encounters.control.conditionsTitle')}
          className="flex flex-wrap gap-1"
        >
          {participant.conditions.map((id) => (
            <li
              key={id}
              className="rounded-pill border border-crimson/40 bg-crimson/[0.08] px-2 py-0.5 font-title text-[10px] font-bold uppercase tracking-[0.1em] text-crimson lg:text-[11px]"
            >
              {resolveConditionLabel(id)}
            </li>
          ))}
        </ul>
      ) : null}

      {canReroll ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReroll}
          disabled={rerolling}
          aria-label={`${t('encounters.action.reroll')} — ${participant.name}`}
          tooltip={t('campaigns.tip.reroll')}
        >
          {t('encounters.action.reroll')}
        </Button>
      ) : null}

      {canControl ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onControl}
          aria-label={`${controlLabel} — ${participant.name}`}
          tooltip={t('campaigns.tip.controlParticipant')}
        >
          {controlLabel}
        </Button>
      ) : null}
    </li>
  );
}
