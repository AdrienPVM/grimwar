import { useState } from 'react';

import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { formatMetersValue, metersToFeet } from '@/shared/lib/rules/distance';
import { passivePerception } from '@/shared/lib/rules/passive-perception';
import type { Character } from '@/shared/types/character';
import type { IconName } from '@/shared/design/icons';

import { useUpdateCharacter } from '../use-update-character';

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
  /** Interdit l'édition (fiche en lecture seule, personnage mort). */
  readOnly?: boolean;
}

/**
 * Strip de stats vitales : CA / Init / Vitesse / Perception passive. Mobile-first,
 * tap-friendly (44px min cible).
 *
 * L'INITIATIVE et la VITESSE y sont éditables (M16). Elles étaient posées une
 * fois au wizard et plus jamais réécrites, alors qu'une table en change tout le
 * temps : « +2 d'initiative avec Alerte », « vitesse 12 m sous Hâte ». La CA
 * reste dérivée — lui donner un terme de surcharge demanderait un champ
 * `acOverride` au schéma, donc l'accord d'Adrien.
 *
 * La vitesse se SAISIT en mètres, comme elle s'affiche, et se stocke en pieds :
 * la valeur interne reste la valeur SRD dont dépendent règles et carte.
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
  readOnly = false,
}: StatusStripProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character);
  const [editing, setEditing] = useState<'init' | 'speed' | null>(null);
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
        editing={editing === 'init'}
        editValue={character.initiative}
        editAria={t('sheet.stat.editInit')}
        testid="status-init"
        onStartEdit={readOnly ? undefined : () => setEditing('init')}
        onCommit={(next) => {
          setEditing(null);
          void updateCharacter({ initiative: clampInitiative(next) });
        }}
        onCancel={() => setEditing(null)}
      />
      <StatusCell
        icon="i-speed"
        label={t('sheet.stat.speed')}
        value={speedMeters}
        sub="m"
        editing={editing === 'speed'}
        // On édite EN MÈTRES, l'unité affichée — demander des pieds à un
        // utilisateur francophone parce que le bundle est en pieds serait
        // exposer un détail d'implémentation.
        editValue={Number(speedMeters.replace(',', '.'))}
        editAria={t('sheet.stat.editSpeed')}
        editStep={0.5}
        testid="status-speed"
        onStartEdit={readOnly ? undefined : () => setEditing('speed')}
        onCommit={(next) => {
          setEditing(null);
          void updateCharacter({ speed: clampSpeed(metersToFeet(next)) });
        }}
        onCancel={() => setEditing(null)}
      />
      <StatusCell
        icon="i-eye"
        label={t('sheet.stat.passivePerception')}
        value={`${passivePerc}`}
      />
    </section>
  );
}

/** Bornes de saisie — garde-fous contre la faute de frappe, pas des règles. */
const INIT_MIN = -20;
const INIT_MAX = 20;
const SPEED_FEET_MAX = 300;

function clampInitiative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(INIT_MIN, Math.min(INIT_MAX, Math.round(value)));
}

function clampSpeed(feet: number): number {
  if (!Number.isFinite(feet)) return 0;
  return Math.max(0, Math.min(SPEED_FEET_MAX, Math.round(feet)));
}

interface StatusCellProps {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  /** Cellule en cours d'édition (l'appelant garde l'état : une seule à la fois). */
  editing?: boolean;
  editValue?: number;
  editAria?: string;
  editStep?: number;
  testid?: string;
  /** Absent → cellule non éditable (CA, Perception passive, lecture seule). */
  onStartEdit?: () => void;
  onCommit?: (next: number) => void;
  onCancel?: () => void;
}

function StatusCell({
  icon,
  label,
  value,
  sub,
  editing = false,
  editValue,
  editAria,
  editStep,
  testid,
  onStartEdit,
  onCommit,
  onCancel,
}: StatusCellProps): JSX.Element {
  const shell = cn(
    'flex min-h-[68px] flex-col items-center justify-center gap-0.5',
    'rounded-card-sm border border-white-8 bg-glass-2 px-1 py-2 backdrop-blur-md',
  );
  const head = (
    <span className="flex items-center gap-1 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
      <Icon name={icon} className="h-3 w-3 text-gold-dim" />
      {label}
    </span>
  );

  if (editing && onCommit) {
    return (
      <div className={shell}>
        {head}
        <input
          type="number"
          autoFocus
          step={editStep ?? 1}
          defaultValue={editValue}
          aria-label={editAria}
          data-testid={testid ? `${testid}-input` : undefined}
          onBlur={(e) => onCommit(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') onCancel?.();
          }}
          className="w-16 rounded-card-sm border border-gold-dim bg-ink/40 px-1 text-center font-display text-[18px] font-semibold text-gold-bright focus:outline-none"
        />
      </div>
    );
  }

  const body = (
    <span className="font-display text-[20px] font-semibold leading-none text-gold-bright">
      {value}
      {sub && <span className="ml-0.5 text-[10px] italic text-text-tertiary">{sub}</span>}
    </span>
  );

  // Une cellule non éditable reste un `div` : rendre tout le strip cliquable
  // promettrait une édition qui n'existe pas sur la CA ni la Perception passive.
  if (!onStartEdit) {
    return (
      <div className={shell}>
        {head}
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onStartEdit}
      aria-label={editAria}
      data-testid={testid}
      className={cn(shell, 'transition-colors duration-200 ease-base hover:border-gold-dim')}
    >
      {head}
      {body}
    </button>
  );
}
