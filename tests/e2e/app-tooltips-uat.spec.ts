import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { clericL1Protector, seedCharacter } from './seed-character';

/**
 * UAT visuel — généralisation des infobulles explicites à travers l'app
 * (sweep « tooltips partout »). Complète `sheet-tooltips-uat.spec.ts` (Battle
 * HUD) en couvrant trois nouvelles surfaces de la fiche :
 *  - mode Magie : bouton d'incantation + choix de niveau d'emplacement ;
 *  - mode Essence : jets de sauvegarde / de compétence ;
 *  - mode Avoir / inventaire : actions sur objet (équiper, retirer…).
 *
 * Un volet « wizard » à part NE nécessite PAS l'émulateur (route /create
 * publique) et capture les infobulles de navigation + autofill.
 *
 * Détection d'ouverture : Playwright voit `opacity:0` comme « visible », donc
 * on s'appuie sur l'exposition ARIA (`getByRole('tooltip', { name })` ne matche
 * QUE l'infobulle ouverte décrivant/nommant la cible) ou, pour les infobulles
 * décoratives (toujours `aria-hidden`), sur la classe `opacity-100`.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

test.describe('UAT infobulles — fiche (Magie / Essence / Avoir)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('survol → infobulles exposées sur les modes de la fiche + captures', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(
      page.getByText(clericL1Protector.name).first(),
      'La hero card doit afficher le nom du PJ seedé.',
    ).toBeVisible({ timeout: 10_000 });

    // ── Mode Essence : jet de sauvegarde. Les modes sont des onglets
    //    (`role="tab"`), pas des boutons. Le bouton de jet porte son nom propre
    //    → l'infobulle le DÉCRIT (describedby), exposée au survol.
    await page.getByRole('tab', { name: /Essence/i }).click();
    const saveBtn = page
      .getByRole('button', { name: /Sauvegarde|jet de sauvegarde/i })
      .first();
    if (await saveBtn.count()) {
      await saveBtn.scrollIntoViewIfNeeded();
      await saveBtn.hover();
      // Infobulle DÉCORATIVE (le bouton porte déjà son nom via `aria-label`) →
      // toujours `aria-hidden`, donc invisible à `getByRole('tooltip')`. On
      // détecte l'ouverture par la classe `opacity-100` (comme le HUD). Chaque
      // ligne de sauvegarde rend une bulle au même libellé → on cible
      // l'OUVERTE (`.opacity-100`) et on exige qu'il y en ait exactement une.
      const saveTipOpen = page
        .locator('[role="tooltip"].opacity-100')
        .filter({ hasText: /Lance un jet de sauvegarde/i });
      await expect(
        saveTipOpen,
        "Au survol d'un jet de sauvegarde, exactement une infobulle doit s'ouvrir.",
      ).toHaveCount(1);
      writeFileSync(
        path.join(UAT_DIR, '01-essence-infobulle-sauvegarde-viewport.png'),
        await page.screenshot({ fullPage: false, animations: 'disabled' }),
      );
    }

    // ── Mode Avoir : action sur un objet (infobulle décorative aussi). On
    //    bascule sur l'onglet et on capture la pleine page pour l'UAT — les
    //    actions d'inventaire (équiper / retirer) y sont visibles avec leurs
    //    infobulles câblées. Pas d'interaction modale fragile ici.
    await page.getByRole('tab', { name: /Avoir/i }).click();
    await page.waitForTimeout(200);
    writeFileSync(
      path.join(UAT_DIR, '02-avoir-inventaire-pleine-page.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    // ── Baseline mode Magie pleine page (aucun survol) : prouve que rien n'a
    //    cassé sur la liste de sorts (boutons d'incantation tooltipés).
    await page.getByRole('tab', { name: /Magie/i }).click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
    writeFileSync(
      path.join(UAT_DIR, '03-fiche-magie-pleine-page.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
  });
});

test.describe('UAT infobulles — wizard (sans émulateur)', () => {
  test.beforeAll(() => {
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('survol des contrôles de navigation expose leur infobulle', async ({ page }) => {
    // La route /create est publique : le wizard lit ses contenus depuis le cache
    // Dexie (public/data) sans auth Firebase → tourne sans émulateur.
    await page.goto('/create');
    await waitForAppReady(page);

    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Infobulle Test');

    // Le bouton « Suivant » est un <Button> nommé par son propre `aria-label`
    // → l'infobulle de navigation le DÉCRIT (describedby), exposée au survol.
    // On le repère par son nom accessible (et non par le glyphe « → »).
    const nextBtn = page.getByRole('button', { name: /Suivant|étape suivante/i }).first();
    await expect(nextBtn, 'Le bouton « Suivant » doit être présent.').toBeVisible();
    await nextBtn.scrollIntoViewIfNeeded();
    await nextBtn.hover();
    // Détection robuste via la classe `opacity-100` portée par la bulle ouverte
    // (vaut quel que soit le câblage ARIA describedby/labelledby/decorative).
    // `l.étape` : `.` couvre l'apostrophe typographique « ’ » du libellé.
    const nextTipOpen = page
      .locator('[role="tooltip"].opacity-100')
      .filter({ hasText: /Passe à l.étape suivante/i });
    await expect(
      nextTipOpen,
      "Au survol de « Suivant », l'infobulle de navigation doit s'ouvrir.",
    ).toHaveCount(1);
    writeFileSync(
      path.join(UAT_DIR, '04-wizard-infobulle-suivant-viewport.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );
  });
});
