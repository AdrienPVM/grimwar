import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL1MasteryDefense,
  fighterL3,
  readCampaignEvents,
  seedCampaignMembership,
  seedCharacter,
} from './seed-character';

/**
 * Plan 22 (JALON 22.1) — auto-log des jets dans la campagne active.
 *
 * Le foundation event-logger n'a PAS d'UI lecteur (le dashboard MJ est plan 21).
 * On le vérifie donc de bout en bout : un joueur dont la fiche est liée à une
 * campagne lance un jet depuis sa fiche → un événement `roll` apparaît dans
 * `campaigns/{cid}/events` (relu en Admin SDK), contre les VRAIES rules
 * Firestore chargées dans l'émulateur.
 *
 * Chaîne exercée : `useSyncActiveCampaign(homeCampaignId)` (écran de fiche)
 * → store campagne active → `logRollIfCampaign` (pivot de dés) → write
 * autorisé par la rule `events.create` (membre, actorUserId == uid,
 * createdAt == request.time).
 *
 * Skip propre si l'émulateur n'est pas joignable (Java absent) — pas de
 * faux-vert silencieux.
 */

test.describe('JALON 22.1 — auto-log des jets sur fiche liée', () => {
  test('un jet sur une fiche liée écrit un événement roll dans la campagne', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — 22.1 skippé.');

    await page.goto('/');
    await waitForAppReady(page);

    // Fiche seedée en mode digital (le jet doit partir sans modale de saisie
    // physique). On récupère l'uid anonyme + l'id de fiche. Preset déjà en
    // schemaVersion 2 : pas de migration v1 → v2 au chargement, donc pas de
    // cascade de re-render qui pourrait laisser la campagne active transitoirement
    // nulle (flake observé en 22.2 — cf. plans/DEBT.md > D27).
    const { uid, charId } = await seedCharacter(page, fighterL1MasteryDefense, {
      diceMode: 'digital',
    });

    // Contexte de jeu : campagne + membership + lien fiche (Admin SDK).
    const cid = `evt-camp-${uid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid: `gm-${uid}`,
      playerUid: uid,
      charId,
    });

    // Avant tout jet : aucun événement (ancre « rouge avant vert »).
    expect(await readCampaignEvents(cid)).toHaveLength(0);

    // Ouvre la fiche → useSyncActiveCampaign fixe la campagne active.
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await expect(
      page.getByText(new RegExp(fighterL1MasteryDefense.name, 'i')).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Mode Essence → lance un jet de sauvegarde (digital → part immédiatement).
    await page.locator('#sheet-mode-tab-essence').click();
    const saveBtn = page.getByRole('button', { name: /Jet de sauvegarde/i }).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Le write est asynchrone : on relit la sous-collection jusqu'à voir l'event.
    await expect
      .poll(async () => (await readCampaignEvents(cid)).length, {
        timeout: 15_000,
        message: 'aucun événement écrit dans campaigns/{cid}/events',
      })
      .toBeGreaterThanOrEqual(1);

    const events = await readCampaignEvents(cid);
    const roll = events.find((e) => e.kind === 'roll');
    expect(roll, 'un événement de kind "roll" est attendu').toBeTruthy();
    expect(roll?.actorUserId).toBe(uid);
    expect(roll?.actorCharacterId).toBe(charId);
    expect(roll?.visibility).toBe('all');
    const payload = roll?.payload as Record<string, unknown> | undefined;
    expect(payload?.mode).toBe('digital');
    expect(typeof payload?.total).toBe('number');
  });
});

/**
 * Plan 22.2 — auto-log du DIFF de fiche. Un dégât appliqué depuis la carte PV
 * du mode Combat patche `hp.current` → `useUpdateCharacter` diffe et écrit un
 * événement `hp-change` (best-effort, no-op hors campagne). On le vérifie de
 * bout en bout contre les vraies rules de l'émulateur, faute de lecteur UI.
 *
 * Preset en schemaVersion 2 (`fighterL1MasteryDefense`) à dessein : un preset
 * v1 déclenche la migration v1 → v2 (setDoc plein fire-and-forget) au
 * chargement, dont la cascade de re-render rejoue l'effet `useSyncActiveCampaign`
 * et laisse une fenêtre où la campagne active est transitoirement nulle (flake
 * observé : le diff de dégât écrit alors no-op). Un preset déjà v2 = un seul
 * snapshot stable ⇒ campagne active fixée de façon déterministe.
 */
test.describe('JALON 22.2 — auto-log du diff de fiche (PV) sur fiche liée', () => {
  test('un dégât sur une fiche liée écrit un événement hp-change', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — 22.2 skippé.');

    await page.goto('/');
    await waitForAppReady(page);

    const { uid, charId } = await seedCharacter(page, fighterL1MasteryDefense, {
      diceMode: 'digital',
    });

    const cid = `evt2-camp-${uid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid: `gm-${uid}`,
      playerUid: uid,
      charId,
    });

    expect(await readCampaignEvents(cid)).toHaveLength(0);

    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await expect(
      page.getByText(new RegExp(fighterL1MasteryDefense.name, 'i')).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Mode Combat → la carte PV. Un tap court sur « − » applique −1 dégât.
    await page.locator('#sheet-mode-tab-combat').click();
    const minusBtn = page.getByRole('button', { name: /Subir 1 dégât/i });
    await expect(minusBtn).toBeVisible();
    await minusBtn.click();

    await expect
      .poll(
        async () => (await readCampaignEvents(cid)).filter((e) => e.kind === 'hp-change').length,
        { timeout: 15_000, message: 'aucun événement hp-change écrit' },
      )
      .toBeGreaterThanOrEqual(1);

    const hpChange = (await readCampaignEvents(cid)).find((e) => e.kind === 'hp-change');
    expect(hpChange?.actorUserId).toBe(uid);
    expect(hpChange?.actorCharacterId).toBe(charId);
    expect(hpChange?.visibility).toBe('all');
    const payload = hpChange?.payload as Record<string, unknown> | undefined;
    expect(payload?.reason).toBe('damage');
    expect(payload?.delta).toBe(-1);
    expect(payload?.after).toBe((payload?.before as number) - 1);
  });
});

