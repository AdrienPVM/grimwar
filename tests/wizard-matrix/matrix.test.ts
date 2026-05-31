import { beforeAll, describe, expect, it, vi } from 'vitest';

import { abilityModifier } from '@/shared/lib/rules/abilities';

import { submitWizardAndDeriveSheet, type SheetSnapshot } from '../helpers/content-truth';
import {
  axisDrift,
  buildInvalidPersonaInput,
  buildPersonaInput,
  loadBundles,
  MATRIX_ANCESTRY_AXIS,
  MATRIX_BACKGROUND_AXIS,
  MATRIX_BASE_PERSONA_CLASS_AXIS,
  MATRIX_CLASS_AXIS,
  PERSONAS,
  type MatrixBundles,
  type PersonaSpec,
} from './runner';

/**
 * Matrice combinatoire L1 — plan 13.12 commit 3.
 *
 * Drive `buildCharacterFromWizard` (vraie fonction de prod) sur chaque persona
 * généré par le runner, puis asserte les invariants de cohérence. Ferme le trou
 * B4 : le maillon « build de référence → Character valide » est désormais testé
 * pour les 12 classes + axes ascendance/background.
 *
 * `addItemToInventory` résout les items via Dexie — on le stub (même contrat que
 * `submit-from-wizard-ancestry.test.ts`) pour rester pur (zéro IndexedDB).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POSITION MATRICE v1 SUR LES SOUS-CHOIX L1 (acté Adrien 2026-05-20)
 * ────────────────────────────────────────────────────────────────────────────
 * La matrice exerce UN sous-choix canonique par classe (defense, protector,
 * magician, abyssal, drow, forêt, etc. — cf. `buildClassEntry`/`buildAncestry-
 * SubChoices` qui piochent la 1ʳᵉ valeur admissible). Les variations alternatives
 * (dueling vs defense, thaumaturge vs protector, lignage high-elf vs drow…) ne
 * sont PAS testées TANT QU'ELLES PRODUISENT UN SNAPSHOT IDENTIQUE au canonique :
 * dans le build L1 courant, la VALEUR d'un sous-choix ne modifie aucun champ que
 * le snapshot capture ({ valid, knownSpellsCount, ac, totalLevel, errors[] }).
 * Tester une variation snapshot-invariante = test cargo-cult.
 *
 * TRIGGER DE REVISITE : le jour où un sous-choix devient snapshot-discriminant
 * (ex. le style de combat `defense` applique enfin +1 CA en armure — cf. dette
 * D19), on ajoute une persona de variation pour figer le delta. La matrice
 * grandit avec le système, pas à l'avance.
 * ────────────────────────────────────────────────────────────────────────────
 */
vi.mock('@/shared/lib/inventory', () => ({
  addItemToInventory: vi.fn(
    async (shape: { inventory: { items: unknown[] } }, itemId: string) => {
      shape.inventory.items.push({
        contentId: itemId,
        contentScope: 'public',
        qty: 1,
        equipped: false,
        attuned: false,
        notes: '',
      });
    },
  ),
}));

/**
 * PINS NUMÉRIQUES de sorts connus, figés par persona (cat. 4 « calculs de
 * règles » + cat. 6 « intersections »). Détecte une dérive de quota de sélection
 * OU de source de sorts d'ascendance à travers le VRAI build.
 *
 * - `total`    = `knownSpellsCount` toutes sources (classe + ascendance).
 * - `ancestry` = `knownSpells.ancestry.length` (sorts injectés par le lignage /
 *                l'héritage de l'ascendance).
 *
 * DÉCOMPOSITION de chaque compte d'ascendance non nul, RÉSOLUE CONTRE LE CODE
 * (`buildAncestrySubChoices` pioche la 1ʳᵉ valeur admissible ; `buildAncestry-
 * SpellIds` pousse le triplet d'héritage / les cantrips de lignage) et VÉRIFIÉE
 * contre le bundle (`public/data/{ancestries,spells}.json`, 2026-05-20). Les noms
 * FR sont ceux du bundle SRD 5.2.1 — pas de terminologie inventée.
 * NB : `level3SpellId` / `level5SpellId` = niveau de PERSONNAGE auquel le sort est
 * appris, pas le niveau du sort ; ils sont stockés dès la création mais verrouillés
 * jusqu'au palier (dette D12, mécanique de cast d'ascendance).
 */
