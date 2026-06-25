import { useMemo, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { EncounterParticipant } from '@/shared/types/encounter';

import { hpBarColor, hpRatio } from './encounter-hp';

interface EncounterPartyViewProps {
  participants: readonly EncounterParticipant[];
  /** Résout le libellé localisé d'un slug d'état (partagé avec l'écran). */
  resolveConditionLabel: (id: string) => string;
}

/**
 * Vue de groupe (JALON 24.4, step 8) — lisible par TOUS (joueurs + MJ).
 *
 * Là où la strip d'ordre d'initiative montre l'ORDRE de combat (et n'apparaît
 * qu'une fois l'initiative lancée), cette vue montre la SANTÉ du groupe, groupée
 * « Votre groupe » (PJ) / « Adversaires » (monstres + PNJ), visible dès la
 * préparation. Les joueurs voient les PV des monstres en live : ils lisent déjà
 * `participants[].currentHp` via la rule de lecture de la rencontre. Les masquer
 * nécessiterait un champ `hpVisible` par participant = changement de schéma
 * (décision Adrien) — reporté.
 */
export function EncounterPartyView({
  participants,
  resolveConditionLabel,
}: EncounterPartyViewProps): JSX.Element {
  const { allies, enemies } = useMemo(() => {
    const allies: EncounterParticipant[] = [];
    const enemies: EncounterParticipant[] = [];
    for (const p of participants) {
      // Les PJ sont le groupe ; monstres + PNJ sont les adversaires (le flux de
      // création ne produit pas de PNJ allié en V1 — à raffiner si besoin).
      if (p.type === 'player') allies.push(p);
      else enemies.push(p);
    }
    return { allies, enemies };
  }, [participants]);

  return (
    <section aria-label={t('encounters.party.aria')} className="mt-8">
      <h2 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('encounters.party.title')}
      </h2>

      {participants.length === 0 ? (
        <p className="mt-3 font-serif text-body-sm italic text-text-secondary">
          {t('encounters.party.empty')}
        </p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <PartyGroup
            title={t('encounters.party.allies')}
            members={allies}
            resolveConditionLabel={resolveConditionLabel}
          />
          <PartyGroup
            title={t('encounters.party.enemies')}
            members={enemies}
            resolveConditionLabel={resolveConditionLabel}
          />
        </div>
      )}
    </section>
  );
}

interface PartyGroupProps {
  title: string;
  members: readonly EncounterParticipant[];
  resolveConditionLabel: (id: string) => string;
}

function PartyGroup({ title, members, resolveConditionLabel }: PartyGroupProps): JSX.Element | null {
  if (members.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-title text-[10px] uppercase tracking-[0.18em] text-text-secondary">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <PartyRow
            key={member.instanceId}
            member={member}
            resolveConditionLabel={resolveConditionLabel}
          />
        ))}
      </ul>
    </div>
  );
}

interface PartyRowProps {
  member: EncounterParticipant;
  resolveConditionLabel: (id: string) => string;
}

function PartyRow({ member, resolveConditionLabel }: PartyRowProps): JSX.Element {
  const ratio = hpRatio(member.currentHp, member.maxHp);
  const hpPercent = Math.round(ratio * 100);
  const barColor = hpBarColor(ratio);

  return (
    <li className="rounded-card-sm border border-white-8 bg-bg-3/40 px-3 py-2 lg:px-4 lg:py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate font-serif text-body text-text lg:text-lg">
          {member.name}
        </span>
        <span className="shrink-0 font-serif text-body-sm tabular-nums text-text-secondary lg:text-base">
          {member.currentHp}/{member.maxHp}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] lg:h-2">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300 ease-base', barColor)}
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      {member.conditions.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {member.conditions.map((id) => (
            <li
              key={id}
              className="rounded-pill border border-crimson/40 bg-crimson/[0.08] px-2 py-0.5 font-title text-[10px] font-bold uppercase tracking-[0.1em] text-crimson lg:text-[11px]"
            >
              {resolveConditionLabel(id)}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
