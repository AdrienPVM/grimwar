import { test, expect, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * Plan 13.14 — Tests structuraux responsive de la fiche (DOM bbox, pas
 * pixel-diff). Garde-fou contre les régressions de layout sur les 4
 * viewports cibles.
 *
 * Assertions :
 *   - Hero card visible sans scroll (bbox.top >= 0 et top < viewport.height).
 *   - À lg+ (1024) : sidebar à gauche de la zone main (aside.left < main.left).
 *   - À lg+ : main col largeur > 400px (la coquille a élargi le contenu).
 *   - À xl+ (1280) : main col largeur > 800px ET grille combat 2-col active.
 *   - Aucun overlap entre les sections-modes et la sidebar (intervalle
 *     horizontal disjoint).
 *
 * Pré-requis : émulateur Firebase (Java 11+).
 */

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-1024', width: 1024, height: 800 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function gotoSheet(page: Page, charId: string): Promise<void> {
  await page.goto(`/character/${charId}`);
  await waitForAppReady(page);
  // Petite respiration pour laisser les lazy chunks se monter (Pixel 7 emu).
  await page.waitForTimeout(250);
}

test.describe('Plan 13.14 — Sheet responsive structural', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.',
    );
  });

  test('hero card + main col élargissent à lg+ et xl+', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoSheet(page, charId);

      const info = await page.evaluate(() => {
        const hero = document.querySelector('h1#hero-name') as HTMLElement | null;
        const aside = document.querySelector(
          '.sheet-desktop-aside',
        ) as HTMLElement | null;
        const main = document.querySelector(
          '.sheet-desktop-main',
        ) as HTMLElement | null;
        const section = document.querySelector(
          '[id^="sheet-mode-panel-"]',
        ) as HTMLElement | null;
        return {
          inner: { w: window.innerWidth, h: window.innerHeight },
          heroRect: hero?.getBoundingClientRect().toJSON() ?? null,
          asideRect: aside?.getBoundingClientRect().toJSON() ?? null,
          mainRect: main?.getBoundingClientRect().toJSON() ?? null,
          sectionRect: section?.getBoundingClientRect().toJSON() ?? null,
          sectionDisplay: section ? getComputedStyle(section).display : null,
        };
      });

      // 1. Hero card visible sans scroll initial.
      expect(info.heroRect, `hero card existe sur ${vp.name}`).not.toBeNull();
      if (info.heroRect) {
        expect(info.heroRect.top, `${vp.name}: hero top >= 0`).toBeGreaterThanOrEqual(0);
        expect(info.heroRect.top, `${vp.name}: hero top < viewport.h`).toBeLessThan(
          info.inner.h,
        );
      }

      // 2. À lg+ : sidebar à gauche du main (aside.right <= main.left + 1px).
      if (vp.width >= 1024) {
        expect(info.asideRect, `${vp.name}: aside existe`).not.toBeNull();
        expect(info.mainRect, `${vp.name}: main existe`).not.toBeNull();
        if (info.asideRect && info.mainRect) {
          expect(
            info.asideRect.right,
            `${vp.name}: aside.right <= main.left (sidebar à gauche)`,
          ).toBeLessThanOrEqual(info.mainRect.left + 1);
          expect(
            info.mainRect.width,
            `${vp.name}: main col > 400px (élargi vs mobile)`,
          ).toBeGreaterThan(400);
        }
      }

      // 3. À xl+ (1280+) : main col > 800px ; combat mode display = grid.
      if (vp.width >= 1280) {
        expect(info.mainRect, `${vp.name}: main existe`).not.toBeNull();
        if (info.mainRect) {
          expect(
            info.mainRect.width,
            `${vp.name}: xl+ main col > 800px`,
          ).toBeGreaterThan(800);
        }
        expect(info.sectionDisplay, `${vp.name}: combat mode display = grid`).toBe(
          'grid',
        );
      }

      // 4. Mobile (< lg) : pas de sidebar visible (asideRect width = 0 OU n'existe pas).
      if (vp.width < 1024) {
        if (info.asideRect) {
          // À mobile l'aside est rendu mais en flow normal (pas dans la grille).
          // Sa largeur est celle de son contenu mobile. On ne vérifie pas qu'il
          // n'existe pas (il existe dans le DOM), juste qu'il ne se positionne
          // pas comme une sidebar à gauche du main.
          expect(info.asideRect.left, `${vp.name}: aside aligned to viewport`).toBeLessThan(
            info.inner.w,
          );
        }
      }
    }
  });

  test('bento : grille 6 colonnes, aucune tuile vide, aucune rangée trouée', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await waitForAppReady(page);

    // Deux personas distincts, chacun choisi pour que les listes testées soient
    // NON VIDES : un guerrier équipé pour l'inventaire (le magicien de référence
    // a un sac vide → aucune <ul> rendue, l'assertion serait vacuously verte),
    // un magicien L5 pour la liste de sorts. Le guerrier sert aussi de cas
    // « beaucoup de cartes absentes » (ni sorts, ni invocations, ni ordre) —
    // c'est LUI qui met le remplissage dense sous tension.
    const { charId: fighterId } = await seedCharacter(page, fighterL3);
    const { charId: wizardId } = await seedCharacter(page, wizardL5DamageD1);

    const CASES = [
      { tab: 'Combat', panel: 'sheet-mode-panel-combat' },
      { tab: 'Essence', panel: 'sheet-mode-panel-essence' },
      { tab: 'Avoir', panel: 'sheet-mode-panel-avoir' },
      { tab: 'Magie', panel: 'sheet-mode-panel-magie' },
      { tab: 'Âme', panel: 'sheet-mode-panel-ame' },
    ] as const;

    // Tablette ET desktop : la mosaïque doit tenir aux deux paliers (la
    // tablette est passée de colonne unique à 2 colonnes utiles).
    for (const vp of [
      { name: 'tablet-1024', width: 1024, height: 900 },
      { name: 'desktop-1440', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const persona of [
        { charId: fighterId, label: 'guerrier' },
        { charId: wizardId, label: 'magicien' },
      ]) {
        await gotoSheet(page, persona.charId);

        for (const mode of CASES) {
          await page
            .getByRole('tab', { name: new RegExp(`^${mode.tab}$`, 'i') })
            .click();
          await page.waitForTimeout(250);

          const info = await page.evaluate((panelId) => {
            const section = document.getElementById(panelId);
            if (!section) return null;
            const sectionW = section.getBoundingClientRect().width;

            const tiles = Array.from(
              section.querySelectorAll<HTMLElement>('[data-bento-tile]'),
            );
            // Une tuile dont la carte a rendu `null` doit être RETIRÉE du flux
            // par la règle `:has()` — sinon elle ouvre une cellule fantôme.
            // Critère « aucun descendant n'a de boîte » et non « aucun enfant » :
            // une tuile peut envelopper une PILE ou un GROUPE dont toutes les
            // cartes se sont masquées — le conteneur reste alors un enfant, la
            // tuile paraît pleine, et le trou est quand même à l'écran.
            const ghostTiles = tiles.filter(
              (el) =>
                getComputedStyle(el).display !== 'none' &&
                el.getBoundingClientRect().height > 0 &&
                !Array.from(el.querySelectorAll('*')).some(
                  (d) => d.getBoundingClientRect().height > 0,
                ),
            ).length;

            // Rangées : les tuiles d'une même rangée partagent leur arête haute
            // (la grille est en `items-stretch`, elles partagent même les deux) —
            // regrouper par `offsetTop` reconstitue donc exactement les rangées.
            const visible = tiles.filter(
              (el) => getComputedStyle(el).display !== 'none',
            );
            const gap = parseFloat(getComputedStyle(section).columnGap || '0');
            const trackW = (sectionW - gap * 5) / 6;
            // Empreinte en colonnes, déduite de la largeur mesurée : la valeur
            // calculée de `grid-column-start` vaut « auto » sous placement
            // automatique, elle ne renseigne donc pas l'empreinte réelle.
            const spanOf = (el: HTMLElement): number =>
              Math.round((el.getBoundingClientRect().width + gap) / (trackW + gap));

            const rowTops = [...new Set(visible.map((el) => Math.round(el.offsetTop)))].sort(
              (a, b) => a - b,
            );
            const rows = rowTops.map((top) => {
              const inRow = visible.filter((el) => Math.round(el.offsetTop) === top);
              return { top, cols: inRow.reduce((sum, el) => sum + spanOf(el), 0) };
            });

            // Ordre DOM des tuiles visibles, pour vérifier que le remplissage
            // dense a bien rattrapé ce qui pouvait l'être.
            const order = visible.map((el) => ({
              row: rowTops.indexOf(Math.round(el.offsetTop)),
              span: spanOf(el),
            }));

            return {
              display: getComputedStyle(section).display,
              tracks: getComputedStyle(section)
                .gridTemplateColumns.split(' ')
                .filter(Boolean).length,
              ghostTiles,
              tileCount: visible.length,
              rows,
              order,
            };
          }, mode.panel);

          const where = `${vp.name}/${persona.label}/${mode.tab}`;
          expect(info, `${where}: panneau présent`).not.toBeNull();
          if (!info) continue;

          // Panneau d'état vide (ex. mode Magie d'un personnage non lanceur) :
          // pas de mosaïque à vérifier, mais on exige quand même qu'aucune
          // tuile fantôme n'y traîne.
          if (info.tileCount === 0) {
            expect(info.ghostTiles, `${where}: aucune tuile fantôme`).toBe(0);
            continue;
          }

          expect(info.display, `${where}: panneau en grid`).toBe('grid');
          expect(info.tracks, `${where}: grille 6 colonnes`).toBe(6);
          expect(info.ghostTiles, `${where}: aucune tuile fantôme`).toBe(0);
          expect(info.tileCount, `${where}: au moins une tuile`).toBeGreaterThan(0);

          // Invariant 1 — la rangée d'en-tête est TOUJOURS pleine. Chaque mode
          // ouvre sur des cartes inconditionnelles (PV + HUD, bandeau Essence,
          // poids + bourse, barre de sorts, personnalité) : si l'une d'elles
          // devenait conditionnelle, la mosaïque s'ouvrirait sur un trou.
          expect(info.rows[0]?.cols, `${where}: rangée d'en-tête pleine`).toBe(6);

          // Invariant 2 — remplissage dense effectif : aucune tuile placée plus
          // bas ne tiendrait dans un trou laissé au-dessus d'elle. C'est ce qui
          // rattrape les 28 cartes qui se masquent selon le personnage.
          for (const row of info.rows.slice(0, -1)) {
            const hole = 6 - row.cols;
            if (hole <= 0) continue;
            const rowIndex = info.rows.indexOf(row);
            const stranded = info.order.find((o) => o.row > rowIndex && o.span <= hole);
            expect(
              stranded,
              `${where}: trou de ${hole} col. @rangée ${rowIndex} qu'une tuile plus bas aurait pu combler`,
            ).toBeUndefined();
          }
        }
      }
    }
  });

  test('desktop : les 5 onglets de mode restent visibles sans défilement caché', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    // 900 px de haut : la hauteur d'un portable courant. C'est là que le
    // portrait + la bande de statuts repoussaient le 5e onglet (« Âme ») hors
    // de la sidebar, atteignable seulement en devinant qu'elle défilait.
    for (const height of [800, 900]) {
      await page.setViewportSize({ width: 1440, height });
      await gotoSheet(page, charId);

      const tabs = page.getByRole('tab');
      const count = await tabs.count();
      expect(count, `${height}px : 5 onglets`).toBe(5);

      for (let i = 0; i < count; i += 1) {
        const box = await tabs.nth(i).boundingBox();
        const label = await tabs.nth(i).innerText();
        expect(box, `${height}px : onglet ${label} mesurable`).not.toBeNull();
        if (!box) continue;
        expect(
          box.y + box.height,
          `${height}px : onglet ${label} entièrement dans la fenêtre`,
        ).toBeLessThanOrEqual(height);
        expect(box.y, `${height}px : onglet ${label} sous le haut de fenêtre`).toBeGreaterThanOrEqual(
          0,
        );
      }
    }
  });

  test('bento : les listes internes se densifient (inventaire, sorts, compétences)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);

    const { charId: fighterId } = await seedCharacter(page, fighterL3);
    const { charId: wizardId } = await seedCharacter(page, wizardL5DamageD1);

    await page.setViewportSize({ width: 1440, height: 900 });

    // DEBT D6 : les listes de lignes s'étiraient sur toute la largeur avec UNE
    // seule colonne. On asserte le layout CALCULÉ (nombre de pistes de grille),
    // pas la présence d'une classe CSS.
    const CASES = [
      { tab: 'Avoir', panel: 'sheet-mode-panel-avoir', charId: fighterId, min: 3 },
      { tab: 'Magie', panel: 'sheet-mode-panel-magie', charId: wizardId, min: 2 },
      { tab: 'Essence', panel: 'sheet-mode-panel-essence', charId: fighterId, min: 2 },
    ] as const;

    for (const mode of CASES) {
      await gotoSheet(page, mode.charId);
      await page.getByRole('tab', { name: new RegExp(`^${mode.tab}$`, 'i') }).click();
      await page.waitForTimeout(250);

      const maxListTracks = await page.evaluate((panelId) => {
        const section = document.getElementById(panelId);
        if (!section) return -1;
        const lists = Array.from(section.querySelectorAll('ul'));
        const tracks = lists.map(
          (ul) =>
            getComputedStyle(ul).gridTemplateColumns.split(' ').filter(Boolean).length,
        );
        return tracks.length > 0 ? Math.max(...tracks) : 0;
      }, mode.panel);

      expect(
        maxListTracks,
        `${mode.tab}: la liste de lignes atteint ${mode.min} colonnes`,
      ).toBeGreaterThanOrEqual(mode.min);
    }
  });
});
