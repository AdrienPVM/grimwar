import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
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
    // physique). On récupère l'uid anonyme + l'id de fiche.
    const { uid, charId } = await seedCharacter(page, fighterL3, { diceMode: 'digital' });

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
    await expect(page.getByText(new RegExp(fighterL3.name, 'i')).first()).toBeVisible({
      timeout: 15_000,
    });

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
