import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type JSX,
} from 'react';

import { MonsterPickerModal } from '@/features/map-proto/monster-picker-modal';
import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { logNpcIntroduced } from '@/shared/lib/event-logger';
import { t, localize } from '@/shared/lib/i18n';
import {
  ImageOptimizeError,
  optimizeImageFile,
  PORTRAIT_PRESET,
} from '@/shared/lib/image-optimize';
import { createNpc, updateNpc, type NpcWriteInput } from '@/shared/lib/services/npcs';
import { showToast } from '@/shared/lib/slices/toast-slice';
import {
  NPC_ROLE_LABEL_KEY,
  NPC_VISIBILITY_LABEL_KEY,
} from '@/shared/types/npc-labels';
import {
  NPC_ROLES,
  NPC_VISIBILITIES,
  type Npc,
  type NpcCombatStats,
  type NpcRole,
  type NpcVisibility,
} from '@/shared/types/npc';

interface NpcEditModalProps {
  open: boolean;
  campaignId: string;
  createdByUid: string;
  /** `null` = création ; un PNJ = édition (préremplit le formulaire). */
  npc: Npc | null;
  onClose: () => void;
  /** Appelé après une création/édition réussie (refresh de la liste/détail). */
  onSaved: () => void;
}

interface FormState {
  name: string;
  role: NpcRole;
  location: string;
  portraitGlyph: string;
  /** Data URL du portrait photo, ou `null` = médaillon à la lettre. */
  portraitImage: string | null;
  shortDescription: string;
  publicDescription: string;
  dmNotes: string;
  tags: string;
  visibility: NpcVisibility;
  isCombatant: boolean;
  cr: string;
  ac: string;
  hp: string;
  combatNotes: string;
  /**
   * Monstre du bestiaire lié. AVANT ce champ, `handleSave` reconstruisait
   * `combatStats` à partir des seuls CR/CA/PV/notes et PERDAIT silencieusement
   * un `monsterContentId` existant à chaque enregistrement — alors que
   * `relationships`, lui, était bien préservé.
   */
  monsterContentId: string | undefined;
  /** Nom affichable du monstre lié (confort d'affichage, non persisté). */
  monsterLabel: string | null;
}

function initialState(npc: Npc | null): FormState {
  return {
    name: npc?.name ?? '',
    role: npc?.role ?? 'merchant',
    location: npc?.location ?? '',
    portraitGlyph: npc?.portrait.type === 'image' ? '' : (npc?.portrait.value ?? ''),
    portraitImage: npc?.portrait.type === 'image' ? npc.portrait.value : null,
    shortDescription: npc?.shortDescription ?? '',
    publicDescription: npc?.publicDescription ?? '',
    dmNotes: npc?.dmNotes ?? '',
    tags: npc ? npc.tags.join(', ') : '',
    visibility: npc?.visibility ?? 'all',
    isCombatant: npc?.combatStats != null,
    cr: npc?.combatStats?.cr !== undefined ? String(npc.combatStats.cr) : '',
    ac: npc?.combatStats?.ac !== undefined ? String(npc.combatStats.ac) : '',
    hp: npc?.combatStats?.hp !== undefined ? String(npc.combatStats.hp) : '',
    combatNotes: npc?.combatStats?.notes ?? '',
    monsterContentId: npc?.combatStats?.monsterContentId,
    monsterLabel: null,
  };
}

