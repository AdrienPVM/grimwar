import { localize } from '@/shared/lib/i18n';
import type { SummonedCreatureStatBlock } from '@/shared/types/content';

interface SummonedCreatureStatBlockCardProps {
  statBlock: SummonedCreatureStatBlock;
}

/**
 * Carte de profil de créature invoquée (plan D14). Rendue inline dans
 * `SpellDetailModal` sous la description du sort, entre la description et le
 * bloc « À niveau supérieur ». Aucune logique de jeu : c'est une consultation
 * pure pour le MJ. Les variantes (forme/taille/type) sont encodées dans les
 * noms d'action (« (Spider Only) ») comme le SRD lui-même — pas de sélecteur
 * interactif.
 *
 * Pourquoi 1 composant, pas N variantes par sort : modéliser un par variante
 * exploserait la surface (4 sorts × 3-5 variantes = 15+ statblocks dupliqués
 * à 90%) sans bénéfice — le SRD lui-même n'unifie qu'un seul statblock par
 * créature invoquée.
 */
export function SummonedCreatureStatBlockCard({
  statBlock,
}: SummonedCreatureStatBlockCardProps): JSX.Element {
  return (
    <section
      aria-label={`Profil de ${localize(statBlock.name)}`}
      data-testid="summoned-creature-statblock"
      data-creature-id={statBlock.id}
      className="mt-4 rounded-card-sm border border-emerald/30 bg-emerald/[0.06] px-4 py-3"
    >
      <header className="mb-3">
        <p className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.2em] text-emerald">
          Profil de la créature invoquée
        </p>
        <h3 className="font-display text-[16px] font-black tracking-[-0.01em] text-gold-bright">
          {localize(statBlock.name)}
        </h3>
        <p className="font-serif text-body-sm italic text-text-tertiary">
          {localize(statBlock.sizeTypeAlignment)}
        </p>
      </header>

      <dl className="mb-3 grid grid-cols-1 gap-x-3 gap-y-1.5 font-serif text-body-sm sm:grid-cols-2">
        <StatRow label="Classe d'armure">{localize(statBlock.acFormula)}</StatRow>
        <StatRow label="Points de vie">{localize(statBlock.hpFormula)}</StatRow>
        <StatRow label="Vitesse">{localize(statBlock.speed)}</StatRow>
        <StatRow label="Sens">{localize(statBlock.senses)}</StatRow>
        <StatRow label="Langues">{localize(statBlock.languages)}</StatRow>
        <StatRow label="Facteur de puissance">{localize(statBlock.challenge)}</StatRow>
        {statBlock.resistances && (
          <StatRow label="Résistances">{localize(statBlock.resistances)}</StatRow>
        )}
        {statBlock.immunities && (
          <StatRow label="Immunités">{localize(statBlock.immunities)}</StatRow>
        )}
      </dl>

      <div className="mb-3 grid grid-cols-6 gap-1.5 rounded-card-sm border border-white-8 bg-ink/40 px-2 py-2 text-center font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
        <Ability label="For" score={statBlock.abilities.for} />
        <Ability label="Dex" score={statBlock.abilities.dex} />
        <Ability label="Con" score={statBlock.abilities.con} />
        <Ability label="Int" score={statBlock.abilities.int} />
        <Ability label="Sag" score={statBlock.abilities.sag} />
        <Ability label="Cha" score={statBlock.abilities.cha} />
      </div>

      <Section title="Traits" entries={statBlock.traits} />
      <Section title="Actions" entries={statBlock.actions} />
      <Section title="Actions bonus" entries={statBlock.bonusActions} />
      <Section title="Réactions" entries={statBlock.reactions} />
    </section>
  );
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-title text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </dt>
      <dd className="text-text-secondary">{children}</dd>
    </div>
  );
}

function Ability({ label, score }: { label: string; score: number }): JSX.Element {
  const mod = Math.floor((score - 10) / 2);
  const sign = mod >= 0 ? '+' : '';
  return (
    <div>
      <div className="text-text-tertiary">{label}</div>
      <div className="font-display text-body font-bold text-text">{score}</div>
      <div className="text-[9px] text-text-tertiary">
        {sign}
        {mod}
      </div>
    </div>
  );
}

function Section({
  title,
  entries,
}: {
  title: string;
  entries: SummonedCreatureStatBlock['actions'];
}): JSX.Element | null {
  if (entries.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-emerald">
        {title}
      </p>
      <ul className="space-y-2 font-serif text-body-sm text-text-secondary">
        {entries.map((entry, i) => (
          <li key={`${title}-${i}`}>
            <span className="font-semibold text-text">{localize(entry.name)}.</span>{' '}
            <span className="whitespace-pre-line">{localize(entry.description)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
