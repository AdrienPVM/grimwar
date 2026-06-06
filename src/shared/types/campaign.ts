import { z } from 'zod';

/**
 * Campaign + Membership — schémas Firestore pour la fondation V1 du JALON 4.
 *
 * Sous-jalon 4.0.1 (data layer schemas only). Le service campaignService et
 * les firestore.rules sont mis à jour dans 4.0.2 / 4.0.3 — ce fichier n'est
 * encore consommé par aucun écran.
 *
 * Divergences vs `docs/DATA-MODEL.md` (section campaigns) — tracées dans
 * `plans/MVP-V1-DECISIONS-PRISES.md > [JALON-4.0]` :
 *  - `gmIds: string[]` (array) au lieu de `dmUserId` (singleton). Anticipe 4C
 *    co-MJ multiples sans migration de doc — un MJ unique = `gmIds.length === 1`.
 *  - sous-collection `members/{uid}` au lieu de `memberships/{uid}`. Plus court,
 *    plus aligné avec la sémantique simple V1 (rôle joueur OU MJ, pas spectateur).
 *  - rôles `'gm' | 'member'` au lieu de `'dm' | 'player' | 'spectator'`. Le
 *    spectateur n'a aucun consommateur V1 ; il pourra être ré-introduit
 *    quand un besoin réel apparaît (Twitch/affichage table → V1.5+).
 *  - Settings simplifiés : on garde `language`, `diceMode`, `variants` (les
 *    3 réglages qui ont un consommateur V1). On drop `permissionMode` (locké),
 *    `allowHomebrew` (remplacé par le packs custom V1 JALON 3), `startingLevel`
 *    (hors-scope V1), `enableSpectators` (suit la décision de drop spectateur).
 *  - `inviteToken` (long token URL) déféré à 4.0.5 (UI invite par lien). En 4.0
 *    on livre uniquement `inviteCode` (6-char) — le code sec de partage IRL.
 *
 * Convention timestamps : `createdAt` / `updatedAt` sont typés `z.unknown()`
 * comme dans `CharacterSchema`, parce qu'ils acceptent à la fois `Timestamp`
 * Firestore (lecture) et `FieldValue` (`serverTimestamp()`, écriture). Zod ne
 * modélise pas proprement les types Firestore — on accepte la perte de
 * type-safety sur ces 2 champs en échange de la simplicité de schéma.
 */

// ─────────────────────────────────────────────────────────────────────
// Helpers de validation
// ─────────────────────────────────────────────────────────────────────

const uid = z.string().min(1).max(128);

/**
 * Code d'invitation 6 caractères — uppercase alphanumérique, sans 0/1/I/O pour
 * éviter les confusions visuelles lors de la dictée à voix haute autour de la
 * table. La génération est faite côté service (4.0.3) ; ici on valide la forme.
 */
export const INVITE_CODE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const inviteCode = z.string().regex(INVITE_CODE_REGEX, 'invite code must be 6 chars from [A-Z2-9] minus [01IO]');

// ─────────────────────────────────────────────────────────────────────
// Sous-objets
// ─────────────────────────────────────────────────────────────────────

/**
 * Variantes 5e (cf. CLAUDE.md decision log). 4 toggles par campagne, défaut
 * `false`. Le wizard, la fiche et la mécanique de repos respectent ces flags.
 */
export const campaignVariantsSchema = z.object({
  featAtLevel1: z.boolean(),
  flanking: z.boolean(),
  slowHealing: z.boolean(),
  grittyRealism: z.boolean(),
});
export type CampaignVariants = z.infer<typeof campaignVariantsSchema>;

export const campaignSettingsSchema = z.object({
  /** Langue par défaut de la table — héritée par les fiches créées en campagne. */
  language: z.enum(['fr', 'en']),
  /** Mode de dés par défaut de la table. Override per-user via users/{uid}.settings.diceMode. */
  diceMode: z.enum(['digital', 'physical']),
  variants: campaignVariantsSchema,
});
export type CampaignSettings = z.infer<typeof campaignSettingsSchema>;

export const campaignStatusSchema = z.enum(['active', 'paused', 'archived']);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

// ─────────────────────────────────────────────────────────────────────
// Schéma principal — campaigns/{cid}
// ─────────────────────────────────────────────────────────────────────

export const CampaignSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(80),
  description: z.string().max(2000),

  /**
   * UIDs des MJ. Min 1 (le créateur). Promotion en co-MJ = `arrayUnion` (4C).
   * Doit toujours contenir `createdBy` au minimum à la création.
   */
  gmIds: z.array(uid).min(1).max(8),
  createdBy: uid,

  inviteCode: inviteCode,

  settings: campaignSettingsSchema,
  status: campaignStatusSchema,

  schemaVersion: z.literal(1),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

/**
 * Valeurs par défaut pour les settings — utilisées par le service lors d'un
 * `createCampaign` qui ne précise pas de settings (cas le plus fréquent V1).
 */
export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  language: 'fr',
  diceMode: 'digital',
  variants: {
    featAtLevel1: false,
    flanking: false,
    slowHealing: false,
    grittyRealism: false,
  },
};

// ─────────────────────────────────────────────────────────────────────
// Schéma membre — campaigns/{cid}/members/{uid}
// ─────────────────────────────────────────────────────────────────────

export const membershipRoleSchema = z.enum(['gm', 'member']);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

/**
 * Un doc par utilisateur dans la campagne. Le doc ID = userId pour permettre
 * un lookup direct `campaigns/{cid}/members/{auth.uid}` côté rules sans index.
 */
export const MembershipSchema = z.object({
  userId: uid,
  role: membershipRoleSchema,
  /**
   * Fiche du joueur en campagne. Optionnel : un membre peut rejoindre avant
   * d'avoir choisi/créé son perso. Les MJ n'ont pas de characterId (le MJ
   * peut pourtant amener un perso d'observation/PNJ — décision déférée).
   */
  characterId: z.string().min(1).max(128).nullable(),
  joinedAt: z.unknown(),

  schemaVersion: z.literal(1),
});
export type Membership = z.infer<typeof MembershipSchema>;

// ─────────────────────────────────────────────────────────────────────
// Schéma de lookup invite — inviteCodes/{code} (collection top-level)
// ─────────────────────────────────────────────────────────────────────

/**
 * Doc de lookup pour résoudre `inviteCode` → `campaignId` sans exposer la
 * collection `campaigns` aux non-membres (cf. firestore.rules — le rule
 * `campaigns/{cid}` ne laisse lire qu'aux GM et membres). Doc ID = code.
 *
 * Créé par le MJ au moment de la création de campagne. Détruit avec la
 * campagne (à câbler dans 4.0.3). En 4.0 V1 le code n'expire pas et n'a
 * pas de `maxUses` — un seul code par campagne, rotation manuelle si
 * fuite suspectée (deferred V1.5+).
 */
export const InviteCodeLookupSchema = z.object({
  code: inviteCode,
  campaignId: z.string().min(1).max(128),
  createdBy: uid,
  createdAt: z.unknown(),
});
export type InviteCodeLookup = z.infer<typeof InviteCodeLookupSchema>;
