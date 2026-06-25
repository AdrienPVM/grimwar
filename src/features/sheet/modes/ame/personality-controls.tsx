import { Icon } from '@/shared/components/icon';
import { t } from '@/shared/lib/i18n';

/**
 * Badge « Réservé au joueur » (mode Âme) — affiché quand un MJ en omni-edit
 * survole un champ de personnalité verrouillé. Même chrome que le cadenas du
 * nom dans la HeroCard (cohérence du signal de verrou plan 26).
 */
export function LockBadge(): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-soft bg-glass-2 px-2.5 py-1 font-title text-meta uppercase tracking-[0.14em] text-text-tertiary"
      title={t('sheet.dmEdit.fieldLocked')}
    >
      <Icon name="i-shield" className="h-3 w-3 text-gold-bright/70" />
      {t('sheet.dmEdit.fieldLocked')}
    </span>
  );
}

interface EditButtonProps {
  onClick: () => void;
  /** Libellé accessible : « Modifier {champ} ». */
  ariaLabel: string;
}

/** Pastille « Modifier » (mode Âme) — propriétaire vivant uniquement. */
export function EditButton({ onClick, ariaLabel }: EditButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="rounded-pill border border-white-8 bg-white/[0.04] px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary transition-all duration-200 ease-base hover:border-gold-dim/60 hover:text-gold-bright"
    >
      {t('sheet.ame.personality.edit')}
    </button>
  );
}
