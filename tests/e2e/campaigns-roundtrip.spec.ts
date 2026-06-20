import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * JALON 4.0.6 — e2e roundtrip create → invite → join + UAT captures.
 *
 * Premier flow multi-utilisateur du projet. On instancie 2 `BrowserContext`
 * indépendants → 2 IndexedDB / Auth states distincts → 2 UIDs anonymes
 * différents côté émulateur Firebase Auth. Chaque contexte est un viewport
 * desktop 1440×900 (on évite ici l'émulation Pixel 7 par défaut du projet —
 * roundtrip = ressenti desktop ; les rendus mobile/tablet sont déjà couverts
 * par les UAT 4.0.4 / 4.0.5).
 *
 * Séquence :
 *   1. DM ouvre `/campaigns`, crée une campagne via la modale.
 *   2. DM ouvre `/campaigns/:cid`, on capture le code d'invitation rendu
 *      dans `InviteCodeReveal`.
 *   3. Player ouvre `/campaigns/join` (fresh context), saisit le code, submit.
 *   4. Player est redirigé vers `/campaigns/:cid` — roster 2 entrées (gm + toi).
 *   5. DM `reload()` (hook one-shot, pas d'onSnapshot) — voit le joueur.
 *   6. Player ouvre `/campaigns` — la carte apparaît avec chip « Joueur ».
 *
 * Captures écrites dans `uat-review/jalon-4/4.0.6/` (gitignored, cf. règle
 * « captures UAT par commit » dans CLAUDE.md). Pas de modale exposée dans
 * ce parcours → uniquement des captures `fullPage: true`.
 *
 * Skip propre si l'émulateur Firestore n'est pas joignable (Java/JRE absent
 * en local). Pas de faux-vert silencieux : le `test.skip` est visible dans
 * le reporter Playwright.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-4/4.0.6');

const CAMPAIGN_NAME = "L'Auberge du Dernier Souffle";
const CAMPAIGN_DESC =
  "Une caravane disparue, un relais isolé sous la neige et des traces qui ne mènent nulle part.";

// Cohérent avec INVITE_CODE_REGEX (cf. `@/shared/types/campaign`, source de
// vérité Zod 4.0.1). On le re-dérive ici pour ne pas importer du code applicatif
// dans une spec e2e (la dépendance d'import alourdirait le test runner).
const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

/**
 * Crée un BrowserContext desktop 1440×900 propre. Chaque context = fresh
 * IndexedDB → fresh auth anon → UID distinct côté émulateur.
 */
async function newDesktopContext(
  browser: import('@playwright/test').Browser,
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1440, height: 900 },
    // On reste sur des defaults non-touch (pas d'émulation mobile) pour le
    // roundtrip — les UAT mobile sont déjà livrés en 4.0.4 / 4.0.5.
  });
}

