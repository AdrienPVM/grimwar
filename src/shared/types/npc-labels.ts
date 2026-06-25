import type { StringKey } from '@/shared/lib/i18n';

import type { NpcAttitude, NpcRole, NpcVisibility } from './npc';

/**
 * Mappe les énumérations machine du PNJ vers leur clé i18n FR. Centralisé ici
 * (et non en clé construite dynamiquement) pour rester TYPE-SAFE : tout rôle /
 * attitude / visibilité ajouté à l'énum force l'ajout de sa clé, et toute clé
 * pointe vers une `StringKey` réellement déclarée dans `i18n.ts`.
 */
export const NPC_ROLE_LABEL_KEY: Record<NpcRole, StringKey> = {
  merchant: 'npcs.role.merchant',
  ally: 'npcs.role.ally',
  enemy: 'npcs.role.enemy',
  contact: 'npcs.role.contact',
  noble: 'npcs.role.noble',
  other: 'npcs.role.other',
};

export const NPC_ATTITUDE_LABEL_KEY: Record<NpcAttitude, StringKey> = {
  friendly: 'npcs.attitude.friendly',
  neutral: 'npcs.attitude.neutral',
  hostile: 'npcs.attitude.hostile',
  unknown: 'npcs.attitude.unknown',
};

export const NPC_VISIBILITY_LABEL_KEY: Record<NpcVisibility, StringKey> = {
  all: 'npcs.visibility.all',
  dm: 'npcs.visibility.dm',
};
