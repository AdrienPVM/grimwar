import type { JSX } from 'react';

import { resolveSkillIds } from '@/features/wizard/steps/skill-resolver';
import { useContent } from '@/shared/hooks/use-content';
import { formatMetersValue } from '@/shared/lib/rules/distance';
import { getSkill } from '@/shared/lib/rules/skills';
import { localize, t, type StringKey } from '@/shared/lib/i18n';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import type {
  Ancestry,
  Background,
  ClassEntity,
} from '@/shared/types/content';

import { CodexField } from '../codex-ui';
import { TextEntityBrowser, type CodexEntry } from './text-entity-browser';

/**
 * Navigateurs « construction de perso » du Codex (plan 19) : espèces,
 * historiques, classes. Entités riches → corps structuré (description, traits,
 * aptitudes) via `CodexField` + listes nom/description. Tout dérivé des bundles.
 */

function lower(...parts: Array<string | null | undefined>): string {
  // `normalizeForSearch` et non un simple `toLowerCase` : le `searchText` est
  // la moitié CONTENU de la comparaison, et une seule des deux moitiés
  // normalisée ne sert à rien — « epee » ne rencontrerait toujours pas « épée ».
  return normalizeForSearch(parts.filter((p): p is string => Boolean(p)).join(' '));
}

/** Traduit une liste de noms de compétences bruités (EN/PDF) → FR, via SKILLS. */
function localizeSkills(rawNames: readonly string[]): string {
  const ids = resolveSkillIds([...rawNames]);
  const names = ids.map((id) => {
    const skill = getSkill(id);
    return skill ? localize(skill.name) : id;
  });
  return names.join(', ');
}

/**
 * Liste nom (doré) + description, partagée par traits d'espèce et aptitudes.
 *
 * `clamp` borne la description à 4 lignes. On l'active pour les aptitudes de
 * CLASSE : `classes.json[id].features[].description` agrège, pour la 1ʳᵉ
 * aptitude, la table de progression L1→L20 de la classe (artefact d'extraction
 * SRD — même donnée que la fiche, qui la `line-clamp` aussi). Le clamp contient
 * ce pavé tout en laissant lire la phrase d'intro propre. Les traits d'espèce,
 * eux, sont propres → pas de clamp.
 */