test.describe('JALON 4.0.6 — roundtrip create → invite → join', () => {
  test('DM crée, Player rejoint via code, roster cohérent des 2 côtés', async ({
    browser,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(
      !reachable,
      'Émulateur Firestore non joignable — roundtrip 4.0.6 skippé.',
    );

    // ──────────────────────────────────────────────────────────────────
    // DM — contexte A : crée la campagne, ouvre le détail, capture le code
    // ──────────────────────────────────────────────────────────────────
    const dmCtx = await newDesktopContext(browser);
    const dm = await dmCtx.newPage();

    try {
      await dm.goto('/campaigns');
      await waitForAppReady(dm);

      // Crée la campagne via la modale Create.
      await dm
        .getByRole('button', { name: /Créer une campagne/i })
        .first()
        .click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await dm.getByLabel(/Nom de la campagne/i).fill(CAMPAIGN_NAME);
      await dm.getByLabel(/Description/i).fill(CAMPAIGN_DESC);
      await dm.getByRole('button', { name: /^Créer$/ }).click();
      await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

      // Ouvre le détail via la carte fraîchement créée.
      await dm.getByRole('button', { name: /Ouvrir/i }).first().click();
      await expect(
        dm.getByRole('heading', { name: CAMPAIGN_NAME }),
      ).toBeVisible();
      await expect(dm.getByText(/Inviter à la table/i)).toBeVisible();

      // Extraction du code d'invitation rendu par InviteCodeReveal. Le `<p>`
      // dédié porte `aria-label="Code d'invitation à dicter ou copier"`
      // (cf. `invite-code-reveal.tsx`). On lit son textContent directement —
      // c'est l'API la plus stable car le sélecteur s'aligne sur l'attribut
      // d'accessibilité et non sur la classe CSS.
      const codeNode = dm.locator('p[aria-label*="dicter ou copier"]');
      await expect(codeNode).toBeVisible();
      const rawCode = (await codeNode.textContent()) ?? '';
      const inviteCode = rawCode.trim();
      expect(
        inviteCode,
        `Le code d'invitation rendu doit matcher INVITE_CODE_REGEX (Zod 4.0.1). Reçu: "${inviteCode}".`,
      ).toMatch(INVITE_CODE_PATTERN);

      await captureFull(dm, '01-dm-detail-with-invite.png');

      // ────────────────────────────────────────────────────────────────
      // Player — contexte B : fresh UID anon, rejoint via code
      // ────────────────────────────────────────────────────────────────
      const playerCtx = await newDesktopContext(browser);
      const player = await playerCtx.newPage();

      try {
        await player.goto('/campaigns/join');
        await waitForAppReady(player);
        await expect(
          player.getByRole('heading', { name: /Rejoindre une campagne/i }),
        ).toBeVisible();
        await captureFull(player, '02-player-join-empty.png');

        // Saisie du code — pas de normalisation manuelle, le screen le fait
        // (uppercase + strip espaces). On envoie le code tel quel pour
        // exercer un input "propre".
        await player.getByLabel(/Code d['']invitation/i).fill(inviteCode);
        await captureFull(player, '03-player-join-after-typing.png');

        // Submit → joinByCode → redirect vers /campaigns/:cid.
        await player.getByRole('button', { name: 'Rejoindre' }).click();

        // L'arrivée sur le détail confirme : code valide → joinByCode OK →
        // redirect → CampaignDetailScreen rendu avec le titre.
        await expect(
          player.getByRole('heading', { name: CAMPAIGN_NAME }),
        ).toBeVisible({ timeout: 15_000 });

        // Le joueur N'EST PAS MJ → pas de bloc « Inviter à la table ».
        await expect(player.getByText(/Inviter à la table/i)).toHaveCount(0);

        // Roster côté player : 2 entrées exactement (le MJ + lui-même).
        const playerRoster = player.locator(
          'section[aria-label="Membres de la campagne"] ul li',
        );
        await expect(playerRoster).toHaveCount(2);
        // Le marqueur (toi) cible la ligne du player connecté — cf.
        // `RosterRow` qui rend `t('campaigns.detail.roster.youSuffix')`.
        await expect(player.getByText('(toi)')).toBeVisible();
        await captureFull(player, '04-player-detail-after-join.png');

        // ──────────────────────────────────────────────────────────────
        // DM — reload : hook useCampaign est one-shot (cf. 4.0.5 doc).
        // ──────────────────────────────────────────────────────────────
        await dm.reload();
        await waitForAppReady(dm);
        await expect(
          dm.getByRole('heading', { name: CAMPAIGN_NAME }),
        ).toBeVisible();

        const dmRoster = dm.locator(
          'section[aria-label="Membres de la campagne"] ul li',
        );
        await expect(dmRoster).toHaveCount(2);
        // Côté DM, le badge "(toi)" cible SA propre ligne — il n'apparaît
        // qu'une fois (le MJ, pas le joueur).
        await expect(dm.getByText('(toi)')).toHaveCount(1);
        await captureFull(dm, '05-dm-detail-after-join.png');

        // ──────────────────────────────────────────────────────────────
        // Player /campaigns — carte présente avec chip « Joueur »
        // ──────────────────────────────────────────────────────────────
        await player.goto('/campaigns');
        await waitForAppReady(player);
        await expect(player.getByText(CAMPAIGN_NAME)).toBeVisible();
        // Chip rôle = « Joueur » (cf. `campaigns.card.roleMember`). Le MJ
        // verrait « Meneur » à la place.
        await expect(player.getByText('Joueur').first()).toBeVisible();
        await captureFull(player, '06-player-campaigns-list-with-card.png');
      } finally {
        await playerCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });
});
