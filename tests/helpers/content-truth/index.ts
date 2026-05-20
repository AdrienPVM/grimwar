/**
 * Verite du contenu — helpers federes (plan 13.12 commit 1).
 *
 * Primitives reutilisables des 6 categories d'invariants actees dans
 * CLAUDE.md > Required at every commit > Verite du contenu. Avant ce barrel,
 * ces primitives vivaient eparpillees en tests standalone
 * (content-referential-integrity, srd-counters, srd-reference-entries,
 * i18n-guard) ; on les extrait sans casser l'existant.
 *
 * Couverture posee au commit 1 :
 *   - cat. 2 (identite) : expectIdentityRender + allowlist D14.
 *   - cat. 4 (calculs, bornee Q1) : expectAC / expectSaveDC / expectAttackMod /
 *     expectProfBonus / expectExpertise.
 *   - cat. 5 (wizard → fiche) : submitWizardAndDeriveSheet.
 * Les cat. 1 / 3 / 6 sont federees aux commits suivants (3 = fixture etendue,
 * 6 = cas-limites portes en unitaire par le runner).
 */
export { normalizeText } from './normalize';
export {
  expectIdentityRender,
  DEBT_D14_SPELL_SLUGS,
  type IdentityField,
} from './identity';
export {
  expectAC,
  expectSaveDC,
  expectAttackMod,
  expectProfBonus,
  expectExpertise,
} from './rules';
export {
  submitWizardAndDeriveSheet,
  type SheetSnapshot,
} from './wizard';