const KNOWN_SPELLS_PINS: Record<string, { total: number; ancestry: number }> = {
  // ── Couche de base : ascendance Nain = 0 sort d'ascendance ──
  // Non-lanceurs SRD L1 : aucun sort connu.
  'base-barbarian': { total: 0, ancestry: 0 },
  'base-fighter': { total: 0, ancestry: 0 },
  'base-monk': { total: 0, ancestry: 0 },
  'base-paladin': { total: 0, ancestry: 0 }, // Paladin : slots à partir de L2, 0 sort figé à L1.
  'base-rogue': { total: 0, ancestry: 0 },
  // Lanceurs SRD L1 : quota canonique (cantrips + sorts/grimoire), 0 ascendance (Nain).
  'base-druid': { total: 2, ancestry: 0 }, // 2 cantrips + 0 sort figé (prépare au jour).
  'base-ranger': { total: 2, ancestry: 0 }, // 0 cantrip + 2 sorts L1.
  'base-cleric': { total: 3, ancestry: 0 }, // 3 cantrips + 0 sort figé (prépare au jour).
  'base-warlock': { total: 4, ancestry: 0 }, // 2 cantrips + 2 sorts L1 (Pacte de magie).
  'base-bard': { total: 6, ancestry: 0 }, // 2 cantrips + 4 sorts L1.
  'base-sorcerer': { total: 6, ancestry: 0 }, // 4 cantrips + 2 sorts L1.
  'base-wizard': { total: 9, ancestry: 0 }, // 3 cantrips + 6 sorts inscrits au grimoire.
  // ── Axe ascendance ──
  // Humain = 0 sort d'ascendance ; le compte Magicien (9) est inchangé.
  'anc-wizard-human': { total: 9, ancestry: 0 },
  // Tieffelin = 4 (plan 13.14b D18 RÉSOLUE) :
  //   - thaumaturgie via `ancestry.commonSpellIds` (trait « Présence d'outre-monde »,
  //     COMMUN aux 3 héritages — pas un sous-choix). cantrip, accessible L1.
  //   - triplet d'héritage de la legacy ABYSSAL (1ʳᵉ admissible) :
  //       Bouffée de poison (cantrip, L1)
  //     + Rayon empoisonné (sort L1, appris perso-niv.3, stocké/lock dès création — D12)
  //     + Immobilisation de personne (sort L2, appris perso-niv.5, stocké/lock — D12)
  //   → 1 commun + 3 triplet = 4. (Avant 13.14b : 3, thaumaturgie manquante = D18.)
  // Total 10 = Ensorceleur 6 (4 cantrips + 2 sorts L1) + 4 ascendance.
  'anc-sorcerer-tiefling': { total: 10, ancestry: 4 },
  // Elfe = 3 sur un NON-lanceur (interaction figée : sorts d'ascendance sans
  // classe lanceuse). Lignage DROW (1ʳᵉ admissible, PAS Haut-elfe) :
  //   3 = [ Lumières dansantes (cantrip)
  //       + Lueurs féeriques (sort L1, appris perso-niv.3 — D12)
  //       + Ténèbres (sort L2, appris perso-niv.5 — D12) ]
  // Total 3 = Guerrier 0 + 3 ascendance.
  'anc-fighter-elf': { total: 3, ancestry: 3 },
  // Gnome = 2 (plan 13.14b D18 RÉSOLUE) → lignage des FORÊTS (1ʳᵉ admissible) :
  //   - Illusion mineure (cantrip de lignage, `cantripSpellIds[]`)
  //   - communication-avec-les-animaux via `gnomeLineages.forest.spellIds`
  //     (speak-with-animals, FOREST ONLY — Gnome des roches ne l'a PAS ; rituel,
  //     usage limité PB×/repos = cast D12). cat. 6 cas-limite cross-source.
  //   → 1 cantrip + 1 sort de lignage = 2. (Avant 13.14b : 1 = D18.)
  // Total 5 = Clerc 3 (3 cantrips) + 2 ascendance.
  'anc-cleric-gnome': { total: 5, ancestry: 2 },
  // ── Axe background : un background n'accorde AUCUN sort ──
  'bg-rogue-criminal': { total: 0, ancestry: 0 },
  'bg-rogue-sage': { total: 0, ancestry: 0 },
  'bg-rogue-soldier': { total: 0, ancestry: 0 },
  // ── Axe méthode de génération de stats (JALON 2E) ──
  // Guerrier non-lanceur, ascendance Nain : 0 sort attendu, quelle que soit la
  // méthode de stat — la méthode ne touche pas le quota de sorts.
  'method-fighter-rolled': { total: 0, ancestry: 0 },
  'method-fighter-manual': { total: 0, ancestry: 0 },
  'method-fighter-point-buy': { total: 0, ancestry: 0 },
  'method-fighter-standard-array': { total: 0, ancestry: 0 },
};

