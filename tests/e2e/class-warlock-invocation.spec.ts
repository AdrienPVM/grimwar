import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import {
  seedCharacter,
  warlockL1ArmorOfShadows,
  warlockL1MultiInvocations,
  warlockL1PactOfTheBlade,
  warlockL1PactOfTheChain,
  warlockL1PactOfTheTome,
} from './seed-character';

/**
 * Class Warlock — render Essence de la Manifestation occulte (plan 13.9
 * commit 4e). Parité avec `essence-clerc.spec.ts` (Divine Order) — un sous-
 * choix de classe posé au wizard se retrouve visible et cliquable sur la
 * fiche, modale d'identité s'ouvre + se ferme proprement (Échap + backdrop).
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`). Sans
 * émulateur, le test skip proprement (pas de faux-vert silencieux).
 *
 * Couverture des 6 catégories « Vérité du contenu » au niveau e2e :
 *   - Cat. 2 (identité) : le name + summary affichés sont EXACTEMENT le
 *     contenu du bundle pour le slug seedé, jamais un autre.
 *   - Cat. 5 (cohérence wizard → fiche) : le slug posé au seed
 *     (`armor-of-shadows`) rend EXACTEMENT « Armure d'ombres ».
 *   - Cat. 6 (cas-limite) : test multi-invocations dédié, ordre alphabétique
 *     FR stable, pas de duplication, ouverture de chaque modale isolée.
 *
 * Captures uat-review/ par helper `takeStepScreenshot` — la modale est
 * capturée en double (fullPage + viewport-only) pour permettre la
 * validation du ressenti d'overlay (acté 2026-05-20).
 */
