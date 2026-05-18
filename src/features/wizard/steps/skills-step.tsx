import { useMemo, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import {
  buildSkillSources,
  getSkillsGrantedByOtherSources,
  type SkillSource,
} from '@/shared/lib/rules/skill-proficiencies';
import { SKILLS } from '@/shared/lib/rules/skills';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { applyReferenceSkills } from '../reference-builds/builds';
import { StepIntro } from '../help/help-panel';

import { RogueExpertiseChooser } from './class/rogue-expertise-chooser';
import { resolveSkillIds } from './skill-resolver';

/**
 * Étape Compétences (plan 05 §D.6 + fix UAT 13.8 2026-05-18).
 *
 * Le step affiche les 18 skills SRD et permet au joueur de cocher exactement
 * `primaryClass.skillChoices.count` skills parmi le pool autorisé par sa
 * classe. AVANT le fix 13.8 UAT, le step ne lisait que background + classe —
 * `draft.ancestrySubChoices.ancestryExtraSkill` (Humain Compétent, Elfe Sens
 * Aiguisés) était ignoré, et `draft.backgroundSkills` n'était pas écrit dans
 * `character.skills` au submit. Désormais :
 *   - background ET ancestry grant des skills cochées+verrouillées avec tag
 *     de source distinct (« Via historique » / « Via ascendance »).
 *   - le pool de picks de classe exclut visuellement les skills déjà
 *     accordées (anti-doublon SRD — on ne maîtrise pas une skill deux fois).
 *   - le `count` exigé reste celui de la classe (ex. Magicien = 2) : si le
 *     pool est réduit par un grant externe, le joueur ne perd pas un pick,
 *     il choisit parmi les skills restantes.
 *   - l'autofill « Choisir pour moi » pioche dans `allowed - granted`, ne
 *     proposera jamais une skill déjà accordée par ailleurs.
 */
export function SkillsStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);

  const classes = useContent('classes');
  const backgrounds = useContent('backgrounds');

  const primaryClass = useMemo(
    () => classes.data.find((c) => c.id === draft.primaryClassId) ?? null,
    [classes.data, draft.primaryClassId],
  );
  const background = useMemo(
    () => backgrounds.data.find((b) => b.id === draft.backgroundId) ?? null,
    [backgrounds.data, draft.backgroundId],
  );

  // Skills accordées par l'historique, résolues en IDs canoniques. Les noms
  // bruts dans `backgrounds.json` peuvent inclure du bruit d'extraction PDF
  // (cf. `resolve-skill`) — on normalise ici une fois.
  const backgroundSkills = useMemo(
    () => resolveSkillIds(background?.skillProficiencies ?? []),
    [background],
  );

  // Pool autorisé par la classe primaire, résolu en IDs canoniques.
  const allowed = useMemo(
    () => resolveSkillIds(primaryClass?.skillChoices.from ?? []),
    [primaryClass],
  );

  // Skills déjà accordées via background OU ancestry — verrouillées dans
  // l'UI, retirées du pool consommable par les picks de classe.
  const granted = useMemo(
    () => getSkillsGrantedByOtherSources(backgroundSkills, draft.ancestrySubChoices),
    [backgroundSkills, draft.ancestrySubChoices],
  );

  // Pool effectif pour les picks de classe = `allowed` MOINS `granted`. C'est
  // ce qu'on passe à `applyReferenceSkills` pour éviter qu'il propose une
  // skill déjà acquise.
  const pickablePool = useMemo(
    () => allowed.filter((id) => !granted.includes(id)),
    [allowed, granted],
  );

  // Mapping skill → sources, pour afficher le tag de source à côté de chaque
  // skill cochée. Inclut les picks de classe (purement informatif si pas
  // verrouillé, sert surtout pour les skills granted background/ancestry).
  const sources = useMemo(
    () =>
      buildSkillSources({
        backgroundSkills,
        ancestrySubChoices: draft.ancestrySubChoices,
        pickedSkills: draft.pickedSkills,
        expertiseSkills: [],
      }),
    [backgroundSkills, draft.ancestrySubChoices, draft.pickedSkills],
  );

  const count = primaryClass?.skillChoices.count ?? 0;
  const pickedCount = draft.pickedSkills.length;

  const togglePick = (skillId: string): void => {
    // Verrouille tout skill accordé par background ou ancestry — pas re-piquable.
    if (granted.includes(skillId)) return;
    // Verrouille toute skill hors du pool de la classe.
    if (!pickablePool.includes(skillId)) return;
    const currentlyPicked = draft.pickedSkills.includes(skillId);
    if (currentlyPicked) {
      setField(
        'pickedSkills',
        draft.pickedSkills.filter((s) => s !== skillId),
      );
    } else if (pickedCount < count) {
      setField('pickedSkills', [...draft.pickedSkills, skillId]);
    }
  };

  const handleAutoFill = (): void => {
    if (!primaryClass) return;
    // Pool réduit déjà — l'autofill ne picke jamais une skill granted ailleurs.
    const picks = applyReferenceSkills(primaryClass.id, pickablePool, count);
    setField('pickedSkills', picks);
  };

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.skills.intro')}</StepIntro>

      <p className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
        {t('wizard.skills.toPick')} : {pickedCount} / {count}
      </p>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {SKILLS.map((s) => {
          const skillSources = sources[s.id] ?? [];
          const isGranted = granted.includes(s.id);
          const isInPickablePool = pickablePool.includes(s.id);
          const isPicked = draft.pickedSkills.includes(s.id) || isGranted;
          const disabled = isGranted || !isInPickablePool;
          const tag = formatSourceTag(skillSources, { isInPickablePool });
          return (
            <Checkbox
              key={s.id}
              checked={isPicked}
              disabled={disabled}
              onChange={() => togglePick(s.id)}
              label={
                <span>
                  {localize(s.name)}{' '}
                  {tag ? (
                    <span
                      className={
                        tag.variant === 'granted'
                          ? 'font-title text-meta text-gold-bright tracking-[0.18em]'
                          : 'font-title text-meta text-text-faint tracking-[0.18em]'
                      }
                    >
                      ({tag.label})
                    </span>
                  ) : null}
                </span>
              }
            />
          );
        })}
      </div>

      <div>
        <Button
          variant="secondary"
          size="md"
          onClick={handleAutoFill}
          disabled={!primaryClass}
        >
          ✨ {t('wizard.action.autofill')}
        </Button>
      </div>

      {/* Roublard : l'Expertise se choisit ici, pas à l'étape Classe (Option B
          plan 13.9 UAT 2026-05-18). Le pool est calculé en live depuis
          background + ancestry + pickedSkills — le chooser réagit à chaque
          coche/décoche de la grille ci-dessus. */}
      {draft.primaryClassId === 'rogue' ? <RogueExpertiseChooser /> : null}
    </section>
  );
}

