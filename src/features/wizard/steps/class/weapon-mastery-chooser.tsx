import { useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { getEligibleWeaponMasteryIds } from '@/shared/lib/rules/weapon-mastery';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { WeaponMasteryProperty } from '@/shared/types/content';

import {
  WEAPON_MASTERY_HELP,
  applyWeaponName,
} from '../../help/weapon-mastery-help';
import { HelpPanel } from '../../help/help-panel';
import { HelpTriggerButton } from '../../help/help-trigger-button';
import { ListWithHelpPanel } from '../../help/list-with-help-panel';
import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { toggleBoundedSelection } from './chooser-utils';
import { getRequiredCount } from './use-class-sub-choices';

/**
 * Chooser Weapon Mastery — composant générique partagé par Barbare, Guerrier,
 * Paladin, Rôdeur, Roublard (SRD 5.2.1).
 *
 * Le `count` exact vient de `class.weaponMasteryCount` du bundle (2 ou 3).
 * Les armes éligibles viennent de `getEligibleWeaponMasteryIds(classId)` qui
 * filtre les armes SRD selon les maîtrises de classe.
 *
 * Multi-sélection bornée : tap sur une carte cochée → décoche ; tap sur une
 * carte non cochée → coche si on a encore de la place, sinon refuse (UX :
 * grise visuellement les cartes restantes quand on a atteint la borne).
 *
 * Panneau d'aide :
 * - **Desktop** : preview latérale (hover/focus) qui décrit la propriété.
 *   Source unique des libellés FR = `WEAPON_MASTERY_HELP[prop].label`.
 * - **Mobile** (correctif UAT 2026-05-19 Bug A) : bouton « ? » par carte qui
 *   ouvre une `<DetailModal>` portée au `body`. Sans le `?` mobile, le
 *   panneau latéral est `md:hidden` → mobile = zéro accès à l'aide.
 *
 * Bug B (UAT 2026-05-19) : le `example` de chaque propriété contient un
 * placeholder `{weapon}` substitué par le nom localisé de l'arme cliquée —
 * sinon, toutes les armes d'une même propriété (Rapière, Pistolet, Arc
 * court… toutes en `vex`) affichaient toutes "Rapière : …", ce qui est
 * factuellement faux sur 37 armes sur 38.
 */
interface Props {
  /** classId concerné (présent dans `draft.classes[]`). */
  classId: string;
}

export function WeaponMasteryChooser({ classId }: Props): JSX.Element {
  const items = useContent('items');
  const classes = useContent('classes');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === classId) ?? null,
  );

  const count = useMemo(
    () => getRequiredCount(classId, 'weaponMasteries', classes.data),
    [classId, classes.data],
  );

  // JALON 2A.5 — la politique d'éligibilité est désormais portée par la
  // donnée (`weaponMasteryEligibility` sur `ClassEntity`). On lit le champ
  // depuis le bundle classe résolu et on le passe à
  // `getEligibleWeaponMasteryIds` — plus de switch classId côté code.
  const eligibility = useMemo(() => {
    const cls = classes.data.find((c) => c.id === classId);
    return cls?.weaponMasteryEligibility ?? null;
  }, [classId, classes.data]);

  const eligible = useMemo(
    () => getEligibleWeaponMasteryIds(eligibility, items.data, 'fr'),
    [eligibility, items.data],
  );

  const selected = entry?.weaponMasteries ?? [];

  const [previewProperty, setPreviewProperty] =
    useState<WeaponMasteryProperty | null>(null);
  // ID de l'arme dont la modale `?` est ouverte (mobile only — sur desktop
  // le panneau latéral suffit). On garde l'**id de l'arme**, pas la
  // propriété, parce que le contenu modal a besoin du nom localisé pour
  // substituer `{weapon}` dans l'exemple.
  const [modalWeaponId, setModalWeaponId] = useState<string | null>(null);

  if (eligible.length === 0 || count === 0)
    return (
      <ChooserMissingDataBanner
        chooserKey={`weapon-mastery-${classId}`}
        contentType="items"
      />
    );

  const remaining = count - selected.length;
  const reachedCap = selected.length >= count;

  const modalWeapon = modalWeaponId
    ? eligible.find((it) => it.id === modalWeaponId) ?? null
    : null;
  const modalEntry = modalWeapon
    ? WEAPON_MASTERY_HELP[modalWeapon.masteryProperty as WeaponMasteryProperty]
    : null;

  const list = (
    <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
      <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
        {t('wizard.subchoice.weaponMastery.legend')}
      </legend>
      <p className="font-serif text-[13px] text-text-tertiary -mt-1">
        {t('wizard.subchoice.weaponMastery.helper').replace('{count}', String(count))}
      </p>
      <p
        className="font-serif text-[13px] text-text-secondary"
        aria-live="polite"
      >
        {selected.length} / {count}
        {remaining > 0 ? (
          <span className="ml-2 text-text-tertiary">
            {t('wizard.subchoice.weaponMastery.remaining').replace(
              '{n}',
              String(remaining),
            )}
          </span>
        ) : null}
      </p>
      <div
        role="group"
        aria-label={t('wizard.subchoice.weaponMastery.legend')}
        className="grid gap-2.5 grid-cols-1 sm:grid-cols-2"
      >
        {eligible.map((it) => {
          const checked = selected.includes(it.id);
          const disabled = !checked && reachedCap;
          const property = it.masteryProperty as WeaponMasteryProperty;
          const label = WEAPON_MASTERY_HELP[property].label;
          const name = localize(it.name);
          return (
            <div
              key={it.id}
              className="relative"
              onMouseEnter={() => setPreviewProperty(property)}
              onFocus={() => setPreviewProperty(property)}
            >
              <label
                htmlFor={`weapon-mastery-${classId}-${it.id}`}
                className={cn(
                  'group relative flex min-h-[68px] cursor-pointer flex-col gap-1 rounded-card border p-3 pr-12',
                  'transition-all duration-150 ease-base',
                  'focus-within:ring-2 focus-within:ring-gold-bright/40',
                  checked
                    ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                    : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <input
                  id={`weapon-mastery-${classId}-${it.id}`}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    const next = toggleBoundedSelection(selected, it.id, count);
                    setClassSubChoice(classId, 'weaponMasteries', next);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'font-display text-[15px]',
                    checked ? 'text-gold-bright' : 'text-gold',
                  )}
                >
                  {name}
                </span>
                <span className="font-serif text-[13px] text-text">
                  {t('wizard.subchoice.weaponMastery.propertyPrefix')} · {label}
                </span>
              </label>
              <HelpTriggerButton
                ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                onClick={() => setModalWeaponId(it.id)}
                className="absolute top-1 right-1"
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );

  const previewEntry = previewProperty ? WEAPON_MASTERY_HELP[previewProperty] : null;
  // En desktop le previewProperty est rattaché à la dernière arme survolée ;
  // pour la substitution, on cherche dans `eligible` la 1ère arme qui a cette
  // propriété — c'est cohérent : sur desktop la preview est une fiche
  // « propriété », pas « arme + propriété ».
  const previewWeaponName = previewProperty
    ? localize(
        eligible.find((it) => it.masteryProperty === previewProperty)?.name ?? {
          fr: '',
          en: '',
        },
      )
    : '';

  return (
    <>
      <ListWithHelpPanel
        list={list}
        panel={
          previewEntry ? (
            <HelpPanel
              title={previewEntry.label}
              tagline={previewEntry.tagline}
              whyChoose={previewEntry.effect}
              inGame={[applyWeaponName(previewEntry.example, previewWeaponName)]}
            />
          ) : null
        }
        panelKey={previewProperty ? `mastery:${previewProperty}` : undefined}
      />
      <DetailModal
        open={modalEntry !== null}
        onClose={() => setModalWeaponId(null)}
        titleId={`weapon-mastery-${classId}-detail-modal-title`}
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modalEntry && modalWeapon ? (
          <div className="p-4 sm:p-5">
            <HelpPanel
              title={localize(modalWeapon.name)}
              tagline={modalEntry.tagline}
              whyChoose={modalEntry.effect}
              inGame={[applyWeaponName(modalEntry.example, localize(modalWeapon.name))]}
              headingId={`weapon-mastery-${classId}-detail-modal-title`}
            />
          </div>
        ) : null}
      </DetailModal>
    </>
  );
}
