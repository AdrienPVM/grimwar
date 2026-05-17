import { useMemo, useState } from 'react';

import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { isSheetReadOnly } from './combat/hp-combat';
import { AncestrySpellsCard } from './magie/ancestry-spells-card';
import { MagicCircle } from './magie/magic-circle';
import { SpellDetailModal } from './magie/spell-detail-modal';
import { SpellList } from './magie/spell-list';
import { SpellStatsBar } from './magie/spell-stats-bar';
import { spellcastingClasses } from './magie/spell-slots';

interface MagieModeProps {
  character: Character;
}

/**
 * Mode Magie : barre de stats par classe lanceuse, cercle d'invocation
 * (emplacements unifiés), liste de sorts connus + recherche + filtres, et modal
 * détail de sort avec flow de lancement (consommation slot + concentration +
 * roll de dégâts heuristique). Pas de jet d'attaque automatique — passage par
 * le radial (plan 11) ou bouton "Jet d'att." de la modale via rollWithFlags.
 *
 * Read-only (status === 'dead') désactive toutes les interactions (cercle,
 * lancement) via la prop `readOnly` propagée à chaque sous-composant.
 */
export function MagieMode({ character }: MagieModeProps): JSX.Element {
  const readOnly = isSheetReadOnly(character);
  const { data: classCatalog } = useContent('classes');
  const { data: spells } = useContent('spells');

  const castingClasses = useMemo(
    () => spellcastingClasses(character, classCatalog, localize),
    [character, classCatalog],
  );
  const castingClassIds = useMemo(
    () => castingClasses.map((c) => c.classId),
    [castingClasses],
  );

  const [activeSpell, setActiveSpell] = useState<Spell | null>(null);

  // Sorts d'ascendance (plan 13.8) : un perso peut être « lanceur » sans classe
  // lanceuse — un Tieffelin Roublard L1 connaît Fire Bolt par exemple. On
  // n'affiche le placeholder « aucun art arcanique » que si NI classe lanceuse
  // NI sorts d'ascendance ne sont présents.
  const hasAncestrySpells = (character.knownSpells.ancestry ?? []).length > 0;
  if (castingClasses.length === 0 && !hasAncestrySpells) {
    return (
      <section
        role="tabpanel"
        id="sheet-mode-panel-magie"
        aria-labelledby="sheet-mode-tab-magie"
        className="mx-auto mt-4 flex w-full max-w-[460px] flex-col gap-3 px-4"
      >
        <p className="rounded-card border border-soft bg-glass px-6 py-8 text-center font-serif italic text-text-tertiary">
          Cette aventurière ne connaît aucun art arcanique. Aucune classe lanceuse de sorts.
        </p>
      </section>
    );
  }

  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-magie"
      aria-labelledby="sheet-mode-tab-magie"
      className="mx-auto mt-4 flex w-full max-w-[460px] flex-col gap-3 px-4"
    >
      {castingClasses.length > 0 ? (
        <>
          <SpellStatsBar character={character} spellcastingClasses={castingClasses} />
          <MagicCircle character={character} readOnly={readOnly} />
        </>
      ) : null}
      <AncestrySpellsCard character={character} />
      {castingClasses.length > 0 ? (
        <SpellList
          character={character}
          spells={spells}
          spellcasterClassIds={castingClassIds}
          onSpellSelect={(spell) => setActiveSpell(spell)}
        />
      ) : null}
      {activeSpell && (
        <SpellDetailModal
          character={character}
          spell={activeSpell}
          spellcastingClasses={castingClasses}
          readOnly={readOnly}
          onClose={() => setActiveSpell(null)}
        />
      )}
    </section>
  );
}
