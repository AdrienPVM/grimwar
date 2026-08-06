import { describe, expect, it } from 'vitest';

import { prepareDuplicateDraft } from '../duplicate-draft';

/**
 * M50 — dupliquer une entrée du catalogue. Le mode décide si les deux entrées
 * cohabitent ou si la maison écrase l'originale ; c'est le seul endroit où ça
 * se joue, d'où le test unitaire dédié.
 */
describe('prepareDuplicateDraft', () => {
  const base = { id: 'boule-de-feu', nameFr: 'Boule de feu', nameEn: 'Fireball' };

  it('mode « remplacer » : l’identifiant du catalogue est conservé tel quel', () => {
    expect(prepareDuplicateDraft(base, 'replace')).toEqual(base);
  });

  it('mode « copie » : identifiant décalé et nom suffixé dans les deux langues', () => {
    expect(prepareDuplicateDraft(base, 'copy')).toEqual({
      id: 'boule-de-feu-maison',
      nameFr: 'Boule de feu (maison)',
      nameEn: 'Fireball (maison)',
    });
  });

  it('mode « copie » sans nom anglais : le champ EN reste vide, pas « (maison) » seul', () => {
    const noEn = { ...base, nameEn: '' };
    expect(prepareDuplicateDraft(noEn, 'copy').nameEn).toBe('');
  });

  it('préserve les champs propres au formulaire', () => {
    const rich = { ...base, level: 3, school: 'evocation' };
    const out = prepareDuplicateDraft(rich, 'copy');
    expect(out.level).toBe(3);
    expect(out.school).toBe('evocation');
  });
});
