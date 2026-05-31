import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * JALON 3B.6 — e2e proof : le wizard consomme les sorts d'un pack importé.
 *
 * Boucle complète : import pack via UI → ouverture wizard → choix Magicien →
 * le sort custom du pack apparaît dans la liste des sorts inscrits aux côtés
 * des sorts SRD. Sans la fusion 3B.5 (`useContent` câblé à `loadContentMulti`
 * + pont `loadUserPacksEntries`), l'`#wizard-inscribed-<id>` n'existerait pas.
 *
 * Pourquoi un seul sort dans le pack : on prouve la chaîne d'import → fusion
 * → rendu wizard, pas la richesse fonctionnelle du grimoire (déjà couverte
 * par `wizard-grimoire.spec.ts` sur le SRD pur).
 */

const CUSTOM_SPELL = {
  id: 'feu-magique-3b6',
  name: { fr: 'Feu magique 3B.6', en: 'Magic fire 3B.6' },
  level: 1,
  school: 'evocation',
  castingTime: { fr: '1 action', en: '1 action' },
  range: { fr: '30 mètres', en: '120 feet' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'Instantanée', en: 'Instantaneous' },
  concentration: false,
  ritual: false,
  description: {
    fr: 'Un trait de feu jaillit de ta main.',
    en: 'A bolt of fire shoots from your hand.',
  },
  atHigherLevels: null,
  classes: ['wizard'],
  source: 'srd-5.2.1',
} as const;

const PACK = {
  meta: {
    id: 'pack-3b6-wizard-consumes',
    name: { fr: '3B.6 — Pack wizard consumes', en: '3B.6 — Pack wizard consumes' },
    version: '1.0.0',
    author: 'Adrien e2e',
    createdAt: '2026-05-31T12:00:00Z',
  },
  entities: {
    spells: [CUSTOM_SPELL],
  },
};

test.describe('Custom content — wizard consumes pack — JALON 3B.6', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping spec.',
    );
  });

  test('sort custom du pack importé apparaît dans le grimoire Magicien', async ({ page }) => {
    // 1. Import pack via UI
    await page.goto('/account/content');
    await waitForAppReady(page);

    await page.getByTestId('pack-file-input').setInputFiles({
      name: 'pack-3b6.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(PACK), 'utf-8'),
    });
    await page.getByTestId('pack-import-confirm').click();
    await page.locator(`[data-pack-id="${PACK.meta.id}"]`).waitFor({ timeout: 10_000 });

    // 2. Naviguer vers le wizard — la session reste connectée (anon),
    //    donc `useContent` lit le pack importé pour le même uid.
    await page.goto('/create');
    await waitForAppReady(page);

    // 3. Étape Identity → Nom
    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Pack Consumer');
    await clickNext(page);

    // 4. Étape Class → choix Magicien. Le sous-choix grimoire L1 du
    //    Magicien rend des `<input id="wizard-inscribed-<spellId>">` pour
    //    chaque sort L1 de classes:[wizard]. Si la fusion marche, le sort
    //    custom est dans la liste.
    await page.getByRole('button', { name: /^Magicien( |$)/i }).first().click();

    const customInscribedCheckbox = page.locator(
      `#wizard-inscribed-${CUSTOM_SPELL.id}`,
    );
    await expect(
      customInscribedCheckbox,
      'Sort custom du pack DOIT apparaître dans le grimoire Magicien — preuve que `useContent` fusionne SRD ∪ pack-user.',
    ).toBeAttached({ timeout: 5_000 });

    // 5. Vérification de l'identité du contenu (CLAUDE.md > « vérité du
    //    contenu ») : le sort coché doit porter le nom FR exact du pack,
    //    pas une simple présence générique. Le `<label>` est lié au
    //    checkbox par `htmlFor`.
    const customLabel = page.locator(
      `label[for="wizard-inscribed-${CUSTOM_SPELL.id}"]`,
    );
    await expect(customLabel).toContainText(CUSTOM_SPELL.name.fr);

    // 6. Cohabitation SRD ∪ custom : au moins UN sort SRD bien connu doit
    //    rester visible (`#wizard-inscribed-alarme`). Si le sort SRD a
    //    disparu, on a remplacé au lieu de fusionner — régression.
    await expect(page.locator('#wizard-inscribed-alarme')).toBeAttached({
      timeout: 5_000,
    });
  });
});

async function clickNext(page: import('@playwright/test').Page): Promise<void> {
  const next = page
    .getByRole('button')
    .filter({ hasText: /^(Suivant\s+→?|→)$/ })
    .first();
  await expect(next).toBeEnabled({ timeout: 5_000 });
  await next.click();
}
