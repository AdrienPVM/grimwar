import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignMembership,
  seedCharacter,
  warlockL1MultiInvocations,
  wizardL5DamageD1,
} from './seed-character';

/**
 * UAT visuel — mise en page BENTO de la fiche (tablette + desktop).
 *
 * Remplace la galerie « densité D6 » (2 colonnes uniformes) : les 5 modes
 * passent en mosaïque de tuiles d'empreintes hétérogènes, et la TABLETTE est
 * concernée elle aussi (elle est passée de colonne unique à 2 colonnes utiles).
 *
 * Composition de la galerie — une capture par chose à juger, pas la galerie
 * brute du run (CLAUDE.md) :
 *   01        témoin mobile (non-régression du cas nominal : le MJ joue sur
 *             téléphone, rien ne doit y bouger)
 *   02 → 11   les 5 modes × tablette 1024 et desktop 1440
 *   12 → 13   les 2 modes les plus denses en 1920 (juger si ça respire encore)
 *
 * Personas choisis pour que les tuiles conditionnelles soient PRÉSENTES —
 * une mosaïque jugée sur une fiche vide ne montrerait rien : guerrier équipé
 * (inventaire + style de combat), magicien L5 (liste de sorts), occultiste
 * (invocations + emplacements de pacte).
 *
 * Captures `fullPage` (CLAUDE.md 2026-05-19) — la fiche scrolle au niveau du
 * document, aucun overflow interne sur ce chemin, donc `fullPage` suffit.
 *
 * Pré-requis : émulateur Firebase (`pnpm e2e:emulators`, Java 11+).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

const TABLET = { slug: 'tablette-1024', width: 1024, height: 900 } as const;
const DESKTOP = { slug: 'desktop-1440', width: 1440, height: 900 } as const;
const WIDE = { slug: 'desktop-1920', width: 1920, height: 1080 } as const;
const MOBILE = { slug: 'mobile-375', width: 375, height: 812 } as const;

async function openMode(page: Page, charId: string, tab: string): Promise<void> {
  await page.goto(`/character/${charId}`);
  await waitForAppReady(page);
  await page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') }).click();
  // Laisse la transition de panneau se poser avant la capture.
  await page.waitForTimeout(350);
}

test.describe('UAT visuel — bento de la fiche (tablette + desktop)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('galerie bento — 5 modes × tablette / desktop', async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto('/');
    await waitForAppReady(page);

    const { charId: fighterId } = await seedCharacter(page, fighterL3);
    const { charId: wizardId } = await seedCharacter(page, wizardL5DamageD1);
    const { charId: warlockId } = await seedCharacter(page, warlockL1MultiInvocations);

    const shots: {
      label: string;
      tab: string;
      charId: string;
      vp: { slug: string; width: number; height: number };
    }[] = [
      // Témoin de non-régression mobile.
      { label: 'temoin-mobile-combat', tab: 'Combat', charId: fighterId, vp: MOBILE },
      // Les 5 modes aux 2 paliers qui changent.
      { label: 'combat', tab: 'Combat', charId: fighterId, vp: TABLET },
      { label: 'combat', tab: 'Combat', charId: fighterId, vp: DESKTOP },
      { label: 'essence', tab: 'Essence', charId: warlockId, vp: TABLET },
      { label: 'essence', tab: 'Essence', charId: warlockId, vp: DESKTOP },
      { label: 'magie', tab: 'Magie', charId: wizardId, vp: TABLET },
      { label: 'magie', tab: 'Magie', charId: wizardId, vp: DESKTOP },
      { label: 'avoir', tab: 'Avoir', charId: fighterId, vp: TABLET },
      { label: 'avoir', tab: 'Avoir', charId: fighterId, vp: DESKTOP },
      { label: 'ame', tab: 'Âme', charId: fighterId, vp: TABLET },
      { label: 'ame', tab: 'Âme', charId: fighterId, vp: DESKTOP },
      // Très grand écran : juger si la mosaïque tient ou si elle se dilue.
      { label: 'combat', tab: 'Combat', charId: fighterId, vp: WIDE },
      { label: 'essence', tab: 'Essence', charId: warlockId, vp: WIDE },
    ];

    let index = 1;
    for (const shot of shots) {
      await page.setViewportSize({ width: shot.vp.width, height: shot.vp.height });
      await openMode(page, shot.charId, shot.tab);
      const buffer = await page.screenshot({ fullPage: true, animations: 'disabled' });
      const file = `${String(index).padStart(2, '0')}-${shot.label}-${shot.vp.slug}.png`;
      writeFileSync(path.join(UAT_DIR, file), buffer);
      index += 1;
    }

    // Sanity-check : une galerie muette ne sert à rien. On vérifie sur le
    // dernier état rendu (Essence à 1920) que la mosaïque est bien active —
    // 6 pistes de grille, et au moins une tuile qui n'occupe pas toute la
    // largeur (sinon on aurait re-livré une simple pile monocolonne).
    const info = await page.evaluate(() => {
      const section = document.getElementById('sheet-mode-panel-essence');
      if (!section) return null;
      const w = section.getBoundingClientRect().width;
      const tiles = Array.from(
        section.querySelectorAll<HTMLElement>('[data-bento-tile]'),
      ).filter((el) => getComputedStyle(el).display !== 'none');
      return {
        tracks: getComputedStyle(section)
          .gridTemplateColumns.split(' ')
          .filter(Boolean).length,
        partialTiles: tiles.filter((el) => el.getBoundingClientRect().width < w - 2)
          .length,
      };
    });

    expect(info, 'Essence à 1920 : panneau présent').not.toBeNull();
    expect(info?.tracks, 'Essence à 1920 : grille bento 6 colonnes').toBe(6);
    expect(
      info?.partialTiles,
      'Essence à 1920 : au moins 2 tuiles partagent une rangée',
    ).toBeGreaterThanOrEqual(2);
  });

  test('galerie navigation — raccourci « Ma campagne » sur une fiche liée', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);

    // Le raccourci n'existe QUE sur une fiche rattachée à une campagne — une
    // fiche libre n'a rien à proposer. Il faut donc reproduire l'état post-lien
    // (membership + `homeCampaignId`) pour que la capture montre quelque chose.
    const { uid, charId } = await seedCharacter(page, fighterL3);
    const cid = `uat-nav-camp-${uid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid: `gm-${uid}`,
      playerUid: uid,
      charId,
      displayName: 'Adrien',
    });

    let index = 14;
    for (const vp of [MOBILE, DESKTOP]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/character/${charId}`);
      await waitForAppReady(page);
      await page.waitForTimeout(350);

      await expect(
        page.getByRole('link', { name: /Ma campagne/i }),
        `${vp.slug} : le raccourci de campagne est rendu`,
      ).toBeVisible();

      const buffer = await page.screenshot({ fullPage: true, animations: 'disabled' });
      writeFileSync(
        path.join(UAT_DIR, `${String(index)}-ma-campagne-${vp.slug}.png`),
        buffer,
      );
      index += 1;
    }
  });
});
