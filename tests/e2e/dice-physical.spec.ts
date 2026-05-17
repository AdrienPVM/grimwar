import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * Dés physique — gate Touché/Raté (plan 13.5 complément — dette plan 12.5
 * step 24 partielle).
 *
 * **Périmètre** : golden path mode physique pour une attaque d'arme. C'est la
 * mécanique LA PLUS SUBTILE de la feature dice — gate manuel sur face neutre
 * (≠20, ≠1), auto-Touché/crit sur 20, auto-Raté/fumble sur 1. On valide la
 * boucle complète :
 *
 *   1. Mode physique posé sur `users/{uid}.settings.diceMode = 'physical'`.
 *   2. Onglet Combat → tap d'une attaque → `<PhysicalRollModal />` s'ouvre.
 *   3. Saisie d'une face neutre (12) + Valider.
 *   4. `<HitMissGateModal />` s'ouvre — c'est l'invariant PHYSIQUE qui
 *      n'existe PAS en mode digital (digital chain auto). Si jamais ce modal
 *      disparaît silencieusement (régression du pivot ui-modals-slice),
 *      cette spec casse immédiatement.
 *   5. Tap « Raté » → flow se ferme proprement, pas de prompt dégâts.
 *
 * **Ce qui n'est PAS testé ici** (intentionnel) :
 *   - Face 20 → auto-crit + dés doublés au prompt dégâts. La mécanique pure
 *     est couverte par `roll-with-flags-physical.test.ts` unitaire ;
 *     l'enchaînement modal-vers-modal sur face 20 ajoute peu de valeur
 *     comparé au coût de maintenir un assert sur 3 modals successifs.
 *   - Avantage / désavantage (long-press menu) — la dérivation kept/keep
 *     est testée unitairement.
 *   - Persistance Dexie de l'historique (badge P visible dans
 *     `<RollHistoryPanel />`) — diff TimingMicro testable, à ajouter en S5
 *     plan dédié.
 *
 * **Pré-requis** : émulateur Firebase actif. Sans émulateur, skip propre.
 */
test.describe('Dice physique — gate Touché/Raté apparaît sur face neutre', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping dice-physical.',
    );
  });

  test('seed Guerrier mode physique → tap attaque → d20=12 → gate Touché/Raté', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Seed Guerrier (dague équipée) + mode physique côté users/{uid}.
    const { charId } = await seedCharacter(page, fighterL3, { diceMode: 'physical' });
    await page.goto(`/character/${charId}`);

    // Hero card visible = fiche chargée.
    await expect(
      page.getByText(fighterL3.name).first(),
      'Le nom du PJ Guerrier doit apparaître sur la fiche après seed.',
    ).toBeVisible({ timeout: 10_000 });

    // Onglet Combat (souvent actif par défaut, mais on force par discipline).
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const combatPanel = page.locator('#sheet-mode-panel-combat');
    await expect(combatPanel).toBeVisible();

    // La liste d'attaques rend la dague équipée. Le row contient le nom FR
    // « Dague » + sous-ligne « Mêlée · 1d4+X perforants ». On clique le bouton
    // qui enveloppe la row.
    const daggerAttack = combatPanel.getByRole('button').filter({ hasText: /Dague/i }).first();
    await expect(
      daggerAttack,
      'L\'attaque « Dague » doit être visible dans le combat panel (preset fighterL3 équipe la dague).',
    ).toBeVisible();
    await daggerAttack.click();

    // ── ÉTAPE A : modal physique d20 ────────────────────────────────────
    // `<PhysicalRollModal />` s'ouvre avec « Mode physique — saisis tes dés »
    // en eyebrow et le label de l'arme en titre. C'est l'invariant
    // d'ouverture du flow.
    const physicalModal = page.getByRole('dialog').filter({ hasText: /Mode physique/i });
    await expect(
      physicalModal,
      'En mode physique, taper une attaque DOIT ouvrir le PhysicalRollModal — si absent, le pivot use-dice ne route pas correctement.',
    ).toBeVisible({ timeout: 5_000 });

    // Saisie face 12 (neutre). aria-label de l'input = « Face d20 numéro 1 ».
    const d20Input = physicalModal.getByLabel(/Face d20 numéro 1/i);
    await d20Input.fill('12');

    // Bouton Valider activé. On clique.
    const validate = physicalModal.getByRole('button', { name: /^Valider$/ });
    await expect(validate, 'Bouton « Valider » actif après saisie face valide.').toBeEnabled();
    await validate.click();

    // ── ÉTAPE B : gate Touché/Raté ──────────────────────────────────────
    // L'invariant clé du mode physique — sur face neutre, l'app ne peut PAS
    // savoir si le joueur a touché (pas de CA cible côté S1). Elle DOIT
    // demander manuellement.
    const gateModal = page.getByRole('dialog').filter({
      hasText: /Mode physique — résolution attaque/i,
    });
    await expect(
      gateModal,
      'Sur face neutre (12), le HitMissGateModal DOIT s\'ouvrir — c\'est la mécanique non-négociable du mode physique. Si absent, la chain digital-style a été réintroduite par erreur.',
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      gateModal.getByRole('button', { name: /^Touché$/ }),
      'Le gate doit exposer le bouton « Touché ».',
    ).toBeVisible();
    await expect(
      gateModal.getByRole('button', { name: /^Raté$/ }),
      'Le gate doit exposer le bouton « Raté ».',
    ).toBeVisible();

    // Tap « Raté » → résolution `miss` → pas de prompt dégâts. Le pivot
    // physique ferme proprement le flow ; aucun autre modal ne doit s'ouvrir.
    await gateModal.getByRole('button', { name: /^Raté$/ }).click();

    // Aucun dialog ne doit rester visible (gate fermé + pas de prompt damage
    // sur miss). On attend la fermeture de tous les dialogs.
    await expect(
      page.getByRole('dialog').filter({ hasText: /Mode physique/i }),
      'Après « Raté », tous les modals physiques doivent être fermés (pas de prompt dégâts sur miss).',
    ).toHaveCount(0, { timeout: 3_000 });
  });
});
