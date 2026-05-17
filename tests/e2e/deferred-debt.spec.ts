import { test } from '@playwright/test';

/**
 * Specs e2e différés (plan 13.5 step 18-19 — purge dette consolidée).
 *
 * Périmètre S1 acté avec Adrien (cf. brief 13.5) : on livre les **filets
 * golden-path** (smoke central + modal invariant + régression library) ET
 * la création rapide (`wizard.spec.ts`). Les couvertures plus profondes par
 * feature (combat, essence, magie, avoir, dice digital/physique) ne sont PAS
 * livrées comme suite exhaustive — elles seraient sur-dimensionnées pour S1.
 *
 * Chaque ligne ci-dessous est un placeholder `test.fixme()` :
 *   - L'entrée apparaît dans le rapport Playwright comme **TODO** (n'échoue
 *     pas la suite, ne se vert pas faussement).
 *   - Le commentaire précise le plan-cible où chaque test sera implémenté.
 *
 * Note : ces fixmes ne ferment **pas** la dette e2e dans l'absolu ; ils la
 * **tracent** dans la suite Playwright pour qu'aucun item ne se perde
 * silencieusement. Cf. `plans/DEBT.md > D8` pour la trace consolidée et
 * `plans/13.5-playwright-smoke.md` section « Dette e2e S1 — purge ».
 */
test.describe('Dette e2e S1 différée — tracée mais non implémentée', () => {
  test.fixme(
    'Sheet — /character/:id rend hero card, status strip 4 stats, switch modes (plan 06 step 17)',
    async () => {
      // À implémenter quand la fiche est retravaillée (D6 — fiche desktop non
      // responsive) OU dans un plan e2e dédié S5 avec CI. Le smoke teste déjà
      // que la fiche RENDS (hero card + 2 mode tabs).
    },
  );

  test.fixme(
    'Combat — HP +/-, death saves modal, ressusciter, inspiration toggle (plan 07 step 16)',
    async () => {
      // À implémenter avec un fixture seedCharacter qui pré-pose une fiche
      // Magicien niv. 5 via SDK admin contre l'émulateur. Cf. note dans
      // fixtures.ts. Plan-cible : e2e expansion S5 ou plan dédié.
    },
  );

  test.fixme(
    'Essence — tap petal/save/skill → toast roll, inspiration + advantage, exhaustion (plan 08 step 16)',
    async () => {
      // Même contrainte (seedCharacter). Le toast d'historique des jets est
      // déjà testé unitairement dans `roll-with-flags.test.ts`.
    },
  );

  test.fixme(
    'Magie — cast un sort consomme un slot, concentration brise la précédente (plan 09 step 15)',
    async () => {
      // Comme ci-dessus. Tests unitaires `spell-slots.test.ts` couvrent déjà
      // la mécanique de slots ; l'e2e validerait le câblage UI + Firestore.
    },
  );

  test.fixme(
    'Avoir — ajout/équipement/retrait item DB, refus free-string (plan 10 step 14)',
    async () => {
      // Tests unitaires `inventory-rules.test.ts` couvrent déjà le refus
      // free-string côté logique ; l'e2e validerait qu'aucun chemin UI
      // n'expose un TextInput libre pour le slug.
    },
  );

  test.fixme(
    'Dice digital — cycle attaque + dégâts + badge D dans l\'historique (plan 12 step 31)',
    async () => {
      // Tests unitaires `roll-with-flags.test.ts` + `use-dice.test.ts`
      // couvrent déjà la mécanique. L'e2e validerait l'integration tray +
      // toast + badge.
    },
  );

  test.fixme(
    'Dice physique — gate Touché/Raté manuel, Passer idempotent, badge P (plan 12.5 step 24)',
    async () => {
      // Tests unitaires `roll-with-flags-physical.test.ts` +
      // `use-dice-physical.test.ts` couvrent déjà la mécanique. UAT physique
      // d'Adrien valide le path E2E manuellement.
    },
  );
});
