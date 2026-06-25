import { useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';
import { applyDamage, applyHeal, HP_BAND_LABEL, hpHealthBand, type HpHealthBand } from './hp-combat';
import { NumberPad } from './number-pad';

/**
 * Style de la pastille d'état (point + libellé) par bande de santé. Le signal de
 * santé est typographique — une petite pastille colorée — et NON un fond de jauge
 * qui remplit la carte (rejeté en UAT : « ce fond de couleur qui fait barre de
 * vie »). Le grand nombre de PV reste doré ; la pastille porte la couleur.
 */
const HP_BAND_PILL: Record<HpHealthBand, { dot: string; text: string; ring: string }> = {
  healthy: { dot: 'bg-emerald', text: 'text-emerald', ring: 'border-emerald/30 bg-emerald/10' },
  wounded: { dot: 'bg-gold', text: 'text-gold-text', ring: 'border-gold/30 bg-gold/10' },
  critical: { dot: 'bg-crimson', text: 'text-crimson', ring: 'border-crimson/40 bg-crimson/10' },
  dead: { dot: 'bg-crimson/60', text: 'text-text-tertiary', ring: 'border-crimson/25 bg-crimson/5' },
};

interface HpMegaCardProps {
  character: Character;
  /** Désactive les contrôles lorsque la fiche est read-only (status:'dead'). */
  readOnly: boolean;
}

/**
 * Carte HP centrale du Combat. Tap court "+"/"−" applique ±1, long-press
 * ouvre un pad numérique pour saisir un montant précis (5, 12, etc.).
 * Le passage à 0 PV déclenche automatiquement la modale Death Saves (effet
 * géré par CombatMode via `hp.current === 0` plutôt que par un callback
 * couplant les deux composants).
 */
export function HpMegaCard({ character, readOnly }: HpMegaCardProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character);
  const [padIntent, setPadIntent] = useState<'damage' | 'heal' | null>(null);

  const hp = character.hp;
  const ratio = hp.max > 0 ? Math.max(0, Math.min(1, hp.current / hp.max)) : 0;
  const band = hpHealthBand(ratio);
  const pill = HP_BAND_PILL[band];
  const label = HP_BAND_LABEL[band];

  async function applyDelta(delta: number): Promise<void> {
    if (readOnly || delta === 0) return;
    if (delta < 0) {
      const result = applyDamage(hp, -delta);
      await updateCharacter({ hp: result.hp });
      showToast({
        kind: 'damage',
        title: 'Dégâts subis',
        big: `−${-delta}`,
        sub: `${result.hp.current}/${hp.max} PV`,
      });
      if (result.triggeredMassiveDeath) {
        showToast({
          kind: 'grim',
          title: 'Mort foudroyante',
          big: '✦',
          sub: 'Dégâts massifs — pas de jet de mort',
          durationMs: 3000,
        });
      }
    } else {
      const next = applyHeal(hp, delta);
      await updateCharacter({ hp: next });
      showToast({
        kind: 'heal',
        title: 'Soin',
        big: `+${delta}`,
        sub: `${next.current}/${hp.max} PV`,
      });
    }
  }

  const minusHandlers = useLongPress(
    () => void applyDelta(-1),
    () => !readOnly && setPadIntent('damage'),
  );
  const plusHandlers = useLongPress(
    () => void applyDelta(1),
    () => !readOnly && setPadIntent('heal'),
  );

  const padMaxApplicable = padIntent === 'heal' ? hp.max - hp.current : hp.current;

  return (
    <>
      <Card className="relative overflow-hidden">
        {/* Halo crimson diffus en haut — ambiance fidèle au prototype (fixe et
            discrète), pas un remplissage : aucune couleur ne passe derrière le texte. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(232,90,90,0.10),transparent_70%)]"
        />

        <CardHeader>
          <h3>Vitalité</h3>
        </CardHeader>

        <div className="relative flex flex-col items-center gap-3.5">
          {/* Ligne d'état : pastille santé + PV temporaires (si présents). */}
          <div className="flex items-center justify-center gap-2.5">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-pill border px-3 py-1',
                'transition-colors duration-300 ease-base',
                pill.ring,
              )}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full transition-colors duration-300', pill.dot)}
              />
              <span
                className={cn(
                  'font-title text-micro font-bold uppercase transition-colors duration-300',
                  pill.text,
                )}
              >
                {label}
              </span>
            </span>
            {hp.temp > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-amethyst/30 bg-amethyst/10 px-3 py-1 font-title text-micro font-bold uppercase text-amethyst">
                +{hp.temp} <span className="text-amethyst/70">PV temp.</span>
              </span>
            )}
          </div>

          {/* Nombre compact — doré (jamais sur un fond doré). Annonce les changements
              de PV aux lecteurs d'écran. */}
          <div
            className="flex items-baseline gap-2"
            aria-live="polite"
            aria-label={`${hp.current} sur ${hp.max} points de vie, état ${label}`}
          >
            <span
              className={cn(
                'font-display text-[clamp(36px,9vw,52px)] font-black leading-none tracking-[-0.03em]',
                // 0 PV : ton parchemin éteint (le doré « plein de vie » jurerait
                // avec l'inconscience). Sinon doré vif avec halo léger.
                band === 'dead'
                  ? 'text-text-secondary'
                  : 'text-gold-bright [text-shadow:0_0_24px_rgba(220,184,108,0.35)]',
              )}
            >
              {hp.current}
            </span>
            <span className="font-serif text-[18px] italic text-text-tertiary">/ {hp.max}</span>
          </div>

          {/* Contrôles compacts. */}
          <div className="flex w-full max-w-[260px] items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Subir 1 dégât (long-press pour saisir un montant)"
              disabled={readOnly}
              className="h-12 flex-1 rounded-card-sm border border-crimson/40 bg-crimson/10 font-display text-[24px] font-black text-crimson transition-all duration-200 ease-base hover:border-crimson hover:bg-crimson/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              {...minusHandlers}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Soigner de 1 PV (long-press pour saisir un montant)"
              disabled={readOnly}
              className="h-12 flex-1 rounded-card-sm border border-teal/40 bg-teal/10 font-display text-[24px] font-black text-teal transition-all duration-200 ease-base hover:border-teal hover:bg-teal/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              {...plusHandlers}
            >
              +
            </button>
          </div>
          <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-faint">
            Tap = ±1 · Long-press = pad numérique
          </p>
        </div>
      </Card>

      {padIntent !== null && (
        <NumberPad
          intent={padIntent}
          max={hp.max}
          maxApplicable={padMaxApplicable}
          onCommit={(amount) => {
            setPadIntent(null);
            const signed = padIntent === 'heal' ? amount : -amount;
            void applyDelta(signed);
          }}
          onCancel={() => setPadIntent(null)}
        />
      )}
    </>
  );
}