interface SkillTag {
  /** Texte court affiché entre parenthèses à côté de la skill. */
  label: string;
  /** `granted` = doré (accordé), `disabled` = grisé (hors classe). */
  variant: 'granted' | 'disabled';
}

/**
 * Formate le tag de source pour une skill donnée. Règle :
 *   - background → « Via historique »
 *   - ancestry → « Via ascendance »
 *   - class-expertise (13.9) → « Expertise »
 *   - hors classe (rien de tout ça + pas dans pool) → « Hors classe »
 *   - pure class-pick sans source verrouillée → pas de tag (déjà signalé
 *     par la coche)
 *
 * Quand plusieurs sources coexistent (doublon background+pick par exemple),
 * on priorise background > ancestry > expertise pour le tag visible — c'est
 * la source qui « verrouille » qui prime sémantiquement.
 */
function formatSourceTag(
  sources: readonly SkillSource[],
  ctx: { readonly isInPickablePool: boolean },
): SkillTag | null {
  if (sources.includes('background')) {
    return { label: t('wizard.skills.fromBackground'), variant: 'granted' };
  }
  if (sources.includes('ancestry')) {
    return { label: t('wizard.skills.fromAncestry'), variant: 'granted' };
  }
  if (sources.includes('class-expertise')) {
    return { label: t('wizard.skills.fromClassExpertise'), variant: 'granted' };
  }
  if (!ctx.isInPickablePool) {
    return { label: t('wizard.skills.notAllowed'), variant: 'disabled' };
  }
  return null;
}
