import { describe, expect, it } from 'vitest';

import {
  normalizeArmorProficiency,
  normalizeClassToolLabel,
  normalizeWeaponProficiencies,
  resolveCharacterProficiencies,
} from '../equipment-proficiencies';

/**
 * Maîtrises d'équipement — normalisation des chaînes SRD brutes (corrompues)
 * vers slugs canoniques + libellés FR officiels.
 *
 * Catégorie 3 (fidélité, valeurs figées) + catégorie 6 (cas-limites
 * corrompus) de la politique « Vérité du contenu ». Les données réelles de
 * `classes.json` sont volontairement éprouvées ici : « Heavy ar- mor »
 * (césure), « Light » vs « Light armor », et le split Roublard
 * (« …Finesse » + « Light property » sur deux éléments).
 */

describe('normalizeArmorProficiency', () => {
  it('mappe les variantes réelles de classes.json vers les slugs canoniques', () => {
    expect(normalizeArmorProficiency('Light')).toBe('light');
    expect(normalizeArmorProficiency('Light armor')).toBe('light');
    expect(normalizeArmorProficiency('Medium')).toBe('medium');
    expect(normalizeArmorProficiency('Medium armor')).toBe('medium');
    expect(normalizeArmorProficiency('Shields')).toBe('shields');
  });

  it('répare la césure d\'extraction « Heavy ar- mor » → heavy', () => {
    expect(normalizeArmorProficiency('Heavy ar- mor')).toBe('heavy');
  });

  it('renvoie null pour « None » et l\'inconnu', () => {
    expect(normalizeArmorProficiency('None')).toBeNull();
    expect(normalizeArmorProficiency('Whatever')).toBeNull();
  });
});

describe('normalizeWeaponProficiencies', () => {
  it('mappe Barbare/Guerrier : Simple + Martial → simple, martial', () => {
    expect(normalizeWeaponProficiencies(['Simple', 'Martial weapons'])).toEqual([
      'simple',
      'martial',
    ]);
  });

  it('Moine : « Martial weapons that have the Light property » → martial-light', () => {
    expect(
      normalizeWeaponProficiencies([
        'Simple weapons',
        'Martial weapons that have the Light property',
      ]),
    ).toEqual(['simple', 'martial-light']);
  });

  it('Roublard : le split « …Finesse » + « Light property » → un seul martial-finesse-or-light', () => {
    // C'est le cas-limite corrompu : le fragment « Light property » DOIT être
    // absorbé, pas produire une entrée parasite.
    expect(
      normalizeWeaponProficiencies([
        'Simple weapons',
        'Martial weapons that have the Finesse',
        'Light property',
      ]),
    ).toEqual(['simple', 'martial-finesse-or-light']);
  });

  it('Magicien : Simple weapons seul → simple', () => {
    expect(normalizeWeaponProficiencies(['Simple weapons'])).toEqual(['simple']);
  });
});

describe('normalizeClassToolLabel', () => {
  it('mappe les outils de classe vers les libellés FR officiels', () => {
    expect(normalizeClassToolLabel('Thieves’ Tools')).toBe('Outils de voleur');
    expect(normalizeClassToolLabel('Herbalism Kit')).toBe("Matériel d'herboriste");
    expect(normalizeClassToolLabel('Choose one type of Artisan’s Tools')).toBe(
      "Outils d'artisan (au choix)",
    );
    expect(normalizeClassToolLabel('Musical Instrument (see “Equipment”)')).toBe(
      'Instrument de musique',
    );
    expect(
      normalizeClassToolLabel('Choose 3 Musical Instruments (see “Equipment”)'),
    ).toBe('Trois instruments de musique (au choix)');
  });
});

describe('resolveCharacterProficiencies', () => {
  // Données réelles du bundle classes.json (vérifiées une fois en amont).
  const FIGHTER = {
    armorProficiencies: ['Light', 'Medium', 'Heavy ar- mor', 'Shields'],
    weaponProficiencies: ['Simple', 'Martial weapons'],
    toolProficiencies: [],
  };
  const ROGUE = {
    armorProficiencies: ['Light armor'],
    weaponProficiencies: [
      'Simple weapons',
      'Martial weapons that have the Finesse',
      'Light property',
    ],
    toolProficiencies: ['Thieves’ Tools'],
  };
  const WIZARD = {
    armorProficiencies: ['None'],
    weaponProficiencies: ['Simple weapons'],
    toolProficiencies: [],
  };

  const noItems = () => null;

  it('Guerrier : toutes armures (ordre canonique) + boucliers + armes courantes/guerre', () => {
    const out = resolveCharacterProficiencies({
      classes: [FIGHTER],
      resolveItemName: noItems,
    });
    expect(out.armor).toEqual([
      'Armures légères',
      'Armures intermédiaires',
      'Armures lourdes',
      'Boucliers',
    ]);
    expect(out.weapons).toEqual(['Armes courantes', 'Armes de guerre']);
    expect(out.tools).toEqual([]);
  });

  it('Roublard : armures légères + armes de guerre finesse/légère + outils de voleur (de classe)', () => {
    const out = resolveCharacterProficiencies({
      classes: [ROGUE],
      resolveItemName: noItems,
    });
    expect(out.armor).toEqual(['Armures légères']);
    expect(out.weapons).toEqual([
      'Armes courantes',
      'Armes de guerre dotées de la propriété Finesse ou Légère',
    ]);
    expect(out.tools).toEqual(['Outils de voleur']);
  });

  it('Magicien : « None » → aucune armure ; armes courantes seules', () => {
    const out = resolveCharacterProficiencies({
      classes: [WIZARD],
      resolveItemName: noItems,
    });
    expect(out.armor).toEqual([]);
    expect(out.weapons).toEqual(['Armes courantes']);
  });

  it('résout les outils de background (slug) en FR via items.json', () => {
    const out = resolveCharacterProficiencies({
      classes: [WIZARD],
      backgroundToolSlugs: ['calligraphers-supplies'],
      resolveItemName: (slug) =>
        slug === 'calligraphers-supplies' ? 'Matériel de calligraphe' : null,
    });
    expect(out.tools).toEqual(['Matériel de calligraphe']);
  });

  it('déduplique une maîtrise partagée par deux classes (multiclasse Guerrier + Roublard)', () => {
    const out = resolveCharacterProficiencies({
      classes: [FIGHTER, ROGUE],
      resolveItemName: noItems,
    });
    // « Armures légères » et « Armes courantes » apparaissent une seule fois.
    expect(out.armor.filter((a) => a === 'Armures légères')).toHaveLength(1);
    expect(out.weapons.filter((w) => w === 'Armes courantes')).toHaveLength(1);
    // Le Guerrier apporte « Armes de guerre », le Roublard la variante finesse/légère.
    expect(out.weapons).toContain('Armes de guerre');
    expect(out.weapons).toContain(
      'Armes de guerre dotées de la propriété Finesse ou Légère',
    );
  });
});
