/**
 * Classes — FR → ID canonique EN.
 *
 * Pourquoi : la décision lockée CLAUDE.md « PDFs source of truth #1 » impose
 * que `public/data/classes.json[*].id` soit en EN canonique (extrait du SRD).
 * AideDD écrit les références de classe en FR dans les sorts (`spell.classes[]`).
 * Sans ce mapping, le filtre `spell.classes.includes(class.id)` ne match plus
 * rien (cf. plans/DEBT.md > D3 bug #2 — fix livré 2026-05-16).
 *
 * Fichier isolé sans top-level execution pour pouvoir être importé depuis
 * parse-aidedd.ts ET build-public-content.ts sans déclencher d'effets de bord.
 */
export const CLASS_FR_TO_EN_ID: Record<string, string> = {
  barbare: 'barbarian',
  barde: 'bard',
  clerc: 'cleric',
  druide: 'druid',
  ensorceleur: 'sorcerer',
  guerrier: 'fighter',
  magicien: 'wizard',
  moine: 'monk',
  occultiste: 'warlock',
  paladin: 'paladin',
  rôdeur: 'ranger',
  rodeur: 'ranger',
  roublard: 'rogue',
  artificier: 'artificer',
};
