import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { IconName } from '@/shared/design/icons';

interface StatusStripProps {
  character: Character;
  /**
   * CA effectivement affichée — déjà combinée par `computeDisplayedAc` au
   * niveau de `CharacterSheet` (armure équipée + Fighting Style Defense +1).
   * Distincte de `character.ac` qui ne porte que la valeur désarmée posée au
   * wizard ; passée en prop pour découpler le strip de l'inventaire dérivé.
   */
  displayedAc: number;
}

/**
 * Strip de stats vitales : PV / CA / Init / Vitesse en grille 4-up. Mobile-first,
 * tap-friendly (44px min cible). Aucune action en S1 — purement informatif.
 * Les + / – HP arrivent dans le mode Combat (plan 07).
 */
export function StatusStrip({ character, displayedAc }: StatusStripProps): JSX.Element {
  const initSign = character.initiative >= 0 ? '+' : '';
  return (
    <section
      aria-label={t('sheet.statusStrip.aria')}
      className="mx-auto mt-6 grid w-full max-w-[420px] grid-cols-4 gap-2 px-4"
    >
      <StatusCell
        icon="i-heart"
        label={t('sheet.stat.hp')}
        value={`${character.hp.current}`}
        sub={`/ ${character.hp.max}`}
        emphasis="hp"
      />
      <StatusCell
        icon="i-shield"
        label={t('sheet.stat.ac')}
        value={`${displayedAc}`}
      />
      <StatusCell
        icon="i-init"
        label={t('sheet.stat.init')}
        value={`${initSign}${character.initiative}`}
      />
      <StatusCell
        icon="i-speed"
        label={t('sheet.stat.speed')}
        value={`${character.speed}`}
        sub="m"
      />
    </section>
  );
}

interface StatusCellProps {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  emphasis?: 'hp';
}

function StatusCell({ icon, label, value, sub, emphasis }: StatusCellProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-[68px] flex-col items-center justify-center gap-0.5',
        'rounded-card-sm border border-white-8 bg-glass-2 px-1 py-2 backdrop-blur-md',
        emphasis === 'hp' && 'border-soft',
      )}
    >
      <span className="flex items-center gap-1 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
        <Icon name={icon} className="h-3 w-3 text-gold-dim" />
        {label}
      </span>
      <span className="font-display text-[20px] font-semibold leading-none text-gold-bright">
        {value}
        {sub && <span className="ml-0.5 text-[10px] italic text-text-tertiary">{sub}</span>}
      </span>
    </div>
  );
}
