import { useMemo, useState } from 'react';

import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import { isPreparedCaster } from '@/shared/lib/rules/spell-preparation';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { useSheetReadOnly } from '../permissions-context';
import { AncestrySpellsCard } from './magie/ancestry-spells-card';
import { resolveAncestrySpellUsage } from './magie/ancestry-spell-usage';
import {
  buildAncestrySourceLabelMap,
  resolveAncestrySpellEntries,
} from './magie/ancestry-source-label';
import { MagicCircle } from './magie/magic-circle';
import {
  buildPactTomeSourceLabelMap,
  resolvePactTomeSpellEntries,
} from './magie/pact-tome-source-label';
import { PreparationEditor } from './magie/preparation-editor';
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
 * Read-only (status === 'dead' OU lecture MJ `!canEdit`) désactive toutes les
 * interactions (cercle, lancement) via la prop `readOnly` propagée à chaque
 * sous-composant.
 *
 * Plan 13.8b — `AncestrySpellsCard` et `SpellList` partagent désormais
 * `setActiveSpell` : tout sort affiché (lignage OU classe) est consultable
 * d'un tap. La `SpellList` est rendue même sans classe lanceuse dès que des
 * sorts d'ascendance sont connus.
 */
export function MagieMode({ character }: MagieModeProps): JSX.Element {
  const readOnly = useSheetReadOnly(character);
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

  // Ascendance résolue du perso + ses entrées de sorts (label + niveau de
  // déblocage). Source de vérité partagée carte / liste / modale.
  const ancestry = useMemo(
    () => ancestries.find((a) => a.id === character.ancestryId) ?? null,
    [ancestries, character.ancestryId],
  );
  const ancestryEntries = useMemo(
    () => (ancestry ? resolveAncestrySpellEntries(character, ancestry, spells) : []),
    [character, ancestry, spells],
  );

  // Label de source PAR SORT (plan 13.14b) — remplace l'ancien label global
  // par-ascendance qui mislabelait thaumaturgie en « Héritage X ».
  const ancestrySourceLabels = useMemo(
    () => buildAncestrySourceLabelMap(ancestryEntries),
    [ancestryEntries],
  );

  // D13e-followup-grant-display — sorts grantés par l'invocation `pact-of-the-
  // tome` (3 cantrips + 2 rituels L1) persistés dans `classes[i].pactTomeCantrips`
  // / `.pactTomeRituals`. Rendu dans la SpellList avec chip dédié « Pacte du
  // grimoire » + modale détail.
  const pactTomeSourceLabels = useMemo(
    () => buildPactTomeSourceLabelMap(resolvePactTomeSpellEntries(character, spells)),
    [character, spells],
  );

  const [activeSpell, setActiveSpell] = useState<Spell | null>(null);

  // Sorts d'ascendance (plan 13.8) : un perso peut être « lanceur » sans classe
  // lanceuse — un Tieffelin Roublard L1 connaît Fire Bolt par exemple. On
  // n'affiche le placeholder « aucun art arcanique » que si NI classe lanceuse
  // NI sorts d'ascendance ne sont présents.
  const hasAncestrySpells = (character.knownSpells.ancestry ?? []).length > 0;
  const hasPactTomeSpells = pactTomeSourceLabels.size > 0;

  // Source d'ascendance pour la modale détail — label + spec d'usage (D12b) +
  // niveau de déblocage propres au sort actif. `usage` null pour un cantrip.
  const activeSpellAncestrySource = useMemo(() => {
    if (!activeSpell || !ancestry) return null;
    const entry = ancestryEntries.find((e) => e.spell.id === activeSpell.id);
    if (!entry) return null;
    return {
      label: entry.sourceLabel,
      usage: resolveAncestrySpellUsage(ancestry, activeSpell.id, character.totalLevel),
      unlockedAt: entry.unlockedAt,
    };
  }, [activeSpell, ancestry, ancestryEntries, character.totalLevel]);

  // Source Pacte du grimoire pour la modale détail — label propre au sort
  // actif. `null` si le sort ne vient pas du Pacte.
  const activeSpellPactTomeSource = useMemo(() => {
    if (!activeSpell) return null;
    const label = pactTomeSourceLabels.get(activeSpell.id);
    return label ? { label } : null;
  }, [activeSpell, pactTomeSourceLabels]);

  if (castingClasses.length === 0 && !hasAncestrySpells && !hasPactTomeSpells) {
    return (
      <section
        role="tabpanel"
        id="sheet-mode-panel-magie"
        aria-labelledby="sheet-mode-tab-magie"
        className="mx-auto mt-4 flex w-full max-w-[420px] flex-col gap-3 px-4 lg:max-w-[720px] lg:px-0"
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
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col gap-3 px-4 lg:max-w-[720px] lg:px-0"
    >
      {castingClasses.length > 0 ? (
        <>
          <SpellStatsBar character={character} spellcastingClasses={castingClasses} />
          <MagicCircle character={character} readOnly={readOnly} />
        </>
      ) : null}
      {/*
        Préparation des sorts — un éditeur par classe préparatrice de liste
        complète (Clerc, Druide, Paladin). Le Magicien prépare depuis son
        grimoire (`WizardSpellbookSections`) ; les connaisseurs (Barde,
        Ensorceleur, Rôdeur, Occultiste) n'ont pas d'éditeur. La carte se
        masque d'elle-même si rien n'est préparable.
      */}
      {castingClasses
        .filter((c) => isPreparedCaster(c.classId) && c.classId !== 'wizard')
        .map((c) => (
          <PreparationEditor
            key={c.classId}
            character={character}
            classId={c.classId}
            className={c.name}
            classLevel={c.level}
            readOnly={readOnly}
          />
        ))}
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
          readOnly={readOnly}
        />
      ) : (
        (castingClasses.length > 0 || hasAncestrySpells || hasPactTomeSpells) && (
          <SpellList
            character={character}
            spells={spells}
            spellcasterClassIds={castingClassIds}
            ancestrySourceLabels={ancestrySourceLabels}
            pactTomeSourceLabels={pactTomeSourceLabels}
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
          pactTomeSource={activeSpellPactTomeSource}
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
