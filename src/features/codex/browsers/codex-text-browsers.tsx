import type { JSX } from 'react';

import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Condition, Feat, Invocation } from '@/shared/types/content';

import { CodexField } from '../codex-ui';
import { TextEntityBrowser, type CodexEntry } from './text-entity-browser';

/**
 * Navigateurs « texte » du Codex (plan 19) : dons, états, invocations. Chacun
 * charge son bundle via `useContent`, projette les entités vers `CodexEntry`,
 * puis délègue le rendu (recherche + liste + modale) au `TextEntityBrowser`
 * générique. Tout est dérivé du bundle SRD — aucune valeur en dur.
 */

function lower(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => Boolean(p))
    .join(' ')
    .toLocaleLowerCase('fr');
}

// ── Dons ─────────────────────────────────────────────────────────────
function buildFeatEntries(feats: readonly Feat[]): CodexEntry[] {
  return feats.map((feat): CodexEntry => {
    const name = localize(feat.name);
    const prereq = feat.prerequisite ? localize(feat.prerequisite) : null;
    const summary = feat.summary ? localize(feat.summary) : null;
    const description = feat.description ? localize(feat.description) : null;
    return {
      id: feat.id,
      name,
      eyebrow: t('codex.cat.feats'),
      meta: prereq ? (
        <span className="text-amethyst">
          {t('codex.detail.prerequisite')} · {prereq}
        </span>
      ) : null,
      searchText: lower(name, prereq, summary),
      body: (
        <>
          {prereq ? (
            <CodexField label={t('codex.detail.prerequisite')}>{prereq}</CodexField>
          ) : null}
          {summary ? <p>{summary}</p> : null}
          {description && description !== summary ? (
            <p className="whitespace-pre-line">{description}</p>
          ) : null}
        </>
      ),
    };
  });
}

export function FeatBrowser(): JSX.Element {
  const { data, loading } = useContent('feats');
  return (
    <TextEntityBrowser
      entries={buildFeatEntries(data)}
      loading={loading}
      searchPlaceholder={t('codex.search.feats')}
    />
  );
}

// ── États ────────────────────────────────────────────────────────────
function buildConditionEntries(conditions: readonly Condition[]): CodexEntry[] {
  return conditions.map((condition): CodexEntry => {
    const name = localize(condition.name);
    const description = localize(condition.description);
    return {
      id: condition.id,
      name,
      eyebrow: t('codex.cat.conditions'),
      searchText: lower(name, description),
      body: <p className="whitespace-pre-line">{description}</p>,
    };
  });
}

export function ConditionBrowser(): JSX.Element {
  const { data, loading } = useContent('conditions');
  return (
    <TextEntityBrowser
      entries={buildConditionEntries(data)}
      loading={loading}
      searchPlaceholder={t('codex.search.conditions')}
    />
  );
}

// ── Invocations ──────────────────────────────────────────────────────
function invocationPrereq(invocation: Invocation): string | null {
  const parts: string[] = [];
  if (invocation.prerequisiteWarlockLevel !== null) {
    parts.push(
      `${t('codex.detail.prereqLevel')} ${invocation.prerequisiteWarlockLevel}`,
    );
  }
  if (invocation.prerequisiteOther) {
    parts.push(localize(invocation.prerequisiteOther));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function buildInvocationEntries(
  invocations: readonly Invocation[],
): CodexEntry[] {
  return invocations.map((invocation): CodexEntry => {
    const name = localize(invocation.name);
    const summary = localize(invocation.summary);
    const prereq = invocationPrereq(invocation);
    return {
      id: invocation.id,
      name,
      eyebrow: t('codex.cat.invocations'),
      meta: prereq ? <span className="text-amethyst">{prereq}</span> : null,
      searchText: lower(name, summary, prereq),
      body: (
        <>
          {prereq ? (
            <CodexField label={t('codex.detail.prerequisite')}>{prereq}</CodexField>
          ) : null}
          <p className="whitespace-pre-line">{summary}</p>
        </>
      ),
    };
  });
}

export function InvocationBrowser(): JSX.Element {
  const { data, loading } = useContent('invocations');
  return (
    <TextEntityBrowser
      entries={buildInvocationEntries(data)}
      loading={loading}
      searchPlaceholder={t('codex.search.invocations')}
    />
  );
}
