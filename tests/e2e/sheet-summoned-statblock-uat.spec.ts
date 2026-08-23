import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  druidL9D14,
  paladinL9D14,
  seedCharacter,
  wizardL9D14,
  type SeedPreset,
} from './seed-character';

/**
 * Plan D14 — UAT visuel des 4 statblocks de créatures invoquées rendus dans
 * `SpellDetailModal`. 4 captures pleine page (une par sort) + 4 viewport mobile
 * pour le ressenti d'overlay (modale en mode `items-end`). Sortie dans
 * `uat-review/`, dossier vidé en début de spec puis re-rempli.
 *
 * Convention 2026-05-19 (modales) : pleine page POUR le contenu textuel
 * exhaustif (la modale est haute, scrollable), viewport POUR le ressenti
 * d'overlay (backdrop + ancrage `items-end` mobile). Captures nommées
 * `01-…` à `04-…` dans l'ordre où Adrien doit les regarder.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

interface UatCase {
  readonly slug: string;
  readonly preset: SeedPreset;
  readonly spellNameFr: string;
  readonly statBlockNameFr: string;
  readonly description: string;
  /**
   * Où cliquer le sort. Un lanceur PRÉPARATEUR (Clerc / Druide / Paladin) rend
   * <PreparationEditor> AVANT la liste, avec le même nom de sort et un contenu
   * qui reste monté même replié (`grid-rows-[0fr]`) : le clic doit être scopé à
   * la <SpellList>, sinon il tombe dans l'éditeur et est intercepté par son
   * paragraphe d'aide. Le Magicien mono-classe n'a pas d'éditeur — il rend
   * <WizardSpellbookSections> et non la SpellList, donc `page`.
   */
  readonly scope: 'spell-list' | 'page';
}

const CASES: readonly UatCase[] = [
  {
    slug: '01-find-steed-otherworldly-steed',
    preset: paladinL9D14,
    spellNameFr: 'Appel de destrier',
    statBlockNameFr: 'Monture d’outre-monde',
    description:
      'Paladin L9 → tap sur « Appel de destrier » → modale ouvre le statblock Monture d’outre-monde (3 actions bonus conditionnelles Céleste/Fée/Fiélon)',
    scope: 'spell-list',
  },
  {
    slug: '02-animate-objects-animated-object',
    preset: wizardL9D14,
    spellNameFr: 'Animation des objets',
    statBlockNameFr: 'Objet animé',
    description:
      'Magicien L9 → tap sur « Animation des objets » → modale ouvre Objet animé (HP variable par taille M/G/TG, action Coup)',
    scope: 'page',
  },
  {
    slug: '03-summon-dragon-draconic-spirit',
    preset: wizardL9D14,
    spellNameFr: 'Convocation de dragon',
    statBlockNameFr: 'Esprit draconique',
    description:
      'Magicien L9 → tap sur « Convocation de dragon » → modale ouvre Esprit draconique (Résistances partagées + Saignée + Souffle)',
    scope: 'page',
  },
  {
    slug: '04-giant-insect-giant-insect',
    preset: druidL9D14,
    spellNameFr: 'Insecte géant',
    statBlockNameFr: 'Insecte géant',
    description:
      'Druide L9 → tap sur « Insecte géant » → modale ouvre Insecte géant (3 formes : araignée / guêpe / mille-pattes, actions conditionnelles)',
    scope: 'spell-list',
  },
];

