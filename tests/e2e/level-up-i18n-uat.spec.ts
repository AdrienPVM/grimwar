import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3MulticlassReady, seedCharacter } from './seed-character';

/**
 * Galerie UAT de la passe i18n de la modale de montée de niveau / ajout de
 * classe. NON une gate (le contenu est garanti par les tests unitaires + le
 * garde-fou `level-up-i18n-sweep`) — juste de quoi qu'Adrien valide d'un coup
 * d'œil que le FR est resté visuellement identique après l'extraction `t()`.
 *
 * La locale EN n'a pas de bascule in-app (différée S5) : on capture donc le FR
 * (byte-identique à l'avant-passe). Le rendu EN est prouvé par le test unitaire
 * `level-up-i18n-sweep.test.tsx`.
 *
 * Chaque modale est capturée en pleine page (contenu exhaustif) ET en viewport
 * (ressenti d'overlay), conformément à la règle UAT modale du CLAUDE.md.
 */

const UAT_DIR = path.resolve('uat-review');

async function shoot(page: Page, name: string): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(UAT_DIR, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
  await page.screenshot({
    path: path.join(UAT_DIR, `${name}-viewport.png`),
    fullPage: false,
    animations: 'disabled',
  });
}

test.describe('UAT i18n montée de niveau', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators`.',
    );
  });

  test('captures FR — montée de niveau (PV + ASI) et ajout de classe (picker + ordre divin)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, fighterL3MulticlassReady);
    await page.goto(`/character/${charId}`);
    await expect(
      page.getByText(fighterL3MulticlassReady.name).first(),
    ).toBeVisible({ timeout: 10_000 });

    // ── Montée de niveau L3 → L4 : étape PV ───────────────────────────
    await page.getByRole('button', { name: /Monter au niveau 4/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Points de vie' }),
    ).toBeVisible();
    await shoot(page, '01-montee-niveau-pv');

    // ── Étape Amélioration / Don ──────────────────────────────────────
    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();
    await expect(
      dialog.getByRole('heading', { name: 'Amélioration de caractéristique ou don' }),
    ).toBeVisible();
    // Déplie le picker de don pour montrer le placeholder « Choisir un don… ».
    await dialog.getByRole('radio', { name: /^Don$/i }).click();
    await shoot(page, '02-montee-niveau-amelioration-ou-don');

    // Ferme la modale avant d'ouvrir le flow add-class.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    // ── Ajout de classe : picker ──────────────────────────────────────
    await page.getByRole('button', { name: /Ajouter une classe/i }).click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Choisis ta nouvelle classe' }),
    ).toBeVisible();
    await shoot(page, '03-ajout-classe-picker');

    // ── Sous-choix L1 : Ordre divin (Clerc) ───────────────────────────
    await dialog.getByRole('radio', { name: /Clerc/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();
    await expect(dialog.getByText('Ordre divin').first()).toBeVisible();
    await shoot(page, '04-ajout-classe-ordre-divin');
  });
});
