import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { formatMetersValue } from '@/shared/lib/rules/distance';
import { passivePerception } from '@/shared/lib/rules/passive-perception';
import type { Character } from '@/shared/types/character';
import type { IconName } from '@/shared/design/icons';

interface StatusStripProps {
  character: Character;
  /**
   * CA effectivement affichée — déjà combinée par `computeDisplayedAc` au
   * niveau de `CharacterSheet` (armure équipée + Fighting Style Defense +1 +
   * bonus magic items 1B.2). Distincte de `character.ac` qui ne porte que la
   * valeur désarmée posée au wizard ; passée en prop pour découpler le strip
   * de l'inventaire dérivé.
   */
  displayedAc: number;
  /**
   * Vitesse effectivement affichée — déjà combinée par `computeDisplayedSpeed`
   * au niveau de `CharacterSheet` (base + bonus de magic items équipés). JALON
   * 1B.2. Optional pour rétro-compat avec les tests existants qui n'ont pas
   * encore le moteur d'effets.
   */
  displayedSpeed?: number;
}

/**
 * Strip de stats vitales : CA / Init / Vitesse en grille 3-up. Mobile-first,
 * tap-friendly (44px min cible). Purement informatif.
 *
 * Les PV ne figurent PLUS ici : ils sont déjà portés, en évidence, par le badge
 * de l'emblème du HeroCard rendu juste au-dessus dans la même colonne — les
 * répéter ici était une duplication pure (UAT « même info deux fois »). L'emblème
 * est la vue « portrait » glanceable des PV ; le contrôle interactif +/− vit dans
 * la HpMegaCard du mode Combat. Chaque affichage des PV a désormais un rôle
 * distinct, jamais redondant sur une même vue.
 */
export function StatusStrip({
  character,
  displayedAc,
  displayedSpeed,
}: StatusStripProps): JSX.Element {
  const initSign = character.initiative >= 0 ? '+' : '';
  // `character.speed` (et le bonus d'effets de `computeDisplayedSpeed`) est en
  // PIEDS, valeur SRD canonique (ancestries.json : 30). On convertit À
  // L'AFFICHAGE en mètres (convention FR : 30 ft → 9 m) — la cellule était
  // étiquetée « m » mais montrait le chiffre brut en pieds (« 30 m »).
  const speedMeters = formatMetersValue(displayedSpeed ?? character.speed);
  // Perception passive (SRD 5.2.1) : 10 + mod de Perception. Valeur de fiche
  // glanceable au même titre que CA/Init/Vitesse — l'un des chiffres les plus
  // consultés au jeu (détection de pièges, créatures cachées) côté MJ.
  const passivePerc = passivePerception(character);
  return (
    <section
      aria-label={t('sheet.statusStrip.aria')}
      className="mx-auto mt-6 grid w-full max-w-[420px] grid-cols-2 gap-2 px-4 sm:grid-cols-4 lg:mt-4 lg:grid-cols-2 lg:px-2"
    >
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
        value={speedMeters}
        sub="m"
      />
      <StatusCell
        icon="i-eye"
        label={t('sheet.stat.passivePerception')}
        value={`${passivePerc}`}
      />
    </section>
  );
}

interface StatusCellProps {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
}

function StatusCell({ icon, label, value, sub }: StatusCellProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-[68px] flex-col items-center justify-center gap-0.5',
        'rounded-card-sm border border-white-8 bg-glass-2 px-1 py-2 backdrop-blur-md',
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
