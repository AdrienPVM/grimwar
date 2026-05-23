import { useMemo, useState } from 'react';

import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { isSheetReadOnly } from './combat/hp-combat';
import { AncestrySpellsCard } from './magie/ancestry-spells-card';
import {
  buildAncestrySourceLabelMap,
  resolveAncestrySpellEntries,
} from './magie/ancestry-source-label';
import { MagicCircle } from './magie/magic-circle';
import { SpellDetailModal } from './magie/spell-detail-modal';
import { SpellList } from './magie/spell-list';
import { SpellStatsBar } from './magie/spell-stats-bar';
import { spellcastingClasses } from './magie/spell-slots';
import { WizardSpellbookSections } from './magie/wizard-spellbook-sections';

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
 *
 * Plan 13.8b — `AncestrySpellsCard` et `SpellList` partagent désormais
 * `setActiveSpell` : tout sort affiché (lignage OU classe) est consultable
 * d'un tap. La `SpellList` est rendue même sans classe lanceuse dès que des
 * sorts d'ascendance sont connus.
 */
export function MagieMode({ character }: MagieModeProps): JSX.Element {
  const readOnly = isSheetReadOnly(character);
  const { data: classCatalog } = useContent('classes');
  const { data: spells } = useContent('spells');
  const { data: ancestries } = useContent('ancestries');

  const castingClasses = useMemo(
    () => spellcastingClasses(character, classCatalog, localize),
    [character, classCatalog],
  );
  const castingClassIds = useMemo(
    () => castingClasses.map((c) => c.classId),
    [castingClasses],
  );

  // Label de source PAR SORT (plan 13.14b) — remplace l'ancien label global
  // par-ascendance qui mislabelait thaumaturgie en « Héritage X ». Source de
  // vérité = le résolveur canonique partagé avec la carte.
  const ancestrySourceLabels = useMemo(() => {
    const ancestry = ancestries.find((a) => a.id === character.ancestryId);
    if (!ancestry) return new Map<string, string>();
    return buildAncestrySourceLabelMap(
      resolveAncestrySpellEntries(character, ancestry, spells),
    );
  }, [character, ancestries, spells]);

  const [activeSpell, setActiveSpell] = useState<Spell | null>(null);

  // Sorts d'ascendance (plan 13.8) : un perso peut être « lanceur » sans classe
  // lanceuse — un Tieffelin Roublard L1 connaît Fire Bolt par exemple. On
  // n'affiche le placeholder « aucun art arcanique » que si NI classe lanceuse
  // NI sorts d'ascendance ne sont présents.
  const hasAncestrySpells = (character.knownSpells.ancestry ?? []).length > 0;

  // Source d'ascendance pour la modale détail — label propre au sort actif.
  const activeSpellAncestrySource = useMemo(() => {
    if (!activeSpell) return null;
    const label = ancestrySourceLabels.get(activeSpell.id);
    return label ? { label } : null;
  }, [activeSpell, ancestrySourceLabels]);

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
      <AncestrySpellsCard
        character={character}
        onSpellSelect={(spell) => setActiveSpell(spell)}
      />
      {/*
        Plan 13.9 commit 4c — décision Adrien (UAT 4b) : pour le Magicien
        mono-class (cas usuel S1), on rend la séparation visuelle Grimoire /
        Préparés. Pour tout autre caster (Sorcier, Barde, etc.) ou un
        Magicien multi-class, on conserve la <SpellList> générique avec son
        chip « Préparés » comme filtre.
      */}
      {isWizardMonoClass(castingClassIds) ? (
        <WizardSpellbookSections
          character={character}
          spells={spells}
          onSpellSelect={(spell) => setActiveSpell(spell)}
        />
      ) : (
        (castingClasses.length > 0 || hasAncestrySpells) && (
          <SpellList
            character={character}
            spells={spells}
            spellcasterClassIds={castingClassIds}
            ancestrySourceLabels={ancestrySourceLabels}
            onSpellSelect={(spell) => setActiveSpell(spell)}
          />
        )
      )}
      {activeSpell && (
        <SpellDetailModal
          character={character}
          spell={activeSpell}
          spellcastingClasses={castingClasses}
          ancestrySource={activeSpellAncestrySource}
          readOnly={readOnly}
          onClose={() => setActiveSpell(null)}
        />
      )}
    </section>
  );
}

/**
 * Mono-class Magicien : la seule classe lanceuse du perso est `wizard`. On
 * exclut le multi-class `wizard + autre caster` pour rester sur la
 * <SpellList> générique dans ce cas (le grimoire/préparés se mélange mal
 * avec une autre liste à L1 ; on cadrera ça à un plan ultérieur si jamais
 * un joueur multi-class).
 */
function isWizardMonoClass(castingClassIds: readonly string[]): boolean {
  return castingClassIds.length === 1 && castingClassIds[0] === 'wizard';
}