test.describe('Class Warlock — render Essence (manifestation occulte + modale)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping class-warlock-invocation.',
    );
  });

  test("Warlock L1 Armure d'ombres → Essence → tap carte → modale identité (cat. 2 + 5)", async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, warlockL1ArmorOfShadows);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(warlockL1ArmorOfShadows.name).first(),
      'Hero card doit afficher le nom du Warlock seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, 'sheet-loaded');

    // Switch Essence.
    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel, 'Panel Essence doit être rendu.').toBeVisible();
    await takeStepScreenshot(page, testInfo, 'essence-tab');

    // Card « Manifestations occultes » header présent.
    await expect(
      panel.getByText(/^Manifestations occultes$/),
      'Header de la carte Manifestations occultes doit être présent.',
    ).toBeVisible();

    // Carte cliquable : aria-label exact (cat. 5 — cohérence wizard → fiche).
    const trigger = page.getByRole('button', {
      name: "Manifestation occulte : Armure d'ombres",
    });
    await expect(
      trigger,
      "Carte Manifestation occulte : Armure d'ombres doit être un bouton cliquable.",
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'invocations-card');

    // Tap → modale ouverte (cat. 2 — identité contre bundle).
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog,
      'Modale détail Manifestation occulte doit s\'ouvrir au tap.',
    ).toBeVisible();
    await expect(
      dialog.getByText('Manifestation occulte', { exact: true }),
      'kindLabel « Manifestation occulte » doit être présent dans le header de la modale.',
    ).toBeVisible();
    await expect(
      dialog.getByText("Armure d'ombres", { exact: true }),
      "Le name FR du bundle doit être rendu dans le titre de la modale.",
    ).toBeVisible();
    // Premier morceau du summary FR du bundle (« Vous pouvez lancer Armure du mage… »).
    await expect(
      dialog.getByText(/Vous pouvez lancer Armure du mage/),
      "Le summary FR exact du bundle pour `armor-of-shadows` doit être rendu.",
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'invocation-modal-open');
    // Double capture viewport pour le ressenti d'overlay (acté 2026-05-20).
    await takeStepScreenshot(page, testInfo, 'invocation-modal-open', {
      viewport: true,
    });

    // Échap → ferme la modale (parité a11y Order modal + SpellDetailModal 4d).
    await page.keyboard.press('Escape');
    await expect(dialog, 'Échap doit fermer la modale.').toBeHidden();
    await takeStepScreenshot(page, testInfo, 'invocation-modal-closed');
  });

  test('Cat. 6 — Warlock L1 multi-invocations → 2 cartes rendues, ordre alphabétique FR, modales isolées', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, warlockL1MultiInvocations);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(warlockL1MultiInvocations.name).first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    // Les 2 invocations sont rendues, ordre alphabétique FR (Armure < Esprit).
    const armor = page.getByRole('button', {
      name: "Manifestation occulte : Armure d'ombres",
    });
    const mind = page.getByRole('button', {
      name: 'Manifestation occulte : Esprit occulte',
    });
    await expect(armor).toBeVisible();
    await expect(mind).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'multi-invocations-card');

    // Modale Esprit occulte : identité contre bundle isolée — pas de fuite
    // du summary d'Armure d'ombres dans la modale ouverte.
    await mind.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('Esprit occulte', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Avantage aux jets de sauvegarde de Constitution/),
      "Summary FR exact d'eldritch-mind doit être rendu, pas celui d'armor-of-shadows.",
    ).toBeVisible();
    const dialogText = (await dialog.textContent()) ?? '';
    expect(
      dialogText,
      "Aucune fuite du summary d'armor-of-shadows dans la modale d'eldritch-mind.",
    ).not.toMatch(/Vous pouvez lancer Armure du mage/);

    // D13b — section structurée « Mécanique » présente avec le label canonique.
    await expect(
      dialog.getByText('Mécanique', { exact: true }),
      "Section « Mécanique » doit être présente pour eldritch-mind (D13b câblé).",
    ).toBeVisible();
    await expect(
      dialog.getByTestId('invocation-effect-label'),
      "Le label canonique du moteur D13b doit être présent.",
    ).toHaveText(
      /Avantage aux jets de Constitution pour la Concentration/,
    );
    await takeStepScreenshot(page, testInfo, 'mind-modal-open');
    await takeStepScreenshot(page, testInfo, 'mind-modal-open', {
      viewport: true,
    });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test("D13c — Warlock L1 Pacte de la lame → modale Mécanique 4 lignes structurées + caveat différé", async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, warlockL1PactOfTheBlade);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(warlockL1PactOfTheBlade.name).first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    const trigger = page.getByRole('button', {
      name: 'Manifestation occulte : Pacte de la lame',
    });
    await expect(trigger).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'essence-pact-of-the-blade');

    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // D13c — la mécanique est rendue structurée (label + 4 lignes + caveat).
    await expect(dialog.getByText('Mécanique', { exact: true })).toBeVisible();
    await expect(dialog.getByTestId('invocation-effect-label')).toHaveText(
      /Arme de pacte invoquée/,
    );
    await expect(
      dialog.getByText(/Action bonus pour invoquer ou rappeler l'arme de pacte\./),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Vous pouvez utiliser votre modificateur de Charisme/),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        /Type de dégâts au choix : nécrotiques, psychiques, radiants/,
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/intégration moteur de combat est différée/),
    ).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'pact-blade-modal-open');
    await takeStepScreenshot(page, testInfo, 'pact-blade-modal-open', {
      viewport: true,
    });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test("D13d — Warlock L1 Pacte de la chaîne → modale Mécanique 3 lignes structurées + caveat différé", async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, warlockL1PactOfTheChain);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(warlockL1PactOfTheChain.name).first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    const trigger = page.getByRole('button', {
      name: 'Manifestation occulte : Pacte de la chaîne',
    });
    await expect(trigger).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'essence-pact-of-the-chain');

    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('Mécanique', { exact: true })).toBeVisible();
    await expect(dialog.getByTestId('invocation-effect-label')).toHaveText(
      /Appel de familier amélioré/,
    );
    await expect(
      dialog.getByText(/Action magique pour lancer Appel de familier/),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        /Formes spéciales au choix : Démon mineur, Pseudodragon, Quasit, ou Sprite/,
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Profils complets disponibles dans le bestiaire des invocations/),
    ).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'pact-chain-modal-open');
    await takeStepScreenshot(page, testInfo, 'pact-chain-modal-open', {
      viewport: true,
    });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test("D13e — Warlock L1 Pacte du grimoire → modale Mécanique 3 lignes structurées + caveat différé", async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, warlockL1PactOfTheTome);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(warlockL1PactOfTheTome.name).first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    const trigger = page.getByRole('button', {
      name: 'Manifestation occulte : Pacte du grimoire',
    });
    await expect(trigger).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'essence-pact-of-the-tome');

    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText('Mécanique', { exact: true })).toBeVisible();
    await expect(dialog.getByTestId('invocation-effect-label')).toHaveText(
      /Codex des Ombres/,
    );
    await expect(
      dialog.getByText(/Apprenez 3 sorts mineurs/),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Apprenez 2 sorts du 1ᵉʳ niveau marqués « Rituel »/),
    ).toBeVisible();
    await expect(
      dialog.getByText(/focaliseur d'incantation/),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Choisissez vos 5 sorts avec votre MJ/),
    ).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'pact-tome-modal-open');
    await takeStepScreenshot(page, testInfo, 'pact-tome-modal-open', {
      viewport: true,
    });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
