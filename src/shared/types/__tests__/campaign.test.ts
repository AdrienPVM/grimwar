import { describe, expect, it } from 'vitest';

import {
  CampaignSchema,
  DEFAULT_CAMPAIGN_SETTINGS,
  INVITE_CODE_REGEX,
  InviteCodeLookupSchema,
  MembershipSchema,
  campaignSettingsSchema,
  campaignStatusSchema,
  campaignVariantsSchema,
  membershipRoleSchema,
} from '../campaign';

// ─────────────────────────────────────────────────────────────────────
// Tests JALON 4.0.1 — Schémas Campaign + Membership + InviteCodeLookup.
//
// Couvre :
//  1. Campagne minimale valide → parse OK
//  2. gmIds = [] → rejet (min 1)
//  3. inviteCode hors regex (lowercase, longueur, caractères interdits 0/1/I/O) → rejet
//  4. Settings variants : 4 booléens requis
//  5. Membership : rôle gm vs member
//  6. Membership.characterId nullable
//  7. InviteCodeLookup : code + campaignId requis
//  8. Constantes par défaut (DEFAULT_CAMPAIGN_SETTINGS) consistantes
// ─────────────────────────────────────────────────────────────────────

const fakeTimestamp = { seconds: 1733457600, nanoseconds: 0 };
const validUid = 'user_abc123XYZ';
const validInviteCode = 'KTL4M2';

const minimalCampaign = {
  id: 'cmp_abc123',
  name: 'La marche des cendres',
  description: 'Une campagne sombre dans les ruines du royaume oublié.',
  gmIds: [validUid],
  createdBy: validUid,
  inviteCode: validInviteCode,
  settings: DEFAULT_CAMPAIGN_SETTINGS,
  status: 'active' as const,
  schemaVersion: 1 as const,
  createdAt: fakeTimestamp,
  updatedAt: fakeTimestamp,
};

describe('CampaignSchema — happy path', () => {
  it('parse une campagne minimale valide', () => {
    const result = CampaignSchema.safeParse(minimalCampaign);
    expect(result.success).toBe(true);
  });

  it('accepte une campagne avec 3 MJ (co-MJ multiples)', () => {
    const result = CampaignSchema.safeParse({
      ...minimalCampaign,
      gmIds: [validUid, 'user_def456', 'user_ghi789'],
    });
    expect(result.success).toBe(true);
  });

  it('accepte une description vide (campagne nouvellement créée)', () => {
    const result = CampaignSchema.safeParse({ ...minimalCampaign, description: '' });
    expect(result.success).toBe(true);
  });
});

