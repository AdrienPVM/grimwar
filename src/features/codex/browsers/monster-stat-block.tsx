import type { JSX } from 'react';

import { localize, t } from '@/shared/lib/i18n';
import type { Monster } from '@/shared/types/content';

import { CodexField, CodexModalShell } from '../codex-ui';

/** FP affiché en fraction lisible (1/8, 1/4, 1/2) sinon entier. */
export function formatCr(cr: number): string {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}

/** Vitesses non nulles → « 9 m, vol 18 m » (pieds → mètres, convention FR). */
function formatSpeed(speed: Monster['speed']): string {
  const parts: string[] = [];
  const toM = (ft: number): string => `${Math.round(ft * 0.3)} m`;
  if (speed.walk) parts.push(toM(speed.walk));
  if (speed.fly) parts.push(`${t('customContent.editor.monsterForm.speedFly')} ${toM(speed.fly)}`);
  if (speed.swim) parts.push(`${t('customContent.editor.monsterForm.speedSwim')} ${toM(speed.swim)}`);
  if (speed.climb) parts.push(`${t('customContent.editor.monsterForm.speedClimb')} ${toM(speed.climb)}`);
  if (speed.burrow)
    parts.push(`${t('customContent.editor.monsterForm.speedBurrow')} ${toM(speed.burrow)}`);
  return parts.join(', ');
}

/** Une ligne de bloc nom + description (traits, actions…). */
function NamedBlock({
  label,
  entries,
}: {
  label: string;
  entries: { name: { fr: string; en?: string }; description: { fr: string; en?: string } }[];
}): JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <CodexField label={label}>
      <ul className="flex flex-col gap-2">
        {entries.map((e, idx) => (
          <li key={idx}>
            <span className="font-semibold text-text">{localize(e.name)}.</span>{' '}
            <span className="whitespace-pre-line">{localize(e.description)}</span>
          </li>
        ))}
      </ul>
    </CodexField>
  );
}

interface MonsterStatBlockProps {
  monster: Monster;
  /** `id` du titre `<h2>` — relié à l'`aria-labelledby` du `DetailModal` parent. */
  titleId: string;
}

/**
 * Bloc de stats complet d'un monstre (CA, PV, vitesses en mètres, 6 caracs,
 * sens, FP/PX, résistances/immunités/langues, traits + actions + réactions +
 * actions légendaires) dans la mise en page du Codex. Le `<DetailModal>` parent
 * fournit le portal + la fermeture + le piège de focus.
 *
 * Extrait de `MonsterBrowser` pour être réutilisé hors Codex — notamment dans le
 * tracker de rencontre, où le MJ ouvre la fiche d'une créature liée à un
 * participant par son `monsterContentId`.
 */
export function MonsterStatBlock({ monster, titleId }: MonsterStatBlockProps): JSX.Element {
  return (
    <CodexModalShell
      titleId={titleId}
      title={localize(monster.name)}
      eyebrow={`${t(`size.${monster.size}` as 'size.medium')} · ${monster.type} · FP ${formatCr(monster.cr)}`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <CodexField label={t('customContent.editor.monsterForm.ac')}>
          {monster.ac}
          {monster.acDetail ? ` (${localize(monster.acDetail)})` : ''}
        </CodexField>
        <CodexField label={t('customContent.editor.monsterForm.hpAvg')}>
          {monster.hp.avg} ({monster.hp.formula})
        </CodexField>
        <CodexField label={t('customContent.editor.monsterForm.speedWalk')}>
          {formatSpeed(monster.speed)}
        </CodexField>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(['for', 'dex', 'con', 'int', 'sag', 'cha'] as const).map((code) => (
          <div key={code} className="text-center">
            <p className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              {t(`ability.${code}`)}
            </p>
            <p className="font-serif text-body text-text">{monster.abilities[code]}</p>
          </div>
        ))}
      </div>

      <CodexField label={t('codex.monster.senses')}>
        {t('customContent.editor.monsterForm.passivePerception')} {monster.senses.passivePerception}
        {monster.senses.darkvision
          ? ` · ${t('customContent.editor.monsterForm.darkvision')} ${Math.round(monster.senses.darkvision * 0.3)} m`
          : ''}
        {monster.senses.blindsight
          ? ` · ${t('customContent.editor.monsterForm.blindsight')} ${Math.round(monster.senses.blindsight * 0.3)} m`
          : ''}
        {monster.senses.tremorsense
          ? ` · ${t('customContent.editor.monsterForm.tremorsense')} ${Math.round(monster.senses.tremorsense * 0.3)} m`
          : ''}
        {monster.senses.truesight
          ? ` · ${t('customContent.editor.monsterForm.truesight')} ${Math.round(monster.senses.truesight * 0.3)} m`
          : ''}
      </CodexField>

      {monster.languages.length > 0 ? (
        <CodexField label={t('customContent.editor.monsterForm.languages')}>
          {monster.languages.join(', ')}
        </CodexField>
      ) : null}
      {monster.resistances.length > 0 ? (
        <CodexField label={t('customContent.editor.monsterForm.resistances')}>
          {monster.resistances.join(', ')}
        </CodexField>
      ) : null}
      {monster.immunities.length > 0 ? (
        <CodexField label={t('customContent.editor.monsterForm.immunities')}>
          {monster.immunities.join(', ')}
        </CodexField>
      ) : null}

      <NamedBlock label={t('customContent.editor.monsterForm.traits')} entries={monster.traits} />
      <NamedBlock label={t('customContent.editor.monsterForm.actions')} entries={monster.actions} />
      <NamedBlock
        label={t('customContent.editor.monsterForm.reactions')}
        entries={monster.reactions ?? []}
      />
      <NamedBlock
        label={t('customContent.editor.monsterForm.legendaryActions')}
        entries={monster.legendaryActions ?? []}
      />
    </CodexModalShell>
  );
}