/** "a, b ,  c, a" → ['a','b','c'] (trim, dédup, non vide). */
function parseTags(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (tag.length > 0 && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/** Parse un entier optionnel (champ vide → undefined). */
function parseIntOrUndef(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse un nombre (CR peut être fractionnaire : 0.25, 0.5). */
function parseFloatOrUndef(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Création / édition d'un PNJ (plan 28 steps 7-8). UN composant pour les deux :
 * `npc === null` ⇒ création (+ event `npc-introduced`) ; `npc` fourni ⇒ édition.
 *
 * Portrait : V1 = glyphe (lettre/emoji), comme les PJ. L'upload d'image
 * (`type:'image'`, Firebase Storage) est différé en sous-plan 28b — un encart le
 * signale. Bloc combat : saisie MANUELLE (CR/CA/PV/notes). Le lien vers un
 * monstre du bestiaire (`monsterContentId`, autofill) est différé tant que
 * `monsters.json` est vide (0/332, même stopgap que la modale de rencontre) — un
 * encart le signale aussi. Les relations ne se modifient pas ici (elles vivent
 * sur le détail, plan 28 step 12) : à l'édition on PRÉSERVE `npc.relationships`.
 */
export function NpcEditModal({
  open,
  campaignId,
  createdByUid,
  npc,
  onClose,
  onSaved,
}: NpcEditModalProps): JSX.Element {
  const titleId = useId();
  const [form, setForm] = useState<FormState>(() => initialState(npc));
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<'name' | 'save' | null>(null);
  const [portraitBusy, setPortraitBusy] = useState<boolean>(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [monsterPickerOpen, setMonsterPickerOpen] = useState<boolean>(false);
  // Le lien persisté ne stocke qu'un slug ; on résout son nom pour l'afficher.
  // Repli sur le slug si le pack qui le portait n'est plus installé.
  const { data: monsters } = useContent('monsters');
  const linkedMonsterLabel =
    form.monsterLabel ??
    (form.monsterContentId !== undefined
      ? (() => {
          const found = monsters.find((m) => m.id === form.monsterContentId);
          return found ? localize(found.name) : form.monsterContentId;
        })()
      : null);

  // Reseed à chaque (ré)ouverture ou changement de PNJ cible — la modale reste
  // montée entre deux ouvertures, donc on resynchronise l'état du formulaire.
  useEffect(() => {
    if (open) {
      setForm(initialState(npc));
      setError(null);
      setSaving(false);
      setPortraitError(null);
      setPortraitBusy(false);
    }
  }, [open, npc]);

  const isEdit = npc !== null;

  function patch(next: Partial<FormState>): void {
    setForm((prev) => ({ ...prev, ...next }));
  }

  /**
   * Portrait photo (M39). Le preset PORTRAIT vise ~32 Ko — minuscule face à la
   * limite de 1 Mio d'un document Firestore, et déjà utilisé par les jetons de
   * carte. Rien de neuf côté schéma : `npcPortraitSchema` accepte `'image'`
   * depuis l'origine, c'est le formulaire qui forçait `'letter'`.
   */
  async function handlePortraitFile(
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setPortraitError(null);
    setPortraitBusy(true);
    try {
      const optimized = await optimizeImageFile(file, PORTRAIT_PRESET);
      patch({ portraitImage: optimized.dataUrl });
    } catch (err) {
      setPortraitError(
        err instanceof ImageOptimizeError
          ? err.message
          : t('npcs.edit.portraitImageError'),
      );
    } finally {
      setPortraitBusy(false);
    }
  }

  async function handleSave(): Promise<void> {
    const name = form.name.trim();
    if (name === '') {
      setError('name');
      return;
    }
    setError(null);
    setSaving(true);

    const combatStats: NpcCombatStats | null = form.isCombatant
      ? {
          // Le lien bestiaire survit à l'enregistrement (M40) : sans cette
          // ligne, éditer le nom d'un PNJ le déliait de son monstre.
          monsterContentId: form.monsterContentId,
          cr: parseFloatOrUndef(form.cr),
          ac: parseIntOrUndef(form.ac),
          hp: parseIntOrUndef(form.hp),
          notes: form.combatNotes.trim() || undefined,
        }
      : null;

    const input: NpcWriteInput = {
      name,
      role: form.role,
      location: form.location.trim(),
      shortDescription: form.shortDescription.trim(),
      publicDescription: form.publicDescription.trim(),
      dmNotes: form.dmNotes.trim(),
      // Un vrai visage quand il y en a un (M39), sinon le médaillon à la lettre.
      // L'image est stockée INLINE en base64 optimisé (~32 Ko), comme les
      // portraits de jetons — aucun Firebase Storage requis.
      portrait:
        form.portraitImage !== null
          ? { type: 'image', value: form.portraitImage }
          : { type: 'letter', value: form.portraitGlyph.trim() },
      combatStats,
      relationships: npc?.relationships ?? [],
      tags: parseTags(form.tags),
      visibility: form.visibility,
    };

    try {
      if (isEdit && npc) {
        await updateNpc(campaignId, npc.id, input);
        showToast({ kind: 'info', title: t('npcs.edit.updatedToast'), sub: name });
      } else {
        const id = await createNpc(campaignId, createdByUid, input);
        await logNpcIntroduced(id, name, input.visibility);
        showToast({ kind: 'info', title: t('npcs.edit.createdToast'), sub: name });
      }
      onSaved();
      onClose();
    } catch {
      setError('save');
      setSaving(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={saving ? () => undefined : onClose}
      titleId={titleId}
      closeLabel={t('npcs.edit.cancel')}
      size="lg"
    >
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <h2
          id={titleId}
          className="pr-10 font-display text-2xl font-bold uppercase tracking-[0.14em] text-gold-bright"
        >
          {isEdit ? t('npcs.edit.editTitle') : t('npcs.edit.createTitle')}
        </h2>

        <Field label={t('npcs.edit.field.name')}>
          <input
            type="text"
            value={form.name}
            maxLength={120}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder={t('npcs.edit.field.namePlaceholder')}
            className={INPUT_CLASS}
          />
        </Field>

        {/* Rôle */}
        <Field label={t('npcs.edit.field.role')}>
          <PillGroup
            ariaLabel={t('npcs.edit.field.role')}
            options={NPC_ROLES.map((r) => ({ value: r, label: t(NPC_ROLE_LABEL_KEY[r]) }))}
            value={form.role}
            onPick={(v) => patch({ role: v as NpcRole })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t('npcs.edit.field.location')}>
            <input
              type="text"
              value={form.location}
              maxLength={200}
              onChange={(e) => patch({ location: e.target.value })}
              placeholder={t('npcs.edit.field.locationPlaceholder')}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label={t('npcs.edit.field.portrait')} helper={t('npcs.edit.field.portraitHelper')}>
            <input
              type="text"
              value={form.portraitGlyph}
              maxLength={2}
              disabled={form.portraitImage !== null}
              onChange={(e) => patch({ portraitGlyph: e.target.value })}
              placeholder={t('npcs.edit.field.portraitPlaceholder')}
              className={cn(INPUT_CLASS, form.portraitImage !== null && 'opacity-40')}
            />
          </Field>
        </div>

        {/* Portrait photo (M39) — un vrai visage plutôt qu'une lettre dorée. */}
        <div className="-mt-2 flex flex-wrap items-center gap-4">
          {form.portraitImage !== null ? (
            <img
              src={form.portraitImage}
              alt={`${t('npcs.edit.portraitImageAlt')} ${form.name}`}
              data-testid="npc-portrait-preview"
              className="h-16 w-16 shrink-0 rounded-full border-2 border-gold/60 object-cover"
            />
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-gold-dim/50 px-4 py-2 font-title text-[11px] uppercase tracking-[0.18em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10">
            <input
              type="file"
              accept="image/*"
              data-testid="npc-portrait-input"
              onChange={(e) => {
                void handlePortraitFile(e);
              }}
              className="sr-only"
            />
            {portraitBusy
              ? t('npcs.edit.portraitImageBusy')
              : form.portraitImage !== null
                ? t('npcs.edit.portraitImageReplace')
                : t('npcs.edit.portraitImageAdd')}
          </label>
          {form.portraitImage !== null ? (
            <button
              type="button"
              data-testid="npc-portrait-remove"
              onClick={() => patch({ portraitImage: null })}
              className="rounded-pill border border-crimson/40 px-4 py-2 font-title text-[10px] uppercase tracking-[0.18em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/[0.08]"
            >
              {t('npcs.edit.portraitImageRemove')}
            </button>
          ) : null}
        </div>
        {portraitError !== null ? (
          <p role="alert" className="-mt-2 font-serif text-body-sm text-crimson">
            {portraitError}
          </p>
        ) : null}

        <Field label={t('npcs.edit.field.shortDescription')}>
          <input
            type="text"
            value={form.shortDescription}
            maxLength={400}
            onChange={(e) => patch({ shortDescription: e.target.value })}
            placeholder={t('npcs.edit.field.shortDescriptionPlaceholder')}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label={t('npcs.edit.field.publicDescription')} helper={t('npcs.edit.markdownHelper')}>
          <textarea
            value={form.publicDescription}
            onChange={(e) => patch({ publicDescription: e.target.value })}
            placeholder={t('npcs.edit.field.publicDescriptionPlaceholder')}
            className={cn(INPUT_CLASS, 'min-h-[120px] resize-y')}
          />
        </Field>

        <Field
          label={t('npcs.edit.field.dmNotes')}
          helper={t('npcs.edit.field.dmNotesHelper')}
        >
          <textarea
            value={form.dmNotes}
            onChange={(e) => patch({ dmNotes: e.target.value })}
            placeholder={t('npcs.edit.field.dmNotesPlaceholder')}
            className={cn(INPUT_CLASS, 'min-h-[100px] resize-y')}
          />
        </Field>

        <Field label={t('npcs.edit.field.tags')} helper={t('npcs.edit.field.tagsHelper')}>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => patch({ tags: e.target.value })}
            placeholder={t('npcs.edit.field.tagsPlaceholder')}
            className={INPUT_CLASS}
          />
        </Field>

        {/* Visibilité */}
        <Field label={t('npcs.edit.field.visibility')} helper={t('npcs.edit.field.visibilityHelper')}>
          <PillGroup
            ariaLabel={t('npcs.edit.field.visibility')}
            options={NPC_VISIBILITIES.map((v) => ({
              value: v,
              label: t(NPC_VISIBILITY_LABEL_KEY[v]),
            }))}
            value={form.visibility}
            onPick={(v) => patch({ visibility: v as NpcVisibility })}
          />
        </Field>

        {/* Bloc combat */}
        <div className="flex flex-col gap-3 rounded-card-sm border border-white-8 bg-bg-2/40 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isCombatant}
              onChange={(e) => patch({ isCombatant: e.target.checked })}
              className="h-4 w-4 accent-gold-bright"
            />
            <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('npcs.edit.combat.enable')}
            </span>
          </label>
          {form.isCombatant ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t('npcs.edit.combat.cr')}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.cr}
                    onChange={(e) => patch({ cr: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label={t('npcs.edit.combat.ac')}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.ac}
                    onChange={(e) => patch({ ac: e.target.value })}
                    className={cn(INPUT_CLASS, '[color-scheme:dark]')}
                  />
                </Field>
                <Field label={t('npcs.edit.combat.hp')}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.hp}
                    onChange={(e) => patch({ hp: e.target.value })}
                    className={cn(INPUT_CLASS, '[color-scheme:dark]')}
                  />
                </Field>
              </div>
              <Field label={t('npcs.edit.combat.notes')}>
                <input
                  type="text"
                  value={form.combatNotes}
                  onChange={(e) => patch({ combatNotes: e.target.value })}
                  className={INPUT_CLASS}
                />
              </Field>
              {/* Lien bestiaire (M40). `monsterContentId` existait au schéma,
                  était affiché en lecture seule sur le détail, mais AUCUNE UI
                  ne le renseignait — et l'enregistrement le perdait. */}
              <div className="flex flex-col gap-2 border-t border-white-8 pt-3">
                {form.monsterContentId !== undefined ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      data-testid="npc-linked-monster"
                      className="rounded-pill border border-gold-dim/40 bg-gold/10 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright"
                    >
                      {linkedMonsterLabel}
                    </span>
                    <button
                      type="button"
                      data-testid="npc-unlink-monster"
                      onClick={() =>
                        patch({ monsterContentId: undefined, monsterLabel: null })
                      }
                      className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary underline decoration-dotted transition-colors duration-200 ease-base hover:text-crimson"
                    >
                      {t('npcs.edit.combat.unlinkMonster')}
                    </button>
                  </div>
                ) : null}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMonsterPickerOpen(true)}
                  >
                    {t('npcs.edit.combat.linkMonster')}
                  </Button>
                </div>
                <p className="font-serif text-meta italic text-text-tertiary">
                  {t('npcs.edit.combat.linkMonsterHelper')}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {error !== null ? (
          <p role="alert" className="font-serif text-body-sm text-crimson">
            {error === 'name' ? t('npcs.edit.error.name') : t('npcs.edit.error.save')}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="md" onClick={onClose} disabled={saving}>
            {t('npcs.edit.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? t('npcs.edit.saving') : t('npcs.edit.save')}
          </Button>
        </div>
      </div>

      {/* Le choix PRÉREMPLIT CR/CA/PV sans les verrouiller : le MJ reste libre
          de jouer un gobelours à 60 PV. C'est le lien qui compte, pas les
          chiffres — il permet au tracker de retrouver le bloc complet. */}
      <MonsterPickerModal
        open={monsterPickerOpen}
        onClose={() => setMonsterPickerOpen(false)}
        onPick={(monster) => {
          patch({
            monsterContentId: monster.id,
            monsterLabel: localize(monster.name),
            cr: String(monster.cr),
            ac: String(monster.ac),
            hp: String(monster.hp.avg),
          });
          setMonsterPickerOpen(false);
        }}
      />
    </DetailModal>
  );
}

const INPUT_CLASS =
  'w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-serif text-body text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold';

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </span>
      {children}
      {helper ? (
        <span className="font-serif text-meta italic text-text-tertiary">{helper}</span>
      ) : null}
    </label>
  );
}

interface PillGroupProps {
  ariaLabel: string;
  options: { value: string; label: string }[];
  value: string;
  onPick: (value: string) => void;
}

function PillGroup({ ariaLabel, options, value, onPick }: PillGroupProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPick(opt.value)}
            aria-pressed={active}
            className={cn(
              'rounded-pill border px-4 py-1.5 font-title text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 ease-base',
              active
                ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
                : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft hover:text-gold-bright',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
