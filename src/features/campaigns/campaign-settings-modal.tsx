import { useId, useState, type FormEvent, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { FormField } from '@/shared/components/form/form-field';
import { TextInput } from '@/shared/components/form/text-input';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';
import type { DiceMode } from '@/shared/lib/rules/dice-mode';
import { updateCampaign } from '@/shared/lib/services/campaigns';
import type {
  Campaign,
  CampaignStatus,
  CampaignVariants,
} from '@/shared/types/campaign';

interface Props {
  /** Campagne à éditer — fournit les valeurs de départ (formulaire non contrôlé par le parent). */
  campaign: Campaign;
  onClose: () => void;
  /** Appelé après un enregistrement réussi — le parent rafraîchit le détail. */
  onSaved: () => void;
}

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;

const DICE_MODES: readonly {
  mode: DiceMode;
  labelKey: StringKey;
  hintKey: StringKey;
}[] = [
  { mode: 'digital', labelKey: 'account.dice.digital', hintKey: 'account.dice.digitalHint' },
  { mode: 'physical', labelKey: 'account.dice.physical', hintKey: 'account.dice.physicalHint' },
];

const VARIANT_ROWS: readonly {
  key: keyof CampaignVariants;
  labelKey: StringKey;
  descKey: StringKey;
}[] = [
  {
    key: 'featAtLevel1',
    labelKey: 'campaigns.settings.variants.featAtLevel1.label',
    descKey: 'campaigns.settings.variants.featAtLevel1.desc',
  },
  {
    key: 'flanking',
    labelKey: 'campaigns.settings.variants.flanking.label',
    descKey: 'campaigns.settings.variants.flanking.desc',
  },
  {
    key: 'slowHealing',
    labelKey: 'campaigns.settings.variants.slowHealing.label',
    descKey: 'campaigns.settings.variants.slowHealing.desc',
  },
  {
    key: 'grittyRealism',
    labelKey: 'campaigns.settings.variants.grittyRealism.label',
    descKey: 'campaigns.settings.variants.grittyRealism.desc',
  },
];

const STATUS_ROWS: readonly {
  status: CampaignStatus;
  labelKey: StringKey;
  hintKey: StringKey;
}[] = [
  {
    status: 'active',
    labelKey: 'campaigns.settings.status.active.label',
    hintKey: 'campaigns.settings.status.active.hint',
  },
  {
    status: 'paused',
    labelKey: 'campaigns.settings.status.paused.label',
    hintKey: 'campaigns.settings.status.paused.hint',
  },
  {
    status: 'archived',
    labelKey: 'campaigns.settings.status.archived.label',
    hintKey: 'campaigns.settings.status.archived.hint',
  },
];

/**
 * Modale de réglages d'une campagne (MJ uniquement). Édite le nom, la
 * description, l'état du cycle de vie (active / en pause / archivée), le mode de
 * dés par défaut de la table et les 4 variantes 5e (`featAtLevel1`, `flanking`,
 * `slowHealing`, `grittyRealism`). Persiste via `updateCampaign`, qui deep-merge
 * le patch `settings` côté service.
 *
 * Le formulaire s'initialise depuis `campaign` au montage (state non dérivé,
 * pas d'effet) : le parent monte la modale à l'ouverture et la démonte à la
 * fermeture (`{open ? <CampaignSettingsModal … /> : null}`), garantissant des
 * valeurs de départ fraîches à chaque ouverture.
 *
 * `language` (switch runtime EN déféré S5) n'est pas exposé ici : on ne montre
 * que les réglages qui ont un consommateur user-visible en V1. Le `status`, lui,
 * est éditable — c'est la clôture naturelle du cycle de vie d'une campagne (une
 * campagne se met en pause entre deux arcs, ou s'archive une fois terminée).
 */
export function CampaignSettingsModal({ campaign, onClose, onSaved }: Props): JSX.Element {
  const titleId = useId();
  const [name, setName] = useState<string>(campaign.name);
  const [description, setDescription] = useState<string>(campaign.description);
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [diceMode, setDiceMode] = useState<DiceMode>(campaign.settings.diceMode);
  const [variants, setVariants] = useState<CampaignVariants>({
    ...campaign.settings.variants,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setFieldError(t('campaigns.create.error.nameRequired'));
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setFieldError(t('campaigns.create.error.nameTooLong'));
      return;
    }
    setFieldError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await updateCampaign(campaign.id, {
        name: trimmed,
        description: description.trim(),
        status,
        settings: { diceMode, variants },
      });
      onSaved();
      onClose();
    } catch {
      setSubmitError(t('campaigns.settings.error.generic'));
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open
      onClose={onClose}
      titleId={titleId}
      closeLabel={t('campaigns.settings.close')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.settings.title')}
          </h2>
          <Divider className="my-3" />
          <p className="mx-auto max-w-[40ch] font-serif text-body-sm italic text-text-secondary">
            {t('campaigns.settings.intro')}
          </p>
        </header>

        <FormField
          label={t('campaigns.create.name.label')}
          error={fieldError ?? undefined}
          required
        >
          {(field) => (
            <TextInput
              {...field}
              value={name}
              maxLength={NAME_MAX}
              placeholder={t('campaigns.create.name.placeholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={submitting}
            />
          )}
        </FormField>

        <FormField label={t('campaigns.create.description.label')}>
          {(field) => (
            <textarea
              id={field.id}
              aria-describedby={field['aria-describedby']}
              value={description}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              placeholder={t('campaigns.create.description.placeholder')}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              className={cn(
                'w-full resize-y rounded-card-sm border border-white-8 bg-bg-3/40',
                'px-3 py-2 font-serif text-body text-text',
                'placeholder:text-text-tertiary',
                'focus:border-gold-bright focus:outline-none focus:ring-1 focus:ring-gold-bright/40',
                'transition-colors duration-200 ease-base',
                'disabled:opacity-50',
              )}
            />
          )}
        </FormField>

        <section aria-labelledby={`${titleId}-status`}>
          <p
            id={`${titleId}-status`}
            className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-gold"
          >
            {t('campaigns.settings.status.title')}
          </p>
          <p className="mt-1 font-serif text-body-sm text-text-tertiary">
            {t('campaigns.settings.status.hint')}
          </p>
          <div
            role="radiogroup"
            aria-label={t('campaigns.settings.status.title')}
            className="mt-3 flex flex-col gap-2"
          >
            {STATUS_ROWS.map(({ status: value, labelKey, hintKey }) => {
              const active = status === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={submitting}
                  onClick={() => setStatus(value)}
                  className={cn(
                    'flex flex-col gap-1 rounded-card-sm border p-3 text-left transition-all duration-200 ease-base',
                    'disabled:cursor-not-allowed',
                    active
                      ? 'border-gold-dim bg-gradient-to-b from-gold-bright/[0.1] to-gold/[0.02]'
                      : 'border-white-8 bg-white/[0.02] hover:border-soft',
                  )}
                >
                  <span
                    className={cn(
                      'font-title text-[12px] font-bold uppercase tracking-[0.14em]',
                      active ? 'text-gold-bright' : 'text-text-secondary',
                    )}
                  >
                    {t(labelKey)}
                  </span>
                  <span className="font-serif text-[12px] text-text-tertiary">
                    {t(hintKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby={`${titleId}-dice`}>
          <p
            id={`${titleId}-dice`}
            className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-gold"
          >
            {t('campaigns.settings.dice.title')}
          </p>
          <p className="mt-1 font-serif text-body-sm text-text-tertiary">
            {t('campaigns.settings.dice.hint')}
          </p>
          <div
            role="radiogroup"
            aria-label={t('campaigns.settings.dice.title')}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            {DICE_MODES.map(({ mode, labelKey, hintKey }) => {
              const active = diceMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={submitting}
                  onClick={() => setDiceMode(mode)}
                  className={cn(
                    'flex flex-col gap-1 rounded-card-sm border p-3 text-left transition-all duration-200 ease-base',
                    'disabled:cursor-not-allowed',
                    active
                      ? 'border-gold-dim bg-gradient-to-b from-gold-bright/[0.1] to-gold/[0.02]'
                      : 'border-white-8 bg-white/[0.02] hover:border-soft',
                  )}
                >
                  <span
                    className={cn(
                      'font-title text-[12px] font-bold uppercase tracking-[0.14em]',
                      active ? 'text-gold-bright' : 'text-text-secondary',
                    )}
                  >
                    {t(labelKey)}
                  </span>
                  <span className="font-serif text-[12px] text-text-tertiary">
                    {t(hintKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby={`${titleId}-variants`}>
          <p
            id={`${titleId}-variants`}
            className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-gold"
          >
            {t('campaigns.settings.variants.title')}
          </p>
          <p className="mt-1 font-serif text-body-sm text-text-tertiary">
            {t('campaigns.settings.variants.hint')}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {VARIANT_ROWS.map(({ key, labelKey, descKey }) => (
              <label
                key={key}
                className="flex items-start justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] p-3"
              >
                <span className="min-w-0">
                  <span className="block font-title text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                    {t(labelKey)}
                  </span>
                  <span className="mt-0.5 block font-serif text-[12px] text-text-tertiary">
                    {t(descKey)}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={variants[key]}
                  onChange={(e) =>
                    setVariants((v) => ({ ...v, [key]: e.target.checked }))
                  }
                  aria-label={t(labelKey)}
                  disabled={submitting}
                  className="mt-1 h-5 w-5 flex-shrink-0 accent-gold-bright"
                />
              </label>
            ))}
          </div>
        </section>

        {submitError ? (
          <p
            role="alert"
            className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
          >
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={submitting}
          >
            {t('campaigns.settings.cancel')}
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={submitting}>
            {submitting
              ? t('campaigns.settings.saving')
              : t('campaigns.settings.save')}
          </Button>
        </div>
      </form>
    </DetailModal>
  );
}
