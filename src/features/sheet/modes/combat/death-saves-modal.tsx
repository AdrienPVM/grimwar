import { useDice } from '@/features/dice/use-dice';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { usePermissionContext } from '../../permissions-context';
import { useUpdateCharacter } from '../../use-update-character';
import { applyDeathSaveOutcome } from './hp-combat';

interface DeathSavesModalProps {
  character: Character;
}

/**
 * Modale état de mort. S'affiche dès que `hp.current === 0` (mode pending) OU
 * `status === 'dead'` (mode game-over, avec accès au revival DM).
 *
 * Architecture : la state machine pure vit dans hp-combat.ts. Cette modale est
 * un mince render layer qui :
 *  1. lance un d20 via useDice().rollD20Plus() (silent — toast custom infra)
 *  2. délègue à applyDeathSaveOutcome() pour calculer le prochain état
 *  3. patch Firestore via useUpdateCharacter()
 *  4. toast le résultat
 */
export function DeathSavesModal({ character }: DeathSavesModalProps): JSX.Element | null {
  const { updateCharacter } = useUpdateCharacter(character.id);
  const { isDM } = usePermissionContext();
  const dice = useDice();

  const isDead = character.status === 'dead';
  const isDying = character.hp.current <= 0 && !isDead;

  if (!isDying && !isDead) return null;

  async function rollDeathSave(): Promise<void> {
    // Jet de mort : silent → on émet le toast détaillé en fonction de l'outcome
    // (succès / échec / revive / stabilisé / mort confirmée), pas le toast d20
    // générique du pivot.
    const roll = await dice.rollD20Plus(0, {
      character,
      label: 'Jet de mort',
      kind: 'death-save',
      silent: true,
    });
    const natural = roll.keptFaces[0] ?? 0;
    const outcome = applyDeathSaveOutcome(character.deathSaves, natural);
    if (outcome.kind === 'revived') {
      await updateCharacter({
        deathSaves: outcome.deathSaves,
        hp: { ...character.hp, current: outcome.restoredHp },
      });
      showToast({
        kind: 'crit',
        title: 'Réveil miraculeux !',
        big: 'Nat 20',
        sub: `${character.name} se relève à 1 PV`,
        durationMs: 3000,
      });
      return;
    }
    if (outcome.kind === 'stabilized') {
      await updateCharacter({ deathSaves: outcome.deathSaves });
      showToast({
        kind: 'heal',
        title: 'Stabilisé(e)',
        big: '3✓',
        sub: `${character.name} reste à 0 PV mais ne meurt pas`,
        durationMs: 3000,
      });
      return;
    }
    if (outcome.kind === 'dead') {
      await updateCharacter({ deathSaves: outcome.deathSaves, status: 'dead' });
      showToast({
        kind: 'grim',
        title: 'Mort confirmée',
        big: '✦',
        sub: `${character.name} s'éteint`,
        durationMs: 3500,
      });
      return;
    }
    await updateCharacter({ deathSaves: outcome.deathSaves });
    showToast({
      kind: natural === 1 ? 'fumble' : natural >= 10 ? 'roll' : 'damage',
      title: 'Jet de mort',
      big: `${natural}`,
      sub: natural === 1
        ? '+2 échecs'
        : natural >= 10
          ? '+1 succès'
          : '+1 échec',
    });
  }

  async function revive(): Promise<void> {
    await updateCharacter({
      status: 'alive',
      hp: { ...character.hp, current: 1 },
      deathSaves: { success: 0, fail: 0 },
    });
    showToast({
      kind: 'heal',
      title: 'Ressuscité(e) !',
      big: '✦',
      sub: `${character.name} revient à la vie`,
      durationMs: 3000,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="death-modal-title"
      className="death-overlay fixed inset-0 z-[90] flex items-center justify-center bg-ink/95 px-4 py-6 backdrop-blur-2xl"
    >
      <div className="death-card w-full max-w-[420px] rounded-[24px] border border-crimson/40 bg-gradient-to-b from-[rgba(40,8,8,0.85)] to-[rgba(20,4,4,0.95)] px-7 py-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.7),0_0_80px_rgba(232,90,90,0.2)]">
        <h2
          id="death-modal-title"
          className={cn(
            'font-display text-[clamp(20px,5vw,30px)] font-black uppercase tracking-[0.15em]',
            'text-crimson [text-shadow:0_0_24px_rgba(232,90,90,0.5)]',
          )}
        >
          {isDead ? '✦ Mort ✦' : '✦ Agonie ✦'}
        </h2>
        <p className="mb-6 mt-2 font-serif italic text-text-secondary">
          {isDead
            ? `${character.name} a succombé. Seule la résurrection peut le ramener.`
            : `${character.name} lutte contre la fin. Tente trois sauvegardes contre la mort.`}
        </p>

        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-[14px] border border-white-8 bg-ink/40 px-5 py-3">
            <span className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-teal">
              Succès
            </span>
            <Dots count={character.deathSaves.success} tone="success" />
          </div>
          <div className="flex items-center justify-between rounded-[14px] border border-white-8 bg-ink/40 px-5 py-3">
            <span className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
              Échecs
            </span>
            <Dots count={character.deathSaves.fail} tone="fail" />
          </div>
        </div>

        {!isDead && (
          <button
            type="button"
            onClick={() => void rollDeathSave()}
            className="mb-3 w-full rounded-[14px] border border-crimson bg-gradient-to-b from-crimson to-[#b73838] py-4 font-display text-[16px] font-extrabold uppercase tracking-[0.2em] text-white shadow-[0_4px_20px_rgba(232,90,90,0.4)] transition-all hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(232,90,90,0.5)] active:scale-[0.97]"
          >
            Lancer une sauvegarde
          </button>
        )}

        {isDead && isDM && (
          <Button
            variant="primary"
            data-revive="true"
            onClick={() => void revive()}
            className="w-full"
          >
            ✦ Ressusciter ✦
          </Button>
        )}

        {isDead && !isDM && (
          <p className="font-serif text-body-sm italic text-text-tertiary">
            Seul le MJ peut tenter la résurrection.
          </p>
        )}
      </div>
    </div>
  );
}

interface DotsProps {
  count: number;
  tone: 'success' | 'fail';
}

function Dots({ count, tone }: DotsProps): JSX.Element {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'h-4 w-4 rounded-full border-2 transition-colors',
            i < count
              ? tone === 'success'
                ? 'border-teal bg-teal shadow-[0_0_10px_rgba(125,220,192,0.5)]'
                : 'border-crimson bg-crimson shadow-[0_0_10px_rgba(232,90,90,0.5)]'
              : 'border-text-faint bg-transparent',
          )}
        />
      ))}
    </div>
  );
}