let bundles: MatrixBundles;
const snapshots = new Map<string, SheetSnapshot>();

beforeAll(async () => {
  bundles = loadBundles();
  for (const spec of PERSONAS) {
    const { input } = buildPersonaInput(spec, bundles);
    snapshots.set(spec.id, await submitWizardAndDeriveSheet(input));
  }
});

function snap(spec: PersonaSpec): SheetSnapshot {
  const s = snapshots.get(spec.id);
  if (!s) throw new Error(`[matrix] snapshot manquant : ${spec.id}`);
  return s;
}

describe('matrice L1 — invariants de cohérence par persona', () => {
  it.each(PERSONAS.map((p) => ({ spec: p, label: p.id })))(
    '$label : build → Character valide (B4)',
    ({ spec }) => {
      const s = snap(spec);
      expect(s.errors, `${spec.id} : erreurs Zod inattendues`).toEqual([]);
      expect(s.valid, `${spec.id} : Character invalide vs CharacterSchema`).toBe(true);
    },
  );

  it.each(PERSONAS.map((p) => ({ spec: p, label: p.id })))(
    '$label : niveau total = 1 et bonus de maîtrise = 2',
    ({ spec }) => {
      const s = snap(spec);
      expect(s.totalLevel).toBe(1);
      expect(s.profBonus).toBe(2);
    },
  );

  it.each(PERSONAS.map((p) => ({ spec: p, label: p.id })))(
    '$label : CA de base = 10 + mod DEX (wiring AC)',
    ({ spec }) => {
      const s = snap(spec);
      const dexMod = abilityModifier(s.character.abilities.dex);
      expect(s.baseAc).toBe(10 + dexMod);
    },
  );
});

describe('matrice L1 — pins de sorts connus (quota + source ascendance)', () => {
  it.each(PERSONAS.map((p) => ({ spec: p, label: p.id })))(
    '$label : knownSpellsCount + ancestry conformes au pin documenté',
    ({ spec }) => {
      const pin = KNOWN_SPELLS_PINS[spec.id];
      expect(pin, `pin manquant pour ${spec.id}`).toBeDefined();
      if (!pin) return;
      const s = snap(spec);
      expect(
        s.knownSpellsCount,
        `${spec.id} : total de sorts connus dérivé ≠ pin`,
      ).toBe(pin.total);
      expect(
        (s.character.knownSpells.ancestry ?? []).length,
        `${spec.id} : sorts d'ascendance dérivés ≠ pin`,
      ).toBe(pin.ancestry);
    },
  );
});

