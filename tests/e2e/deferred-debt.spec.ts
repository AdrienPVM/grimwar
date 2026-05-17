import { test } from '@playwright/test';

/**
 * Specs e2e différées (plan 13.5 + complément 2026-05-17).
 *
 * **État après complément 13.5** — 3 features e2e ont été extraites en specs
 * réelles grâce au fixture `seedCharacter` (cf. `tests/e2e/seed-character.ts`)
 * et ne figurent PLUS ici :
 *   - Combat (HP ± + switch mode) → `combat.spec.ts`
 *   - Magie (slots + spell list) → `magie.spec.ts`
 *   - Dice physique (gate Touché/Raté) → `dice-physical.spec.ts`
 *
 * **Les 4 placeholders restants ci-dessous** ne sont plus bloqués
 * structurellement par l'absence du fixture (il existe). Ils sont
 * explicitement assignés au **plan 20.5 (close-out S2)** — cf.
 * `plans/20.5-e2e-expansion-s2-close.md` + `plans/DEBT.md > D8`. Si tu lis ce
 * fichier après la clôture du sprint 2, ce module devrait avoir été
 * supprimé (step 5 du plan 20.5).
 *
 * Date de péremption explicite : avant la livraison du plan 21 (DM
 * dashboard, premier plan S3). Si plan 21 atterrit sans que ces 4 specs
 * soient verts, on aura encore raté une opportunité de purge.
 */
test.describe('Dette e2e S1 résiduelle — owner plan 20.5 close-out S2', () => {
  test.fixme(
    'Sheet foundation — /character/:id rend hero card + status strip + 5 mode tabs + switch effectif (plan 06 step 17 → plan 20.5 step 1)',
    async () => {
      // Fixture seedCharacter disponible (cf. tests/e2e/seed-character.ts).
      // Spec à écrire : seed fighterL3, navigate /character/:id, assert hero
      // card + ≥4 chips status strip + 5 mode tabs, puis tap Combat → Magie
      // → Essence et vérifier le panel id correspondant rendu.
    },
  );

  test.fixme(
    'Essence — tap petal/save/skill → toast roll + toggle inspiration (plan 08 step 16 → plan 20.5 step 2)',
    async () => {
      // Fixture disponible. Spec à écrire : seed fighterL3, onglet Essence,
      // tap petal FOR, vérifier toast roll OU entrée dans historique des
      // jets. Toggle inspiration → état persisté.
    },
  );

  test.fixme(
    'Avoir — ajout/équipement item DB + refus structural free-string (plan 10 step 14 → plan 20.5 step 3)',
    async () => {
      // Fixture disponible. Spec à écrire : seed fighterL3 avec inventory
      // minimal, onglet Avoir, ouvrir « Ajouter item », sélectionner depuis
      // DB (ex. quarterstaff). Anti-régression : aucun TextInput libre pour
      // le slug item dans la modale d'ajout.
    },
  );

  test.fixme(
    'Dice digital — cycle attaque + dégâts + badge D dans l\'historique (plan 12 step 31 → plan 20.5 step 4)',
    async () => {
      // Fixture disponible. Spec à écrire : seed fighterL3 (mode digital par
      // défaut), onglet Combat, tap attaque, vérifier qu'aucune modale
      // physique n'apparaît (= l'invariant clé du mode digital), ouvrir
      // l'historique → entrée avec badge `D`.
    },
  );
});