test.describe('UAT visuel D14 — statblocks de créatures invoquées', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  for (const uat of CASES) {
    test(`${uat.slug} — ${uat.description}`, async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);

      const { charId } = await seedCharacter(page, uat.preset);
      await page.goto(`/character/${charId}`);

      // Hero card visible ⇒ fiche chargée + hooks finalisés
      await expect(
        page.getByText(uat.preset.name).first(),
        'La hero card doit afficher le nom du PJ seedé.',
      ).toBeVisible({ timeout: 10_000 });

      // Bascule mode Magie (onglet a `role="tab"`)
      await page.getByRole('tab', { name: /^Magie$/i }).click();

      // Tap sur le sort cible — ouvre la modale (voir `UatCase.scope` pour
      // POURQUOI le scope est nécessaire chez un lanceur préparateur).
      //
      // Le scope est DÉCLARÉ par cas, pas déduit à la volée : une première
      // version testait `count() > 0 ? liste : page`, mais `count()` n'attend
      // pas. Tant que la carte n'était pas montée (le contenu des sorts se
      // charge en async), il renvoyait 0 et le locator retombait
      // SILENCIEUSEMENT sur `page` — d'où un test rouge seulement sous suite
      // complète, vert en isolation. On attend donc explicitement le conteneur.
      const spellList = page.getByTestId('spell-list');
      if (uat.scope === 'spell-list') {
        await expect(
          spellList,
          'la SpellList doit être montée avant de cliquer un sort',
        ).toBeVisible({ timeout: 15_000 });
      }
      const spellScope = uat.scope === 'spell-list' ? spellList : page;
      await spellScope.getByText(uat.spellNameFr, { exact: false }).first().click();

      // La modale est ouverte + le statblock rendu
      const dialog = page.getByRole('dialog');
      await expect(dialog, 'la modale détail sort doit s’ouvrir').toBeVisible();
      const statblock = dialog.getByTestId('summoned-creature-statblock');
      await expect(
        statblock,
        `le statblock de ${uat.statBlockNameFr} doit être rendu dans la modale`,
      ).toBeVisible();
      // Sanity-check : le nom du statblock est bien celui attendu (vs un autre)
      await expect(
        statblock.getByText(uat.statBlockNameFr).first(),
        `le titre du statblock doit être ${uat.statBlockNameFr}`,
      ).toBeVisible();

      // PIÈGE OVERFLOW DOUBLE (CLAUDE.md 2026-05-20) : `DetailModal` pose
      // `max-h-[90vh] overflow-y-auto` sur sa racine, ET le `<SpellDetailModal>`
      // ajoute un `<div className="flex-1 overflow-y-auto">` interne qui scroll
      // indépendamment. `fullPage: true` ne franchit ni l'un ni l'autre.
      // Stratégie : neutraliser les deux overflows + tous les max-h dans la
      // modale pour la rendre statique (= tout dans le flux du document).
      await dialog.evaluate((el: Element) => {
        const root = el as HTMLElement;
        root.style.maxHeight = 'none';
        root.style.overflow = 'visible';
        // Tout descendant qui clipperait — flex-1 overflow-y-auto, max-h-*…
        for (const desc of root.querySelectorAll<HTMLElement>('*')) {
          const cs = window.getComputedStyle(desc);
          if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
            desc.style.overflow = 'visible';
          }
          if (cs.maxHeight && cs.maxHeight !== 'none') {
            desc.style.maxHeight = 'none';
          }
          if (cs.flex && cs.flex !== '0 1 auto') {
            desc.style.flex = 'initial';
          }
        }
      });
      // Mesure post-override : hauteur totale du document.
      const docHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      await page.setViewportSize({
        width: 412,
        height: Math.max(900, docHeight + 100),
      });
      const fullPageBuffer = await page.screenshot({
        fullPage: true,
        animations: 'disabled',
      });
      writeFileSync(path.join(UAT_DIR, `${uat.slug}-pleine-page.png`), fullPageBuffer);

      // Restaure tout pour la capture viewport (ressenti d'overlay mobile
      // tel que vu sans patch : backdrop + ancrage `items-end` + max-h-[90vh]).
      await dialog.evaluate((el: Element) => {
        const root = el as HTMLElement;
        root.style.maxHeight = '';
        root.style.overflow = '';
        for (const desc of root.querySelectorAll<HTMLElement>('*')) {
          desc.style.overflow = '';
          desc.style.maxHeight = '';
          desc.style.flex = '';
        }
      });
      await page.setViewportSize({ width: 412, height: 869 });
      const viewportBuffer = await page.screenshot({
        fullPage: false,
        animations: 'disabled',
      });
      writeFileSync(path.join(UAT_DIR, `${uat.slug}-viewport.png`), viewportBuffer);
    });
  }
});