describe('CampaignSchema — rejets attendus', () => {
  it('rejette gmIds = [] (min 1 requis)', () => {
    const result = CampaignSchema.safeParse({ ...minimalCampaign, gmIds: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['gmIds']);
    }
  });

  it('rejette gmIds > 8 (anti-explosion future)', () => {
    const result = CampaignSchema.safeParse({
      ...minimalCampaign,
      gmIds: Array.from({ length: 9 }, (_, i) => `user_${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('rejette name vide', () => {
    const result = CampaignSchema.safeParse({ ...minimalCampaign, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejette name > 80 caractères', () => {
    const result = CampaignSchema.safeParse({
      ...minimalCampaign,
      name: 'a'.repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it('rejette description > 2000 caractères', () => {
    const result = CampaignSchema.safeParse({
      ...minimalCampaign,
      description: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejette schemaVersion ≠ 1 (literal)', () => {
    const result = CampaignSchema.safeParse({ ...minimalCampaign, schemaVersion: 2 });
    expect(result.success).toBe(false);
  });

  it('rejette status hors enum', () => {
    const result = CampaignSchema.safeParse({ ...minimalCampaign, status: 'deleted' });
    expect(result.success).toBe(false);
  });
});

describe('inviteCode — regex de format', () => {
  it('accepte 6 chars uppercase [A-Z2-9] sans 0/1/I/O', () => {
    expect(INVITE_CODE_REGEX.test('KTL4M2')).toBe(true);
    expect(INVITE_CODE_REGEX.test('ABCDEF')).toBe(true);
    expect(INVITE_CODE_REGEX.test('234567')).toBe(true);
    expect(INVITE_CODE_REGEX.test('ZYXWVU')).toBe(true);
  });

  it('rejette 0 (zero) — confusable avec O', () => {
    expect(INVITE_CODE_REGEX.test('KTL402')).toBe(false);
  });

  it('rejette 1 (un) — confusable avec I et L', () => {
    expect(INVITE_CODE_REGEX.test('KTL412')).toBe(false);
  });

  it('rejette I (i majuscule) — confusable avec 1', () => {
    expect(INVITE_CODE_REGEX.test('KTLIM2')).toBe(false);
  });

  it('rejette O (o majuscule) — confusable avec 0', () => {
    expect(INVITE_CODE_REGEX.test('KTLOM2')).toBe(false);
  });

  it('rejette lowercase', () => {
    expect(INVITE_CODE_REGEX.test('ktl4m2')).toBe(false);
  });

  it('rejette longueur ≠ 6', () => {
    expect(INVITE_CODE_REGEX.test('KTL4M')).toBe(false);
    expect(INVITE_CODE_REGEX.test('KTL4M22')).toBe(false);
    expect(INVITE_CODE_REGEX.test('')).toBe(false);
  });

  it('CampaignSchema rejette inviteCode invalide', () => {
    const result = CampaignSchema.safeParse({ ...minimalCampaign, inviteCode: 'ktl4m2' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['inviteCode']);
    }
  });
});

describe('campaignSettingsSchema — variants', () => {
  it('exige les 4 booléens de variants', () => {
    const result = campaignVariantsSchema.safeParse({
      featAtLevel1: true,
      flanking: false,
      // slowHealing manquant
      grittyRealism: false,
    });
    expect(result.success).toBe(false);
  });

  it('accepte les 4 false (défaut)', () => {
    const result = campaignVariantsSchema.safeParse({
      featAtLevel1: false,
      flanking: false,
      slowHealing: false,
      grittyRealism: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejette une langue hors fr/en', () => {
    const result = campaignSettingsSchema.safeParse({
      ...DEFAULT_CAMPAIGN_SETTINGS,
      language: 'es',
    });
    expect(result.success).toBe(false);
  });

  it('rejette un diceMode hors digital/physical', () => {
    const result = campaignSettingsSchema.safeParse({
      ...DEFAULT_CAMPAIGN_SETTINGS,
      diceMode: 'electric',
    });
    expect(result.success).toBe(false);
  });
});

describe('campaignStatusSchema', () => {
  it('accepte active / paused / archived', () => {
    expect(campaignStatusSchema.safeParse('active').success).toBe(true);
    expect(campaignStatusSchema.safeParse('paused').success).toBe(true);
    expect(campaignStatusSchema.safeParse('archived').success).toBe(true);
  });
});

describe('DEFAULT_CAMPAIGN_SETTINGS', () => {
  it('parse contre campaignSettingsSchema', () => {
    const result = campaignSettingsSchema.safeParse(DEFAULT_CAMPAIGN_SETTINGS);
    expect(result.success).toBe(true);
  });

  it('défaut FR + digital + tous variants false', () => {
    expect(DEFAULT_CAMPAIGN_SETTINGS.language).toBe('fr');
    expect(DEFAULT_CAMPAIGN_SETTINGS.diceMode).toBe('digital');
    expect(DEFAULT_CAMPAIGN_SETTINGS.variants.featAtLevel1).toBe(false);
    expect(DEFAULT_CAMPAIGN_SETTINGS.variants.flanking).toBe(false);
    expect(DEFAULT_CAMPAIGN_SETTINGS.variants.slowHealing).toBe(false);
    expect(DEFAULT_CAMPAIGN_SETTINGS.variants.grittyRealism).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Membership
// ─────────────────────────────────────────────────────────────────────

const minimalMembership = {
  userId: validUid,
  role: 'member' as const,
  characterId: 'char_xyz789',
  joinedAt: fakeTimestamp,
  schemaVersion: 1 as const,
};

describe('MembershipSchema', () => {
  it('parse un membership joueur avec character', () => {
    const result = MembershipSchema.safeParse(minimalMembership);
    expect(result.success).toBe(true);
  });

  it('parse un membership MJ sans character', () => {
    const result = MembershipSchema.safeParse({
      ...minimalMembership,
      role: 'gm',
      characterId: null,
    });
    expect(result.success).toBe(true);
  });

  it('parse un membership joueur en attente de fiche (characterId null)', () => {
    const result = MembershipSchema.safeParse({
      ...minimalMembership,
      characterId: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejette un rôle hors enum gm/member', () => {
    const result = MembershipSchema.safeParse({
      ...minimalMembership,
      role: 'spectator',
    });
    expect(result.success).toBe(false);
  });

  it('rejette schemaVersion ≠ 1', () => {
    const result = MembershipSchema.safeParse({
      ...minimalMembership,
      schemaVersion: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejette userId vide', () => {
    const result = MembershipSchema.safeParse({ ...minimalMembership, userId: '' });
    expect(result.success).toBe(false);
  });
});

describe('membershipRoleSchema', () => {
  it('accepte gm et member uniquement', () => {
    expect(membershipRoleSchema.safeParse('gm').success).toBe(true);
    expect(membershipRoleSchema.safeParse('member').success).toBe(true);
    expect(membershipRoleSchema.safeParse('dm').success).toBe(false);
    expect(membershipRoleSchema.safeParse('player').success).toBe(false);
    expect(membershipRoleSchema.safeParse('spectator').success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// InviteCodeLookup
// ─────────────────────────────────────────────────────────────────────

describe('InviteCodeLookupSchema', () => {
  it('parse un lookup valide', () => {
    const result = InviteCodeLookupSchema.safeParse({
      code: validInviteCode,
      campaignId: 'cmp_abc123',
      createdBy: validUid,
      createdAt: fakeTimestamp,
    });
    expect(result.success).toBe(true);
  });

  it('rejette un code hors regex', () => {
    const result = InviteCodeLookupSchema.safeParse({
      code: 'ABC',
      campaignId: 'cmp_abc123',
      createdBy: validUid,
      createdAt: fakeTimestamp,
    });
    expect(result.success).toBe(false);
  });

  it('rejette un campaignId vide', () => {
    const result = InviteCodeLookupSchema.safeParse({
      code: validInviteCode,
      campaignId: '',
      createdBy: validUid,
      createdAt: fakeTimestamp,
    });
    expect(result.success).toBe(false);
  });
});
