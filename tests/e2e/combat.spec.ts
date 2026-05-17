import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * Combat mode e2e (plan 13.5 complément — dette plan 07 step 16 partielle).
 *
 * **Périmètre** : golden path Combat. Seed un Guerrier niv. 3, navigue vers
 * sa fiche, switch sur l'onglet Combat, applique -1 PV puis +1 PV via les
 * boutons − / +, vérifie que le HpMegaCard reflète la nouvelle valeur. C'est
 * la mécanique la PLUS utilisée en jeu — c'est elle qui doit être protégée.
 *
 * **Ce qui n'est PAS testé ici** (intentionnel — golden path uniquement) :
 *   - Long-press → number pad (subtilité gesture, mieux couvert par
 *     `use-long-press.test.ts` unitaire).
 *   - Death saves (3 fails, ressusciter) — couvert unitairement par
 *     `hp-combat.test.ts`.
 *   - Conditions, slots, party strip — chaque sous-rendu est statique,
 *     pas de risque de régression silencieuse vs. la mécanique tap=±1.
 *
 * **Pré-requis** : émulateur Firebase actif (`pnpm e2e:emulators`, requiert
 * Java/JRE 11+). Sans émulateur, le test skip proprement.
 */
test.describe('Combat — HP ± via tap (golden path)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping combat.',
    );
  });

  test('seed Guerrier niv. 3 → tap −1 PV → tap +1 PV restaure', async ({ page }) => {
    // 1. Boot l'app pour que l'auth anon s'établisse → window.__e2eAuthUid.
    await page.goto('/');
    await waitForAppReady(page);

    // 2. Seed via Admin SDK (bypass rules).
    const { charId } = await seedCharacter(page, fighterL3);

    // 3. Navigation directe vers la fiche. Le snapshot Firestore voit le doc
    //    quasi instantanément (singleProjectMode, pas de latence réseau).
    await page.goto(`/character/${charId}`);

    // 4. Hero card rend avec le nom du preset (= la fiche a chargé).
    await expect(
      page.getByText(fighterL3.name).first(),
      'La hero card doit afficher le nom du PJ seedé — si absent, le doc Firestore est invisible côté client (auth ou path mismatch).',
    ).toBeVisible({ timeout: 10_000 });

    // 5. Switch sur le mode Combat (tab a un role="tab" avec label "Combat").
    //    L'onglet par défaut est probablement Combat, mais on force le tap
    //    pour reproduire le geste utilisateur et garantir le rendu du panel.
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    await expect(
      page.locator('#sheet-mode-panel-combat'),
      'Le panel Combat doit être rendu après tap de l\'onglet.',
    ).toBeVisible();

    // 6. État initial : 28/28 PV (preset fighterL3.hp = { current: 28, max: 28 }).
    //    On cherche le texte "28" dans la mega-card en se basant sur le
    //    pattern "28 / 28". Sélecteur volontairement souple : si le layout
    //    typographique change (ex : <span>28</span>/<span>28</span>), on
    //    veut quand même valider la valeur, pas le markup.
    const hpDisplay = page
      .locator('[role="tabpanel"]#sheet-mode-panel-combat')
      .getByText(/^28$/)
      .first();
    await expect(
      hpDisplay,
      'PV courants attendus = 28 à l\'ouverture (preset fighterL3).',
    ).toBeVisible();

    // 7. Tap − (subir 1 dégât). aria-label exact = « Subir 1 dégât (long-press
    //    pour saisir un montant) » — on matche sur le préfixe pour rester
    //    robuste à un futur reword mineur.
    const minus = page.getByRole('button', { name: /^Subir 1 dégât/i });
    await minus.click();

    // 8. Attente du patch Firestore + re-render. PV passent à 27.
    await expect(
      page.locator('[role="tabpanel"]#sheet-mode-panel-combat').getByText(/^27$/).first(),
      'Après tap −, PV courants doivent passer de 28 à 27 (delta 1, applyDamage).',
    ).toBeVisible({ timeout: 5_000 });

    // 9. Tap + (soigner 1 PV). Restaure à 28.
    const plus = page.getByRole('button', { name: /^Soigner de 1 PV/i });
    await plus.click();

    await expect(
      page.locator('[role="tabpanel"]#sheet-mode-panel-combat').getByText(/^28$/).first(),
      'Après tap +, PV courants doivent retourner à 28 (applyHeal vers max).',
    ).toBeVisible({ timeout: 5_000 });
  });
});
