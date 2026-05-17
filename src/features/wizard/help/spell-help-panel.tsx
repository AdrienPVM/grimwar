import type { JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { localize, t, type StringKey } from '@/shared/lib/i18n';
import type { Spell } from '@/shared/types/content';

/**
 * Panneau de détail d'un sort, conçu pour l'étape Sorts du wizard (plan 05
 * UAT — point 1). Mêmes codes visuels que `HelpPanel` (header doré, méta-row,
 * description sérif), mais structuré autour de la donnée canonique d'un sort
 * (`Spell` depuis `spells.json`).
 *
 * Le texte n'est PAS rédigé — il provient directement de la donnée SRD
 * (`description`, `castingTime`, `range`, `duration`, `components`,
 * `atHigherLevels`). Aucun champ inventé : si le pipeline n'a pas extrait un
 * champ, on n'affiche rien plutôt que de bricoler un placeholder.
 *
 * Hauteur naturelle : le wrapper `ListWithHelpPanel` ne contraint plus le
 * panneau en hauteur ni en scroll (UAT post-plan 05 — un panneau hover ne peut
 * pas être scrollable). Les descriptions longues s'étendent vers le bas dans
 * la colonne dédiée, sans jamais reflower la colonne liste à côté.
 *
 * Pédagogie débutant (UAT post-plan 05 — point 2) :
 *   - Les composantes V/S/M sont développées en clair ("Verbale", "Somatique",
 *     "Matérielle") avec une glose courte qui explique ce que ça implique en
 *     jeu — un novice ne peut pas deviner "V" sans contexte.
 *   - Les drapeaux "Concentration" et "Rituel" reçoivent une glose juste sous
 *     les badges, parce que ces deux mécaniques ont un impact pratique fort
 *     mais ne sont pas évidentes (un seul sort de concentration à la fois,
 *     rituel = 10 min sans slot).
 */

interface Props {
  spell: Spell;
  /**
   * ID DOM optionnel posé sur le titre `<h3>`. Branché par `<DetailModal>` à
   * `aria-labelledby` pour annoncer la modale aux lecteurs d'écran.
   */
  headingId?: string;
  className?: string;
}

const SCHOOL_LABEL_KEY: Record<Spell['school'], StringKey> = {
  abjuration: 'school.abjuration',
  conjuration: 'school.conjuration',
  divination: 'school.divination',
  enchantment: 'school.enchantment',
  evocation: 'school.evocation',
  illusion: 'school.illusion',
  necromancy: 'school.necromancy',
  transmutation: 'school.transmutation',
};

interface ComponentEntry {
  label: string;
  hint: string;
}

function componentEntries(c: Spell['components']): ComponentEntry[] {
  const out: ComponentEntry[] = [];
  if (c.v) {
    out.push({
      label: t('spell.component.verbal.label'),
      hint: t('spell.component.verbal.hint'),
    });
  }
  if (c.s) {
    out.push({
      label: t('spell.component.somatic.label'),
      hint: t('spell.component.somatic.hint'),
    });
  }
  if (c.m) {
    out.push({
      label: t('spell.component.material.label'),
      hint: t('spell.component.material.hint'),
    });
  }
  return out;
}

function levelLabel(level: number): string {
  if (level === 0) return t('spell.level.cantrip');
  return `${t('spell.level.prefix')} ${level}`;
}

export function SpellHelpPanel({ spell, headingId, className }: Props): JSX.Element {
  const name = localize(spell.name);
  // Données SRD utilisent `\n` pour séparer les paragraphes (cf. spell-detail-modal
  // qui rend en `whitespace-pre-line`). On split pour pouvoir poser un gap entre.
  const paragraphs = localize(spell.description).split('\n').filter((p) => p.trim() !== '');
  const material = spell.components.m && spell.components.material
    ? localize(spell.components.material)
    : null;
  const components = componentEntries(spell.components);

  return (
    <aside
      aria-label={`Détail — ${name}`}
      className={cn(
        'flex flex-col gap-4 rounded-card border border-soft bg-bg-3/30 p-5',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <h3 id={headingId} className="font-display text-display text-gold-bright">
          {name}
        </h3>
        <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {levelLabel(spell.level)} · {t(SCHOOL_LABEL_KEY[spell.school])}
        </p>
        {(spell.concentration || spell.ritual) ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {spell.concentration ? (
                <span className="rounded-card-sm border border-amethyst/30 bg-amethyst/[0.08] px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.18em] text-amethyst">
                  {t('spell.flag.concentration')}
                </span>
              ) : null}
              {spell.ritual ? (
                <span className="rounded-card-sm border border-gold-dim/40 bg-gold/[0.08] px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.18em] text-gold-bright">
                  {t('spell.flag.ritual')}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5 font-serif text-[12px] italic text-text-tertiary">
              {spell.concentration ? <p>{t('spell.gloss.concentration')}</p> : null}
              {spell.ritual ? <p>{t('spell.gloss.ritual')}</p> : null}
            </div>
          </div>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 font-serif text-[13px] text-text">
        <Meta label={t('spell.meta.castingTime')}>{localize(spell.castingTime)}</Meta>
        <Meta label={t('spell.meta.range')}>{localize(spell.range)}</Meta>
        <Meta label={t('spell.meta.duration')}>{localize(spell.duration)}</Meta>
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            {t('spell.meta.components')}
          </dt>
          <dd>
            {components.length === 0 ? (
              <span className="text-text">—</span>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {components.map((c) => (
                  <li key={c.label} className="text-text">
                    <span>{c.label}</span>
                    <span className="text-text-tertiary italic"> — {c.hint}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
          {material ? (
            <p className="mt-1 font-serif text-[12px] italic text-text-secondary">
              {material}
            </p>
          ) : null}
        </div>
      </dl>

      {paragraphs.length > 0 ? (
        <div className="flex flex-col gap-2">
          {paragraphs.map((p, i) => (
            <p key={i} className="font-serif text-body text-text">
              {p}
            </p>
          ))}
        </div>
      ) : null}

      {spell.atHigherLevels ? (
        <div className="rounded-card-sm border border-amethyst/25 bg-amethyst/[0.06] px-3 py-2">
          <p className="font-title text-[10px] uppercase tracking-[0.18em] text-amethyst">
            {t('spell.meta.atHigherLevels')}
          </p>
          <p className="mt-1 font-serif text-[13px] text-text-secondary">
            {localize(spell.atHigherLevels)}
          </p>
        </div>
      ) : null}
    </aside>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}