/**
 * D27 — garde-fou de la CAUSE RACINE (cf. `plans/DEBT.md > D27`).
 *
 * Les deux tests ci-dessus utilisent un preset déjà v2 pour rester
 * déterministes. Ce test-ci prend au contraire un preset **v1**
 * (`fighterL3`, sans `ancestrySubChoices` ⇒ seedé en `schemaVersion: 1`) : son
 * chargement déclenche la migration v1 → v2 (`setDoc` plein fire-and-forget)
 * dont la cascade de re-render rejouait l'effet `useSyncActiveCampaign` et
 * laissait `activeCampaignId` transitoirement nul. Avant le fix D27, un jet
 * tombant dans cette fenêtre était perdu (`writeEvent` no-op). Depuis le fix
 * (nettoyage de la campagne active au démontage RÉEL uniquement + état
 * `undefined` = « préserver »), le jet DOIT être journalisé malgré la
 * migration. C'est l'ancre e2e qui retire à D27 son statut de « contournement
 * de test ».
 */
test.describe('JALON 22 — D27 : auto-log résiste à la migration v1 → v2', () => {
  test('un jet sur une fiche v1 (migrée au chargement) écrit quand même un event roll', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — D27 skippé.');

    await page.goto('/');
    await waitForAppReady(page);

    // Preset v1 → migration v1 → v2 au chargement de la fiche.
    const { uid, charId } = await seedCharacter(page, fighterL3, {
      diceMode: 'digital',
    });

    const cid = `evt-d27-camp-${uid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid: `gm-${uid}`,
      playerUid: uid,
      charId,
    });

    expect(await readCampaignEvents(cid)).toHaveLength(0);

    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await expect(
      page.getByText(new RegExp(fighterL3.name, 'i')).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Mode Essence → jet de sauvegarde (digital → part immédiatement).
    await page.locator('#sheet-mode-tab-essence').click();
    const saveBtn = page.getByRole('button', { name: /Jet de sauvegarde/i }).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect
      .poll(async () => (await readCampaignEvents(cid)).length, {
        timeout: 15_000,
        message: 'jet perdu pendant la fenêtre de migration (régression D27)',
      })
      .toBeGreaterThanOrEqual(1);

    const roll = (await readCampaignEvents(cid)).find((e) => e.kind === 'roll');
    expect(roll, 'un événement de kind "roll" est attendu malgré la migration').toBeTruthy();
    expect(roll?.actorUserId).toBe(uid);
    expect(roll?.actorCharacterId).toBe(charId);
  });
});
