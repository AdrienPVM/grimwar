import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { classifyCastingTime } from '../casting-time';

describe('classifyCastingTime', () => {
  it('range les trois économies d’action du SRD', () => {
    expect(classifyCastingTime('Action')).toBe('action');
    expect(classifyCastingTime('Bonus Action')).toBe('bonus');
    expect(classifyCastingTime('Reaction')).toBe('reaction');
  });

  it('suit le déclencheur qui prolonge une Réaction', () => {
    expect(
      classifyCastingTime('Reaction, which you take when you are hit by an attack roll'),
    ).toBe('reaction');
    expect(
      classifyCastingTime('Bonus Action, which you take immediately after hitting a creature'),
    ).toBe('bonus');
  });

  it('classe « Action or Ritual » comme une action', () => {
    // Le rituel est une seconde voie, pas une autre économie d'action.
    expect(classifyCastingTime('Action or Ritual')).toBe('action');
  });

  it('exclut ce qui ne tient pas dans un tour', () => {
    // Ranger « 1 minute » avec les actions promettrait au joueur une option
    // qu'il n'a pas en combat.
    expect(classifyCastingTime('1 minute')).toBe('other');
    expect(classifyCastingTime('10 minutes')).toBe('other');
    expect(classifyCastingTime('1 hour or Ritual')).toBe('other');
  });

  it("ne classe PAS d'après le français, dont l'extraction porte des coupures", () => {
    // « action Bonus, que vous entre- prenez… » : la césure du PDF survit dans
    // le FR. L'EN, lui, commence toujours par le terme nu — d'où le choix.
    expect(classifyCastingTime('Bonus Action, which you take')).toBe('bonus');
  });
});

describe('couverture réelle du bundle SRD', () => {
  it('classe chaque temps d’incantation du bundle sans retomber sur « other » par accident', () => {
    const raw: unknown = JSON.parse(readFileSync('public/data/spells.json', 'utf-8'));
    const spells = (Array.isArray(raw) ? raw : []) as {
      castingTime: { en: string; fr: string };
    }[];
    expect(spells.length).toBeGreaterThan(300);

    const buckets = { action: 0, bonus: 0, reaction: 0, other: 0 };
    for (const spell of spells) buckets[classifyCastingTime(spell.castingTime.en)] += 1;

    // Valeurs figées contre le bundle courant : si un rebuild de contenu
    // déplaçait des sorts d'une économie à l'autre, la carte « En dehors de ton
    // action » changerait en silence. Ces nombres sont la sentinelle.
    expect(buckets.action).toBe(257);
    expect(buckets.bonus).toBe(23);
    expect(buckets.reaction).toBe(4);
    expect(buckets.other).toBe(55);
  });
});
