import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize } from '@/shared/lib/i18n';
import { getFighterFightingStyle } from '@/shared/lib/rules/weapon-mastery';
import type { Character } from '@/shared/types/character';

interface FightingStyleCardProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Carte « Style de combat » du Guerrier (plan 13.9 step 28 — commit 4a).
 *
 * Lue depuis `classes[i].fighterFightingStyle` (1ère classe Guerrier active —
 * `getFighterFightingStyle`). Le contenu (nom + résumé) provient du bundle
 * `feats.json` filtré sur `category === 'fighting-style'`, jamais d'une
 * constante in-file : un seul slug d'enum mal aligné côté SRD fait planter le
 * lookup et la carte ne s'affiche pas — c'est précisément ce que le test
 * `bundle ↔ slug` du test file vérifie.
 *
 * Read-only : aucune interaction côté V1 — la carte documente l'effet pour
 * que le joueur sache quoi annoncer au MJ et que le moteur de dés (plan
 * ultérieur — cf. plan 13.9 step 28 « couplage moteur de dés ») puisse s'y
 * brancher plus tard.
 */
export function FightingStyleCard({
  character,
  readOnly,
}: FightingStyleCardProps): JSX.Element | null {
  const { data: feats } = useContent('feats');
  const style = getFighterFightingStyle(character);

  const feat = useMemo(() => {
    if (!style) return null;
    return feats.find((f) => f.id === style && f.category === 'fighting-style') ?? null;
  }, [feats, style]);

  if (!feat) return null;

  const name = localize(feat.name);
  // `summary` est nullable côté FeatSchema (certaines passes d'extraction
  // n'ont pas de résumé). Pour un Fighting Style SRD le résumé est toujours
  // présent dans le bundle livré — si l'extraction le perd, la carte
  // s'affiche sans corps plutôt que de planter.
  const summary = feat.summary ? localize(feat.summary) : null;

  return (
    <Card>
      <CardHeader>
        <h3>Style de combat</h3>
      </CardHeader>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4',
          readOnly && 'opacity-60',
        )}
        aria-label={`Style de combat : ${name}`}
      >
        <span className="font-display text-[16px] text-gold-bright">{name}</span>
        {summary && (
          <p className="font-serif text-[13px] text-text-secondary">{summary}</p>
        )}
      </div>
    </Card>
  );
}