describe('matrice L1 — cas-limites cat. 6 portés en unitaire', () => {
  it('Roublard : Expertise sur 2 compétences DÉJÀ piquées → niveau 2 (×2, pas ×3)', () => {
    const spec = PERSONAS.find((p) => p.id === 'base-rogue');
    expect(spec, 'persona base-rogue absent').toBeDefined();
    if (!spec) return;
    const s = snap(spec);
    const entry = s.character.classes[0];
    expect(entry?.classId).toBe('rogue');
    // Exactement 2 compétences en Expertise (SRD L1).
    expect(entry?.expertiseSkills.length).toBe(2);
    // Les compétences en Expertise sont aussi des picks de classe (déjà
    // maîtrisées) → la fiche les stocke à 2, JAMAIS à 3.
    for (const skillId of entry?.expertiseSkills ?? []) {
      expect(
        s.character.skills[skillId],
        `${skillId} : Expertise sur compétence déjà maîtrisée doit valoir 2`,
      ).toBe(2);
    }
  });

  it('Magicien : knownSpells reflète le GRIMOIRE complet (6), pas seulement les 4 préparés', () => {
    const spec = PERSONAS.find((p) => p.id === 'base-wizard');
    expect(spec, 'persona base-wizard absent').toBeDefined();
    if (!spec) return;
    const s = snap(spec);
    const grimoire = s.character.classes[0]?.wizardSpellbookL1 ?? [];
    expect(grimoire.length).toBe(6);
    const known = s.character.knownSpells.wizard ?? [];
    // Tous les sorts inscrits sont connus (sinon les inscrits-non-préparés
    // disparaissent du SpellList — bug fixé plan 13.10).
    for (const id of grimoire) {
      expect(known, `grimoire ${id} absent de knownSpells.wizard`).toContain(id);
    }
    // Les préparés (4) sont un sous-ensemble du grimoire.
    expect((s.character.preparedSpells.wizard ?? []).length).toBe(4);
  });

  it('Tieffelin : 4 sorts d’ascendance (thaumaturgie commune + triplet d’héritage) injectés dans knownSpells.ancestry', () => {
    const spec = PERSONAS.find((p) => p.id === 'anc-sorcerer-tiefling');
    expect(spec, 'persona anc-sorcerer-tiefling absent').toBeDefined();
    if (!spec) return;
    const s = snap(spec);
    const ancestry = s.character.knownSpells.ancestry ?? [];
    expect(ancestry.length).toBe(4);
    // D18 : thaumaturgie (trait commun « Présence d'outre-monde ») présente,
    // pas seulement le triplet d'héritage.
    expect(ancestry, 'thaumaturgie (trait commun) absente de knownSpells.ancestry').toContain(
      'thaumaturgie',
    );
  });

  it('Gnome des forêts : 2 sorts d’ascendance (cantrip + speak-with-animals du lignage), pas castés à un Gnome des roches', () => {
    const spec = PERSONAS.find((p) => p.id === 'anc-cleric-gnome');
    expect(spec, 'persona anc-cleric-gnome absent').toBeDefined();
    if (!spec) return;
    const s = snap(spec);
    const ancestry = s.character.knownSpells.ancestry ?? [];
    expect(ancestry.length).toBe(2);
    // cat. 6 cross-source : communication-avec-les-animaux vient du lignage
    // FORÊTS uniquement (`spellIds`), pas d'un `commonSpellIds` au niveau
    // ascendance qui le leakerait à tous les gnomes.
    expect(
      ancestry,
      'communication-avec-les-animaux (lignage forêts) absente de knownSpells.ancestry',
    ).toContain('communication-avec-les-animaux');
  });
});

