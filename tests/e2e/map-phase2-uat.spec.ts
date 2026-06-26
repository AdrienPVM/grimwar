import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * Spec e2e dédiée — CHANTIER D phase 2 (tracer D.6).
 *
 * Couvre le parcours MJ end-to-end contre Firestore émulateur :
 *   1. Aller sur `/map-proto/cloud/:cid` (cid unique par run pour éviter les
 *      collisions inter-runs sur l'émulateur partagé).
 *   2. Vérifier que `ensureCampaignExists` crée la campagne stub (pas d'erreur
 *      ensure-error affiché).
 *   3. Voir l'empty state initial.
 *   4. Créer une carte via le formulaire (slug + name).
 *   5. La carte apparaît dans la liste.
 *   6. Naviguer vers `/map-proto/cloud/:cid/maps/:mid` (la vue live).
 *   7. Ajouter un fog (reveal) → compte = 1.
 *   8. Ajouter une lumière (torche) → compte = 1.
 *   9. Ajouter un AoE (sphère) → compte = 1.
 *   10. Effacer le fog → compte = 0.
 *   11. Effacer les lumières → compte = 0.
 *   12. Effacer les AoE → compte = 0.
 *   13. Retour à la liste → la carte est toujours là.
 *   14. Supprimer la carte.
 *
 * Pré-requis : émulateur Firebase actif (Auth + Firestore).
 * Sans l'émulateur, la spec se skip proprement avec un message visible.
 *
 * cid unique : `phase2-uat-{timestamp}` — chaque run d'e2e crée sa propre
 * campagne stub. Les rules autorisent tout signed-in à créer une campagne
 * dont il devient DM.
 */
test.describe('Map phase 2 — parcours MJ end-to-end (D.6)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping D.6 spec.',
    );
  });

  test('crée une campagne stub, une carte, manipule fog/light/AoE, supprime', async ({
    page,
  }, testInfo) => {
    // cid unique par run — évite la collision entre lancers répétés contre
    // le même émulateur (ex : 2 runs Playwright successifs).
    const cid = `phase2-uat-${Date.now().toString(36)}`;
    const mapSlug = `donjon-${Date.now().toString(36)}`;
    const mapName = "Donjon de l'Aube (UAT)";

    // 1-3. Navigation vers la route prototype cloud + vérif empty state.
    await page.goto(`/map-proto/cloud/${cid}`);
    await waitForAppReady(page);

    // Wait for anonymous sign-in to complete — sans user.uid signé,
    // `ensureCampaignExists` ne sera jamais déclenché et le bouton Créer
    // reste désactivé. Hook posé par auth-provider quand
    // VITE_USE_FIREBASE_EMULATOR=true (cf. tests/e2e/seed-character.ts).
    await page.waitForFunction(
      () => {
        const w = window as Window & { __e2eAuthUid?: string | null };
        return typeof w.__e2eAuthUid === 'string' && w.__e2eAuthUid.length > 0;
      },
      null,
      { timeout: 10_000 },
    );

    // Titre identifié par rôle pour éviter le strict-mode conflict avec
    // « Chargement des cartes… » qui contient aussi « Cartes ».
    await expect(page.getByRole('heading', { name: 'Cartes' })).toBeVisible();
    await expect(page.getByTestId('maps-cloud-cid')).toContainText(cid);
    // L'ensureCampaignExists doit avoir réussi (pas de message d'erreur).
    await expect(page.getByTestId('maps-cloud-ensure-error')).toHaveCount(0);
    // Bouton Créer doit s'activer une fois ensureDone (qui se débloque à la fin
    // du setDoc campagne stub).
    await expect(page.getByTestId('maps-cloud-create-submit')).toBeEnabled({
      timeout: 10000,
    });
    // Empty state une fois useMapsList isLoading=false. Le listener Firestore
    // résout en quelques centaines de ms contre l'émulateur ; on laisse 10s.
    await expect(page.getByTestId('maps-cloud-empty')).toBeVisible({ timeout: 10000 });

    await takeStepScreenshot(page, testInfo, 'cloud-empty');

    // 4. Création d'une carte via le formulaire.
    await page.getByTestId('maps-cloud-create-id').fill(mapSlug);
    await page.getByTestId('maps-cloud-create-name').fill(mapName);
    await page.getByTestId('maps-cloud-create-submit').click();

    // 5. La carte apparaît dans la liste (real-time listener).
    await expect(page.getByTestId(`maps-cloud-card-${mapSlug}`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(mapName)).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'cloud-list');

    // 6. Navigation vers la vue live.
    await page.goto(`/map-proto/cloud/${cid}/maps/${mapSlug}`);
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: mapName })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId('map-live-meta')).toContainText(cid);
    await expect(page.getByTestId('map-live-meta')).toContainText(mapSlug);

    // Vérification des compteurs initiaux.
    await expect(page.getByTestId('map-live-fog-count')).toContainText('(0)');
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(0)');
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(0)');

    await takeStepScreenshot(page, testInfo, 'live-empty');

    // 7. Ajout d'un fog reveal → compte = 1.
    await page.getByTestId('map-live-add-fog-reveal').click();
    await expect(page.getByTestId('map-live-fog-count')).toContainText('(1)', {
      timeout: 5000,
    });

    // 8. Ajout d'une torche → compte = 1.
    await page.getByTestId('map-live-add-torch').click();
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(1)', {
      timeout: 5000,
    });

    // 9. Ajout d'un AoE sphère → compte = 1.
    await page.getByTestId('map-live-add-sphere-aoe').click();
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(1)', {
      timeout: 5000,
    });

    // 9a. Le template AoE doit être DESSINÉ sur la carte (la couche AoE est
    // câblée dans MapScene → live + TV). Avant ce fix, « Ajouter une sphère »
    // incrémentait le compteur mais ne rendait rien. Le cercle est tracé à
    // l'échelle réelle (20 ft → 280 px sur une carte 70 px/case).
    const aoeLayer = page.locator('[data-testid="aoe-layer"]');
    await expect(aoeLayer).toBeVisible({ timeout: 5000 });
    const aoeCircle = aoeLayer.locator('circle').first();
    await expect(aoeCircle).toBeVisible();
    expect(Number(await aoeCircle.getAttribute('r'))).toBeGreaterThan(100);

    await takeStepScreenshot(page, testInfo, 'live-populated');

    // Pas d'erreur d'écriture surfacée.
    await expect(page.getByTestId('map-live-write-error')).toHaveCount(0);

    // 9a-bis. DRAG de l'AoE. Le MJ pose la sphère au centre, puis la glisse là
    // où le sort atterrit. On saisit le cercle, on le déplace hors-grille, et
    // l'aimant le recale au CENTRE de case (cx,cy ≡ 35 mod 70). Preuve
    // bout-en-bout via les vraies security rules : `moveAoeTemplate` persiste,
    // puis le listener ré-émet la position aimantée. On le fait AVANT d'ajouter
    // un jeton (sinon le jeton, rendu par-dessus, capterait le pointeur au centre).
    const AOE_GRID = 70;
    await aoeCircle.scrollIntoViewIfNeeded();
    const aoeBox = await aoeCircle.boundingBox();
    expect(aoeBox).not.toBeNull();
    if (!aoeBox) return;
    const aStartX = aoeBox.x + aoeBox.width / 2;
    const aStartY = aoeBox.y + aoeBox.height / 2;
    await page.mouse.move(aStartX, aStartY);
    await page.mouse.down();
    await page.mouse.move(aStartX + 8, aStartY + 8);
    await page.mouse.move(aStartX + 70, aStartY - 46, { steps: 12 });
    await page.mouse.up();

    await expect
      .poll(
        async () => {
          const cx = await aoeCircle.getAttribute('cx');
          return cx === null ? null : Math.round(Number(cx)) % AOE_GRID;
        },
        { timeout: 5000 },
      )
      .toBe(AOE_GRID / 2);
    expect(Math.round(Number(await aoeCircle.getAttribute('cy'))) % AOE_GRID).toBe(
      AOE_GRID / 2,
    );
    await expect(page.getByTestId('map-live-write-error')).toHaveCount(0);

    await takeStepScreenshot(page, testInfo, 'aoe-dragged-snapped');

    // 9b. Grille + aimantage du jeton. La carte créée via le formulaire a
    // `showGrid:true` + `gridSize` 70 : les nouveaux contrôles Grille/Aimant
    // sont présents et ON par défaut, et un jeton lâché hors-grille s'aligne
    // sur le CENTRE de sa case → cx,cy ≡ 35 (mod 70). Preuve bout-en-bout via
    // les vraies security rules (le déplacement persiste puis le listener
    // ré-émet la position aimantée).
    const GRID = 70;
    await expect(page.getByTestId('map-live-toggle-grid')).toContainText('ON');
    await expect(page.getByTestId('map-live-toggle-snap')).toContainText('ON');

    await page.getByTestId('map-live-add-pj').click();
    await expect(page.getByTestId('map-live-tokens-count')).toContainText('(1)', {
      timeout: 5000,
    });

    const tokenG = page.locator('[data-testid^="map-live-token-"]').first();
    await expect(tokenG).toBeVisible();
    const circle = tokenG.locator('circle');

    // On drague depuis la bounding box DU JETON (pas le centre du svg : sur le
    // layout mobile haut, le jeton n'est pas au centre visuel). `steps` + un
    // petit déplacement initial garantissent qu'au moins un `pointermove` part
    // une fois `draggingTokenId` posé. La cible (~80px) est volontairement
    // hors-grille ; peu importe où il atterrit, l'aimant le recale au centre.
    await tokenG.scrollIntoViewIfNeeded();
    const tBox = await tokenG.boundingBox();
    expect(tBox).not.toBeNull();
    if (!tBox) return;
    const startX = tBox.x + tBox.width / 2;
    const startY = tBox.y + tBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 8, startY + 8);
    await page.mouse.move(startX + 84, startY - 58, { steps: 12 });
    await page.mouse.up();

    // Après round-trip Firestore, cx et cy sont des centres de case (≡ 35 mod 70).
    await expect
      .poll(
        async () => {
          const cx = await circle.getAttribute('cx');
          return cx === null ? null : Math.round(Number(cx)) % GRID;
        },
        { timeout: 5000 },
      )
      .toBe(GRID / 2);
    expect(Math.round(Number(await circle.getAttribute('cy'))) % GRID).toBe(GRID / 2);

    await takeStepScreenshot(page, testInfo, 'token-snapped-grid');

    // Ménage : on retire le jeton pour ne pas alourdir les compteurs suivants.
    await page.getByTestId('map-live-clear-tokens').click();
    await expect(page.getByTestId('map-live-tokens-count')).toContainText('(0)', {
      timeout: 5000,
    });

    // 9c. Mesure de distance. Le mode mesure transforme les clics sur le fond
    // SVG en ancres de règle ; le total en pieds s'affiche dans la barre. On
    // pose une première ancre, on déplace le curseur, et le total doit passer
    // d'« 0 ft » à une distance > 0 — preuve bout-en-bout que la règle dérive
    // l'échelle réelle de la carte (gridSize/feetPerSquare), pas un défaut.
    await page.getByTestId('map-live-toggle-measure').click();
    await expect(page.getByTestId('map-live-toggle-measure')).toContainText('ON');
    await expect(page.getByTestId('map-live-ruler-total')).toContainText('0 ft');

    const svg = page.getByTestId('map-live-svg');
    await svg.scrollIntoViewIfNeeded();
    const sBox = await svg.boundingBox();
    expect(sBox).not.toBeNull();
    if (!sBox) return;
    // Première ancre au tiers gauche, curseur déplacé vers la droite.
    const p1x = sBox.x + sBox.width * 0.3;
    const p1y = sBox.y + sBox.height * 0.5;
    const p2x = sBox.x + sBox.width * 0.6;
    const p2y = sBox.y + sBox.height * 0.5;
    await page.mouse.move(p1x, p1y);
    await page.mouse.down();
    await page.mouse.up();
    await page.mouse.move(p2x, p2y, { steps: 8 });

    // Total non nul (une distance entière en pieds). Le label sur la carte est
    // rendu aussi.
    await expect(page.getByTestId('map-live-ruler-total')).toContainText(/\b[1-9]\d* ft\b/, {
      timeout: 5000,
    });
    await expect(page.getByTestId('map-live-ruler-label')).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'measure-ruler');

    // Quitter le mode mesure purge la règle (le total disparaît de la barre).
    await page.getByTestId('map-live-toggle-measure').click();
    await expect(page.getByTestId('map-live-toggle-measure')).toContainText('OFF');
    await expect(page.getByTestId('map-live-ruler-total')).toHaveCount(0);

    // 10-12. Effacer fog / lumières / AoE.
    await page.getByTestId('map-live-clear-fog').click();
    await expect(page.getByTestId('map-live-fog-count')).toContainText('(0)', {
      timeout: 5000,
    });
    await page.getByTestId('map-live-clear-lights').click();
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(0)', {
      timeout: 5000,
    });
    await page.getByTestId('map-live-clear-aoe').click();
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(0)', {
      timeout: 5000,
    });

    // 13-14. Retour à la liste + suppression de la carte.
    await page.goto(`/map-proto/cloud/${cid}`);
    await waitForAppReady(page);
    const card = page.getByTestId(`maps-cloud-card-${mapSlug}`);
    await expect(card).toBeVisible({ timeout: 5000 });
    await page.getByTestId(`maps-cloud-delete-${mapSlug}`).click();
    await expect(card).toHaveCount(0, { timeout: 5000 });

    await takeStepScreenshot(page, testInfo, 'cloud-after-delete');
  });
});
