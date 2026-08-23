import { doc, getDoc } from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import type { EncounterParticipant } from '@/shared/types/encounter';

import type { LinkedMember } from './use-encounter-party-draft';

/**
 * Résout le modificateur d'initiative de chaque participant AU MOMENT du jet
 * (step 4 du plan 24, livraison 24.3), renvoyé sous forme de `Map<instanceId,
 * modifier>`.
 *
 * Pourquoi à la volée et pas stocké : le participant (schéma 24.1, figé sur
 * `docs/DATA-MODEL.md`) ne porte NI le modificateur d'init NI l'`ownerUid` —
 * seulement `characterId`. On reconstruit donc le modificateur joueur en
 * joignant `participant.characterId` au roster de campagne (`LinkedMember`,
 * `characterId → userId`) puis en lisant `users/{userId}/characters/{id}.initiative`
 * (le total d'initiative de la fiche : mod de DEX + bonus éventuels), via la
 * même lecture cross-owner que `useEncounterPartyDraft` (rule
 * `gmCanReadLinkedCharacter`, 4A.1).
 *
 * Créatures non joueuses (M3) : le modificateur vient du bestiaire, via une
 * table `monsterContentId → mod de DEX` fournie par l'appelant (l'écran connaît
 * `useContent('monsters')`, pas ce module — on ne recharge pas le contenu ici).
 * Un gobelin à DEX 14 lance donc à +2 comme à la table, au lieu du 0 uniforme
 * qui était câblé jusqu'ici. Une ligne saisie à la main, ou un slug absent du
 * bestiaire chargé, reste à 0 : le MJ ajuste ensuite l'initiative en place.
 *
 * Politique de repli (jamais throw) : un joueur dont la fiche est introuvable,
 * non liée au roster, ou dont `initiative` n'est pas un nombre, obtient un
 * modificateur **0**. Le MJ peut relancer un participant individuel si une
 * fiche se re-synchronise plus tard. Une lecture qui échoue (réseau,
 * permission) est isolée par participant — elle ne fait pas échouer tout le jet.
 */
export async function resolveInitiativeModifiers(
  participants: readonly EncounterParticipant[],
  linkedMembers: readonly LinkedMember[],
  monsterModifiers: ReadonlyMap<string, number> = new Map(),
): Promise<Map<string, number>> {
  const ownerByCharacter = new Map(linkedMembers.map((m) => [m.characterId, m.userId]));

  const entries = await Promise.all(
    participants.map(async (p): Promise<[string, number]> => {
      const modifier = await resolveOne(p, ownerByCharacter, monsterModifiers);
      return [p.instanceId, modifier];
    }),
  );

  return new Map(entries);
}

async function resolveOne(
  participant: EncounterParticipant,
  ownerByCharacter: ReadonlyMap<string, string>,
  monsterModifiers: ReadonlyMap<string, number>,
): Promise<number> {
  if (participant.type !== 'player' || participant.characterId === null) {
    // Monstre / PNJ : mod de DEX de sa fiche de créature, 0 s'il n'en a pas.
    if (participant.monsterContentId === null) return 0;
    return monsterModifiers.get(participant.monsterContentId) ?? 0;
  }
  const ownerUid = ownerByCharacter.get(participant.characterId);
  if (ownerUid === undefined) return 0;

  try {
    const snap = await getDoc(
      doc(getDb(), 'users', ownerUid, 'characters', participant.characterId),
    );
    if (!snap.exists()) return 0;
    const raw = snap.data() as { initiative?: unknown };
    return typeof raw.initiative === 'number' && Number.isFinite(raw.initiative)
      ? raw.initiative
      : 0;
  } catch {
    // Lecture isolée : une fiche illisible ne casse pas le jet des autres.
    return 0;
  }
}