describe('matrice L1 — garde-fou d’axe « matrice ≡ bundle » (C3)', () => {
  // Régime BIDIRECTIONNEL : classes + backgrounds. La matrice prétend couvrir
  // chaque entrée du bundle ; toute divergence (manquant OU fantôme) = échec dur.
  it('classes : clés REFERENCE_BUILDS ≡ ids classes.json (bidirectionnel)', () => {
    const drift = axisDrift(
      MATRIX_CLASS_AXIS,
      bundles.classes.map((c) => c.id),
    );
    expect(
      drift.missingFromMatrix,
      'classe(s) du bundle sans build de référence — ajoute un REFERENCE_BUILD',
    ).toEqual([]);
    expect(
      drift.phantomInMatrix,
      'build(s) de référence fantôme(s) — classe retirée/renommée du bundle',
    ).toEqual([]);
  });

  it('classes : chaque classe du bundle a une persona base (couverture matrice)', () => {
    const drift = axisDrift(
      MATRIX_BASE_PERSONA_CLASS_AXIS,
      bundles.classes.map((c) => c.id),
    );
    expect(
      drift.missingFromMatrix,
      'classe(s) du bundle sans persona base — ajoute une entrée à PERSONAS',
    ).toEqual([]);
    expect(drift.phantomInMatrix, 'persona base pour une classe absente du bundle').toEqual([]);
  });

  it('backgrounds : ids couverts ≡ ids backgrounds.json (set S1 verrouillé)', () => {
    const drift = axisDrift(
      MATRIX_BACKGROUND_AXIS,
      bundles.backgrounds.map((b) => b.id),
    );
    expect(
      drift.missingFromMatrix,
      'background(s) du bundle sans persona — ajoute une entrée à PERSONAS',
    ).toEqual([]);
    expect(drift.phantomInMatrix, 'background référencé absent du bundle').toEqual([]);
  });

  // Régime SUBSET : ancestries. Couverture ciblée (5/9) par construction — on
  // garde-fou contre les FANTÔMES uniquement, pas contre la non-exhaustivité.
  it('ancestries : tout id référencé résout dans le bundle (subset — couverture, pas exhaustivité)', () => {
    const drift = axisDrift(
      MATRIX_ANCESTRY_AXIS,
      bundles.ancestries.map((a) => a.id),
    );
    expect(
      drift.phantomInMatrix,
      'ancestrie(s) référencée(s) par la matrice absente(s) du bundle (slug renommé/retiré ?)',
    ).toEqual([]);
    // PAS d'assertion sur missingFromMatrix : la matrice couvre 5/9 ancestries
    // par décision de cadrage (voir en-tête runner.ts). Exhaustivité = hors v1.
  });

  // ── Rouge-avant-vert PERMANENT du mécanisme anti-dérive ──
  // Prouve que le garde-fou RÉAGIT à une 13ᵉ classe : on injecte un id fictif
  // dans une copie du bundle → le drift le signale. Puis on revérifie que le
  // bundle RÉEL ne dérive pas. Ce test fige le mécanisme : si `axisDrift`
  // cessait de détecter un id manquant, CE test virerait au rouge.
  it('rouge-avant-vert : une 13ᵉ classe fictive au bundle → drift détecté', () => {
    const bundleClassIds = bundles.classes.map((c) => c.id);
    const withPhantomClass = [...bundleClassIds, 'necromancer'];
    const drift = axisDrift(MATRIX_CLASS_AXIS, withPhantomClass);
    expect(drift.missingFromMatrix, 'le garde-fou doit voir la 13ᵉ classe non couverte').toContain(
      'necromancer',
    );
    // Vert au retrait : le bundle réel reste parfaitement couvert.
    expect(axisDrift(MATRIX_CLASS_AXIS, bundleClassIds).missingFromMatrix).toEqual([]);
  });
});

describe('matrice L1 — rouge-avant-vert (persona volontairement invalide)', () => {
  it('Guerrier sans Weapon Mastery → valid:false + errors[] peuplé', async () => {
    const input = buildInvalidPersonaInput(bundles);
    const s = await submitWizardAndDeriveSheet(input);
    expect(s.valid).toBe(false);
    expect(s.errors.length).toBeGreaterThan(0);
    // L'erreur cite bien la garde de sous-choix de classe (pas une exception
    // parasite) — sinon le rouge serait un faux positif.
    expect(s.errors.join(' ')).toMatch(/sous-choix de classe/i);
  });
});