function NamedList({
  entries,
  clamp = false,
}: {
  entries: readonly { name: { fr: string; en?: string }; description: { fr: string; en?: string } }[];
  clamp?: boolean;
}): JSX.Element {
  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry, i) => (
        <li key={`${localize(entry.name)}-${i}`}>
          <p className="font-title text-[12px] font-bold uppercase tracking-[0.12em] text-gold-bright">
            {localize(entry.name)}
          </p>
          <p
            className={
              clamp
                ? 'mt-0.5 line-clamp-4 text-body-sm text-text-secondary'
                : 'mt-0.5 whitespace-pre-line text-body-sm text-text-secondary'
            }
          >
            {localize(entry.description)}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ── Espèces ──────────────────────────────────────────────────────────
export function buildAncestryEntries(ancestries: readonly Ancestry[]): CodexEntry[] {
  return ancestries.map((ancestry): CodexEntry => {
    const name = localize(ancestry.name);
    const sizeLabel = t(`size.${ancestry.size}` as StringKey);
    return {
      id: ancestry.id,
      name,
      eyebrow: t('codex.cat.ancestries'),
      meta: <span>{sizeLabel}</span>,
      searchText: lower(name, localize(ancestry.description)),
      body: (
        <>
          <p className="whitespace-pre-line">{localize(ancestry.description)}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <CodexField label={t('codex.species.size')}>{sizeLabel}</CodexField>
            <CodexField label={t('codex.species.speed')}>
              {formatMetersValue(ancestry.speed)} m
            </CodexField>
          </div>
          {ancestry.abilityScoreIncrease.length > 0 ? (
            <CodexField label={t('codex.species.asi')}>
              {ancestry.abilityScoreIncrease
                .map((a) => `${t(`ability.${a.ability}`)} +${a.bonus}`)
                .join(', ')}
            </CodexField>
          ) : null}
          {ancestry.traits.length > 0 ? (
            <CodexField label={t('codex.common.traits')}>
              <NamedList entries={ancestry.traits} />
            </CodexField>
          ) : null}
          {ancestry.languages.length > 0 ? (
            <CodexField label={t('codex.common.languages')}>
              {ancestry.languages.join(', ')}
            </CodexField>
          ) : null}
        </>
      ),
    };
  });
}

export function AncestryBrowser(): JSX.Element {
  const { data, loading } = useContent('ancestries');
  return (
    <TextEntityBrowser
      entries={buildAncestryEntries(data)}
      loading={loading}
      searchPlaceholder={t('codex.search.ancestries')}
    />
  );
}

// ── Historiques ──────────────────────────────────────────────────────
export function buildBackgroundEntries(
  backgrounds: readonly Background[],
): CodexEntry[] {
  return backgrounds.map((background): CodexEntry => {
    const name = localize(background.name);
    const skills = localizeSkills(background.skillProficiencies);
    return {
      id: background.id,
      name,
      eyebrow: t('codex.cat.backgrounds'),
      searchText: lower(name, localize(background.description), skills),
      body: (
        <>
          <p className="whitespace-pre-line">{localize(background.description)}</p>
          {skills ? (
            <CodexField label={t('codex.bg.skills')}>{skills}</CodexField>
          ) : null}
          {background.startingCoins ? (
            <CodexField label={t('codex.bg.coins')}>
              {background.startingCoins.qty} {background.startingCoins.unit}
            </CodexField>
          ) : null}
          <CodexField label={localize(background.feature.name)}>
            <span className="whitespace-pre-line">
              {localize(background.feature.description)}
            </span>
          </CodexField>
        </>
      ),
    };
  });
}

export function BackgroundBrowser(): JSX.Element {
  const { data, loading } = useContent('backgrounds');
  return (
    <TextEntityBrowser
      entries={buildBackgroundEntries(data)}
      loading={loading}
      searchPlaceholder={t('codex.search.backgrounds')}
    />
  );
}

// ── Classes ──────────────────────────────────────────────────────────
export function buildClassEntries(classes: readonly ClassEntity[]): CodexEntry[] {
  return classes.map((cls): CodexEntry => {
    const name = localize(cls.name);
    const primary = cls.primaryAbility
      .map((a) => t(`ability.${a}`))
      .join(', ');
    const saves = cls.saveProficiencies
      .map((a) => t(`ability.${a}`))
      .join(', ');
    const skillList = localizeSkills(cls.skillChoices.from);
    // Aptitudes triées par niveau (le bundle L1 n'en porte souvent qu'un).
    const features = [...cls.features].sort((a, b) => a.level - b.level);
    return {
      id: cls.id,
      name,
      eyebrow: t('codex.cat.classes'),
      meta: <span>{cls.hitDie}</span>,
      searchText: lower(name, localize(cls.description)),
      body: (
        <>
          <p className="whitespace-pre-line">{localize(cls.description)}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <CodexField label={t('codex.class.hitDie')}>{cls.hitDie}</CodexField>
            <CodexField label={t('codex.class.primaryAbility')}>
              {primary}
            </CodexField>
            <CodexField label={t('codex.class.savingThrows')}>{saves}</CodexField>
            {cls.skillChoices.count > 0 && skillList ? (
              <CodexField label={t('codex.class.skills')}>
                {cls.skillChoices.count} {t('codex.class.chooseAmong')} : {skillList}
              </CodexField>
            ) : null}
          </div>
          {features.length > 0 ? (
            <CodexField label={t('codex.class.features')}>
              <NamedList
                clamp
                entries={features.map((f) => ({
                  name: { fr: `${localize(f.name)} (niv. ${f.level})` },
                  description: f.description,
                }))}
              />
            </CodexField>
          ) : null}
        </>
      ),
    };
  });
}

export function ClassBrowser(): JSX.Element {
  const { data, loading } = useContent('classes');
  return (
    <TextEntityBrowser
      entries={buildClassEntries(data)}
      loading={loading}
      searchPlaceholder={t('codex.search.classes')}
    />
  );
}
