import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { parseCustomContentPack } from '@/shared/lib/custom-content/parse-pack';
import { t } from '@/shared/lib/i18n';
import { writePack } from '@/shared/lib/services/pack-storage';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type {
  Ancestry,
  Background,
  ClassEntity,
  Feat,
  Invocation,
  Item,
  Spell,
  Subancestry,
  Subclass,
} from '@/shared/types/content';

import {
  AncestryForm,
  EMPTY_ANCESTRY_DRAFT,
  draftFromAncestry,
  type AncestryFormDraft,
} from './forms/ancestry-form';
import {
  BackgroundForm,
  EMPTY_BACKGROUND_DRAFT,
  draftFromBackground,
  type BackgroundFormDraft,
} from './forms/background-form';
import {
  ClassForm,
  EMPTY_CLASS_DRAFT,
  draftFromClass,
  type ClassFormDraft,
} from './forms/class-form';
import {
  EMPTY_FEAT_DRAFT,
  FeatForm,
  draftFromFeat,
  type FeatFormDraft,
} from './forms/feat-form';
import { FieldI18n } from './forms/fields/field-i18n';
import { FieldString } from './forms/fields/field-string';
import {
  EMPTY_INVOCATION_DRAFT,
  InvocationForm,
  draftFromInvocation,
  type InvocationFormDraft,
} from './forms/invocation-form';
import {
  EMPTY_ITEM_DRAFT,
  ItemForm,
  draftFromItem,
  type ItemFormDraft,
} from './forms/item-form';
import {
  EMPTY_SPELL_DRAFT,
  SpellForm,
  draftFromSpell,
  type SpellFormDraft,
} from './forms/spell-form';
import {
  EMPTY_SUBANCESTRY_DRAFT,
  SubancestryForm,
  draftFromSubancestry,
  type SubancestryFormDraft,
} from './forms/subancestry-form';
import {
  EMPTY_SUBCLASS_DRAFT,
  SubclassForm,
  draftFromSubclass,
  type SubclassFormDraft,
} from './forms/subclass-form';
import { packFromBuilderState, usePackBuilder } from './use-pack-builder';
import { useExistingPack } from './use-existing-pack';

/**
 * PackEditor — création d'un pack de contenu custom in-app (JALON 3C.1).
 *
 * V1 : seule la catégorie « Dons » est éditable. Les 8 autres sont annoncées
 * comme « bientôt » (placeholder). Le flow couvre :
 *   1. Saisie des métadonnées (id, name FR/EN, auteur, version, description).
 *   2. Ajout / suppression de feats via FeatForm.
 *   3. Validation Zod complète au save (`parseCustomContentPack`) — la même
 *      passe que l'import par fichier (3B.4) pour garantir 100% de symétrie.
 *   4. `writePack` → Firestore `users/{uid}/customContentPacks/{packId}` →
 *      navigation vers `/account/content` (liste des packs).
 *
 * Les autres catégories arriveront en 3C.2..3C.9 ; le shell ci-dessous est
 * conçu pour accueillir des onglets supplémentaires sans refonte.
 */
export function PackEditorScreen(): JSX.Element {
  const navigate = useNavigate();
  const { user, isReady } = useAuth();
  // JALON 3C.10 — mode édition : si `:packId` est présent dans l'URL, on
  // charge le pack depuis Firestore et on hydrate le builder. Sinon, on
  // démarre en création (état initial vide).
  const { packId: editPackId } = useParams<{ packId: string }>();
  const isEditMode = Boolean(editPackId);
  const [isLoadingPack, setIsLoadingPack] = useState<boolean>(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const builder = usePackBuilder();
  const [featDraft, setFeatDraft] = useState<FeatFormDraft>(EMPTY_FEAT_DRAFT);
  const [isAddingFeat, setIsAddingFeat] = useState<boolean>(false);
  const [invocationDraft, setInvocationDraft] = useState<InvocationFormDraft>(
    EMPTY_INVOCATION_DRAFT,
  );
  const [isAddingInvocation, setIsAddingInvocation] = useState<boolean>(false);
  const [subancestryDraft, setSubancestryDraft] =
    useState<SubancestryFormDraft>(EMPTY_SUBANCESTRY_DRAFT);
  const [isAddingSubancestry, setIsAddingSubancestry] = useState<boolean>(false);
  const [backgroundDraft, setBackgroundDraft] = useState<BackgroundFormDraft>(
    EMPTY_BACKGROUND_DRAFT,
  );
  const [isAddingBackground, setIsAddingBackground] = useState<boolean>(false);
  const [subclassDraft, setSubclassDraft] = useState<SubclassFormDraft>(
    EMPTY_SUBCLASS_DRAFT,
  );
  const [isAddingSubclass, setIsAddingSubclass] = useState<boolean>(false);
  const [spellDraft, setSpellDraft] = useState<SpellFormDraft>(
    EMPTY_SPELL_DRAFT,
  );
  const [isAddingSpell, setIsAddingSpell] = useState<boolean>(false);
  const [itemDraft, setItemDraft] = useState<ItemFormDraft>(EMPTY_ITEM_DRAFT);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const [ancestryDraft, setAncestryDraft] = useState<AncestryFormDraft>(
    EMPTY_ANCESTRY_DRAFT,
  );
  const [isAddingAncestry, setIsAddingAncestry] = useState<boolean>(false);
  const [classDraft, setClassDraft] = useState<ClassFormDraft>(EMPTY_CLASS_DRAFT);
  const [isAddingClass, setIsAddingClass] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // JALON 3C.10 — chargement d'un pack existant. `useExistingPack` est un
  // one-shot `getPack` ; on hydrate ensuite le builder via `loadFromPack`.
  // Le hook gère le loading/error ; le pack inexistant (`null` après
  // `loading: false`) déclenche un message dédié dans le rendu.
  const existing = useExistingPack(user?.uid ?? null, editPackId);
  const [hasHydratedFromExisting, setHasHydratedFromExisting] =
    useState<boolean>(false);
  useEffect(() => {
    if (!isEditMode) return;
    setIsLoadingPack(existing.loading);
    if (existing.error) {
      setLoadError(existing.error.message);
      return;
    }
    if (existing.loading) return;
    if (!existing.pack) {
      setLoadError(t('customContent.editor.editMode.notFound'));
      return;
    }
    if (hasHydratedFromExisting) return;
    builder.loadFromPack(existing.pack);
    setHasHydratedFromExisting(true);
    setLoadError(null);
    // builder.loadFromPack est stable (useCallback) ; on l'omet pour éviter
    // une réhydration à chaque rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEditMode,
    existing.loading,
    existing.error,
    existing.pack,
    hasHydratedFromExisting,
  ]);

  const openFeatForm = useCallback(() => {
    setFeatDraft(EMPTY_FEAT_DRAFT);
    setIsAddingFeat(true);
  }, []);

  const closeFeatForm = useCallback(() => {
    setIsAddingFeat(false);
    setFeatDraft(EMPTY_FEAT_DRAFT);
  }, []);

  const confirmFeat = useCallback(
    (feat: Feat) => {
      builder.addFeat(feat);
      closeFeatForm();
    },
    [builder, closeFeatForm],
  );

  const openInvocationForm = useCallback(() => {
    setInvocationDraft(EMPTY_INVOCATION_DRAFT);
    setIsAddingInvocation(true);
  }, []);

  const closeInvocationForm = useCallback(() => {
    setIsAddingInvocation(false);
    setInvocationDraft(EMPTY_INVOCATION_DRAFT);
  }, []);

  const confirmInvocation = useCallback(
    (invocation: Invocation) => {
      builder.addInvocation(invocation);
      closeInvocationForm();
    },
    [builder, closeInvocationForm],
  );

  const openSubancestryForm = useCallback(() => {
    setSubancestryDraft(EMPTY_SUBANCESTRY_DRAFT);
    setIsAddingSubancestry(true);
  }, []);

  const closeSubancestryForm = useCallback(() => {
    setIsAddingSubancestry(false);
    setSubancestryDraft(EMPTY_SUBANCESTRY_DRAFT);
  }, []);

  const confirmSubancestry = useCallback(
    (subancestry: Subancestry) => {
      builder.addSubancestry(subancestry);
      closeSubancestryForm();
    },
    [builder, closeSubancestryForm],
  );

  const openBackgroundForm = useCallback(() => {
    setBackgroundDraft(EMPTY_BACKGROUND_DRAFT);
    setIsAddingBackground(true);
  }, []);

  const closeBackgroundForm = useCallback(() => {
    setIsAddingBackground(false);
    setBackgroundDraft(EMPTY_BACKGROUND_DRAFT);
  }, []);

  const confirmBackground = useCallback(
    (background: Background) => {
      builder.addBackground(background);
      closeBackgroundForm();
    },
    [builder, closeBackgroundForm],
  );

  const openSubclassForm = useCallback(() => {
    setSubclassDraft(EMPTY_SUBCLASS_DRAFT);
    setIsAddingSubclass(true);
  }, []);

  const closeSubclassForm = useCallback(() => {
    setIsAddingSubclass(false);
    setSubclassDraft(EMPTY_SUBCLASS_DRAFT);
  }, []);

  const confirmSubclass = useCallback(
    (subclass: Subclass) => {
      builder.addSubclass(subclass);
      closeSubclassForm();
    },
    [builder, closeSubclassForm],
  );

  const openSpellForm = useCallback(() => {
    setSpellDraft(EMPTY_SPELL_DRAFT);
    setIsAddingSpell(true);
  }, []);

  const closeSpellForm = useCallback(() => {
    setIsAddingSpell(false);
    setSpellDraft(EMPTY_SPELL_DRAFT);
  }, []);

  const confirmSpell = useCallback(
    (spell: Spell) => {
      builder.addSpell(spell);
      closeSpellForm();
    },
    [builder, closeSpellForm],
  );

  const openItemForm = useCallback(() => {
    setItemDraft(EMPTY_ITEM_DRAFT);
    setIsAddingItem(true);
  }, []);

  const closeItemForm = useCallback(() => {
    setIsAddingItem(false);
    setItemDraft(EMPTY_ITEM_DRAFT);
  }, []);

  const confirmItem = useCallback(
    (item: Item) => {
      builder.addItem(item);
      closeItemForm();
    },
    [builder, closeItemForm],
  );

  const openAncestryForm = useCallback(() => {
    setAncestryDraft(EMPTY_ANCESTRY_DRAFT);
    setIsAddingAncestry(true);
  }, []);

  const closeAncestryForm = useCallback(() => {
    setIsAddingAncestry(false);
    setAncestryDraft(EMPTY_ANCESTRY_DRAFT);
  }, []);

  const confirmAncestry = useCallback(
    (ancestry: Ancestry) => {
      builder.addAncestry(ancestry);
      closeAncestryForm();
    },
    [builder, closeAncestryForm],
  );

  const openClassForm = useCallback(() => {
    setClassDraft(EMPTY_CLASS_DRAFT);
    setIsAddingClass(true);
  }, []);

  const closeClassForm = useCallback(() => {
    setIsAddingClass(false);
    setClassDraft(EMPTY_CLASS_DRAFT);
  }, []);

  const confirmClass = useCallback(
    (cls: ClassEntity) => {
      builder.addClass(cls);
      closeClassForm();
    },
    [builder, closeClassForm],
  );

  const handleSave = useCallback(async () => {
    if (!user) return;
    const candidate = packFromBuilderState(builder.state);
    const result = parseCustomContentPack(candidate);
    if (!result.ok) {
      // On affiche la première erreur structurée — l'utilisateur corrige et
      // ré-essaie. Pour 3C.1 on garde le diagnostic minimal ; un panneau
      // « toutes les erreurs » arrivera en 3C.10 si l'usage le justifie.
      const first = result.errors[0];
      const label = first
        ? formatValidationError(first.scope, first.field, first.message)
        : t('customContent.editor.save.errorGeneric');
      setValidationError(label);
      showToast({
        kind: 'grim',
        title: t('customContent.editor.save.errorTitle'),
        sub: label,
      });
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    try {
      await writePack(user.uid, result.pack);
      showToast({
        kind: 'info',
        title: t('customContent.editor.save.successTitle'),
        sub: t('customContent.editor.save.successSub').replace(
          '{count}',
          String(result.totalEntities),
        ),
      });
      navigate('/account/content');
    } catch (err) {
      showToast({
        kind: 'grim',
        title: t('customContent.editor.save.errorTitle'),
        sub: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  }, [builder.state, navigate, user]);

  const handleCancel = useCallback(() => {
    navigate('/account/content');
  }, [navigate]);

  if (!isReady) return <Splash />;
  // JALON 3C.10 — en mode édition, on attend la fin de la lecture Firestore
  // avant de rendre le formulaire pour éviter le flash de l'état vierge.
  if (isEditMode && isLoadingPack) return <Splash />;
  if (isEditMode && loadError) {
    return (
      <main
        className="relative z-10 mx-auto w-full max-w-[640px] px-4 py-12 sm:px-6"
        data-screen="custom-content-pack-editor"
      >
        <GlassPanel
          className="px-6 py-8 text-center"
          data-testid="pack-editor-load-error"
        >
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.18em] text-gold-bright">
            {t('customContent.editor.editMode.errorTitle')}
          </h1>
          <p className="mt-4 font-serif text-body text-text">{loadError}</p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/account/content')}
              data-testid="pack-editor-load-error-back"
            >
              {t('customContent.editor.editMode.back')}
            </Button>
          </div>
        </GlassPanel>
      </main>
    );
  }

  const featCount = builder.state.feats.length;
  const invocationCount = builder.state.invocations.length;
  const subancestryCount = builder.state.subancestries.length;
  const backgroundCount = builder.state.backgrounds.length;
  const subclassCount = builder.state.subclasses.length;
  const spellCount = builder.state.spells.length;
  const itemCount = builder.state.items.length;
  const ancestryCount = builder.state.ancestries.length;
  const classCount = builder.state.classes.length;

  return (
    <main
      className="relative z-10 mx-auto w-full max-w-[860px] px-4 py-8 sm:px-6"
      data-screen="custom-content-pack-editor"
    >
      <header className="text-center">
        <Divider className="mb-4" />
        <h1
          className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright"
          data-testid="pack-editor-title"
        >
          {isEditMode
            ? t('customContent.editor.editMode.title')
            : t('customContent.editor.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-[48ch] font-serif text-body italic text-text-secondary">
          {isEditMode
            ? t('customContent.editor.editMode.subtitle')
            : t('customContent.editor.subtitle')}
        </p>
      </header>

      {/* Métadonnées du pack */}
      <section
        className="mt-8"
        aria-label={t('customContent.editor.meta.title')}
        data-testid="pack-editor-meta"
      >
        <GlassPanel className="px-6 py-6">
          <h2 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
            {t('customContent.editor.meta.title')}
          </h2>
          <Divider className="my-4" />
          <div className="flex flex-col gap-4">
            <FieldString
              label={t('customContent.editor.meta.id')}
              value={builder.state.meta.id}
              onChange={(value) => builder.setMetaField('id', value)}
              helper={
                isEditMode
                  ? t('customContent.editor.meta.idHelperEdit')
                  : t('customContent.editor.meta.idHelper')
              }
              required
              readOnly={isEditMode}
              testId="pack-meta-id"
            />
            <FieldI18n
              labelFr={t('customContent.editor.meta.nameFr')}
              labelEn={t('customContent.editor.meta.nameEn')}
              valueFr={builder.state.meta.nameFr}
              valueEn={builder.state.meta.nameEn}
              onChangeFr={(value) => builder.setMetaField('nameFr', value)}
              onChangeEn={(value) => builder.setMetaField('nameEn', value)}
              requiredFr
              testIdFr="pack-meta-name-fr"
              testIdEn="pack-meta-name-en"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldString
                label={t('customContent.editor.meta.author')}
                value={builder.state.meta.author}
                onChange={(value) => builder.setMetaField('author', value)}
                required
                testId="pack-meta-author"
              />
              <FieldString
                label={t('customContent.editor.meta.version')}
                value={builder.state.meta.version}
                onChange={(value) => builder.setMetaField('version', value)}
                helper={t('customContent.editor.meta.versionHelper')}
                required
                testId="pack-meta-version"
              />
            </div>
            <FieldI18n
              labelFr={t('customContent.editor.meta.descriptionFr')}
              labelEn={t('customContent.editor.meta.descriptionEn')}
              valueFr={builder.state.meta.descriptionFr}
              valueEn={builder.state.meta.descriptionEn}
              onChangeFr={(value) =>
                builder.setMetaField('descriptionFr', value)
              }
              onChangeEn={(value) =>
                builder.setMetaField('descriptionEn', value)
              }
              helperFr={t('customContent.editor.meta.descriptionHelper')}
              testIdFr="pack-meta-description-fr"
              testIdEn="pack-meta-description-en"
            />
          </div>
        </GlassPanel>
      </section>

      {/* Entités — catégories */}
      <section
        className="mt-10"
        aria-label={t('customContent.editor.entities.title')}
      >
        <h2 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
          {t('customContent.editor.entities.title')}
        </h2>
        <Divider className="mt-3" />

        {/* Feats */}
        <div className="mt-6" data-testid="pack-editor-feats">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.feats')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({featCount})
              </span>
            </h3>
            {!isAddingFeat ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openFeatForm}
                data-testid="pack-editor-add-feat"
              >
                {t('customContent.editor.feats.add')}
              </Button>
            ) : null}
          </header>

          {featCount === 0 && !isAddingFeat ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.feats.empty')}
            </p>
          ) : null}

          {featCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.feats.map((feat) => (
                <li
                  key={feat.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-feat-row"
                  data-feat-id={feat.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {feat.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {feat.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFeatDraft(draftFromFeat(feat));
                        setIsAddingFeat(true);
                      }}
                      data-testid="pack-editor-feat-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeFeat(feat.id)}
                      data-testid="pack-editor-feat-remove"
                    >
                      {t('customContent.editor.feats.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingFeat ? (
            <div className="mt-5">
              <FeatForm
                draft={featDraft}
                onChange={setFeatDraft}
                onConfirm={confirmFeat}
                onCancel={closeFeatForm}
              />
            </div>
          ) : null}
        </div>

        {/* Invocations occultistes */}
        <div className="mt-10" data-testid="pack-editor-invocations">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.invocations')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({invocationCount})
              </span>
            </h3>
            {!isAddingInvocation ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openInvocationForm}
                data-testid="pack-editor-add-invocation"
              >
                {t('customContent.editor.invocations.add')}
              </Button>
            ) : null}
          </header>

          {invocationCount === 0 && !isAddingInvocation ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.invocations.empty')}
            </p>
          ) : null}

          {invocationCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.invocations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-invocation-row"
                  data-invocation-id={inv.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {inv.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {inv.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInvocationDraft(draftFromInvocation(inv));
                        setIsAddingInvocation(true);
                      }}
                      data-testid="pack-editor-invocation-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeInvocation(inv.id)}
                      data-testid="pack-editor-invocation-remove"
                    >
                      {t('customContent.editor.invocations.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingInvocation ? (
            <div className="mt-5">
              <InvocationForm
                draft={invocationDraft}
                onChange={setInvocationDraft}
                onConfirm={confirmInvocation}
                onCancel={closeInvocationForm}
              />
            </div>
          ) : null}
        </div>

        {/* Sous-ascendances */}
        <div className="mt-10" data-testid="pack-editor-subancestries">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.subancestries')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({subancestryCount})
              </span>
            </h3>
            {!isAddingSubancestry ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openSubancestryForm}
                data-testid="pack-editor-add-subancestry"
              >
                {t('customContent.editor.subancestries.add')}
              </Button>
            ) : null}
          </header>

          {subancestryCount === 0 && !isAddingSubancestry ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.subancestries.empty')}
            </p>
          ) : null}

          {subancestryCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.subancestries.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-subancestry-row"
                  data-subancestry-id={sub.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {sub.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {sub.id} · {sub.ancestryId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSubancestryDraft(draftFromSubancestry(sub));
                        setIsAddingSubancestry(true);
                      }}
                      data-testid="pack-editor-subancestry-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeSubancestry(sub.id)}
                      data-testid="pack-editor-subancestry-remove"
                    >
                      {t('customContent.editor.subancestries.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingSubancestry ? (
            <div className="mt-5">
              <SubancestryForm
                draft={subancestryDraft}
                onChange={setSubancestryDraft}
                onConfirm={confirmSubancestry}
                onCancel={closeSubancestryForm}
              />
            </div>
          ) : null}
        </div>

        {/* Historiques */}
        <div className="mt-10" data-testid="pack-editor-backgrounds">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.backgrounds')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({backgroundCount})
              </span>
            </h3>
            {!isAddingBackground ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openBackgroundForm}
                data-testid="pack-editor-add-background"
              >
                {t('customContent.editor.backgrounds.add')}
              </Button>
            ) : null}
          </header>

          {backgroundCount === 0 && !isAddingBackground ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.backgrounds.empty')}
            </p>
          ) : null}

          {backgroundCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.backgrounds.map((bg) => (
                <li
                  key={bg.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-background-row"
                  data-background-id={bg.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {bg.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {bg.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBackgroundDraft(draftFromBackground(bg));
                        setIsAddingBackground(true);
                      }}
                      data-testid="pack-editor-background-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeBackground(bg.id)}
                      data-testid="pack-editor-background-remove"
                    >
                      {t('customContent.editor.backgrounds.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingBackground ? (
            <div className="mt-5">
              <BackgroundForm
                draft={backgroundDraft}
                onChange={setBackgroundDraft}
                onConfirm={confirmBackground}
                onCancel={closeBackgroundForm}
              />
            </div>
          ) : null}
        </div>

        {/* Sous-classes */}
        <div className="mt-10" data-testid="pack-editor-subclasses">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.subclasses')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({subclassCount})
              </span>
            </h3>
            {!isAddingSubclass ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openSubclassForm}
                data-testid="pack-editor-add-subclass"
              >
                {t('customContent.editor.subclasses.add')}
              </Button>
            ) : null}
          </header>

          {subclassCount === 0 && !isAddingSubclass ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.subclasses.empty')}
            </p>
          ) : null}

          {subclassCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.subclasses.map((sc) => (
                <li
                  key={sc.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-subclass-row"
                  data-subclass-id={sc.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {sc.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {sc.id} · {sc.classId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSubclassDraft(draftFromSubclass(sc));
                        setIsAddingSubclass(true);
                      }}
                      data-testid="pack-editor-subclass-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeSubclass(sc.id)}
                      data-testid="pack-editor-subclass-remove"
                    >
                      {t('customContent.editor.subclasses.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingSubclass ? (
            <div className="mt-5">
              <SubclassForm
                draft={subclassDraft}
                onChange={setSubclassDraft}
                onConfirm={confirmSubclass}
                onCancel={closeSubclassForm}
              />
            </div>
          ) : null}
        </div>

        {/* Sorts */}
        <div className="mt-10" data-testid="pack-editor-spells">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.spells')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({spellCount})
              </span>
            </h3>
            {!isAddingSpell ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openSpellForm}
                data-testid="pack-editor-add-spell"
              >
                {t('customContent.editor.spells.add')}
              </Button>
            ) : null}
          </header>

          {spellCount === 0 && !isAddingSpell ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.spells.empty')}
            </p>
          ) : null}

          {spellCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.spells.map((spell) => (
                <li
                  key={spell.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-spell-row"
                  data-spell-id={spell.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {spell.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {spell.id} · {t('spell.level.prefix')} {spell.level} ·{' '}
                      {t(`school.${spell.school}`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSpellDraft(draftFromSpell(spell));
                        setIsAddingSpell(true);
                      }}
                      data-testid="pack-editor-spell-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeSpell(spell.id)}
                      data-testid="pack-editor-spell-remove"
                    >
                      {t('customContent.editor.spells.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingSpell ? (
            <div className="mt-5">
              <SpellForm
                draft={spellDraft}
                onChange={setSpellDraft}
                onConfirm={confirmSpell}
                onCancel={closeSpellForm}
              />
            </div>
          ) : null}
        </div>

        {/* Objets */}
        <div className="mt-10" data-testid="pack-editor-items">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.items')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({itemCount})
              </span>
            </h3>
            {!isAddingItem ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openItemForm}
                data-testid="pack-editor-add-item"
              >
                {t('customContent.editor.items.add')}
              </Button>
            ) : null}
          </header>

          {itemCount === 0 && !isAddingItem ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.items.empty')}
            </p>
          ) : null}

          {itemCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-item-row"
                  data-item-id={item.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {item.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {item.id} · {t(`item.category.${item.category}`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setItemDraft(draftFromItem(item));
                        setIsAddingItem(true);
                      }}
                      data-testid="pack-editor-item-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeItem(item.id)}
                      data-testid="pack-editor-item-remove"
                    >
                      {t('customContent.editor.items.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingItem ? (
            <div className="mt-5">
              <ItemForm
                draft={itemDraft}
                onChange={setItemDraft}
                onConfirm={confirmItem}
                onCancel={closeItemForm}
              />
            </div>
          ) : null}
        </div>

        {/* Ascendances */}
        <div className="mt-10" data-testid="pack-editor-ancestries">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.ancestries')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({ancestryCount})
              </span>
            </h3>
            {!isAddingAncestry ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openAncestryForm}
                data-testid="pack-editor-add-ancestry"
              >
                {t('customContent.editor.ancestries.add')}
              </Button>
            ) : null}
          </header>

          {ancestryCount === 0 && !isAddingAncestry ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.ancestries.empty')}
            </p>
          ) : null}

          {ancestryCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.ancestries.map((ancestry) => (
                <li
                  key={ancestry.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-ancestry-row"
                  data-ancestry-id={ancestry.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {ancestry.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {ancestry.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAncestryDraft(draftFromAncestry(ancestry));
                        setIsAddingAncestry(true);
                      }}
                      data-testid="pack-editor-ancestry-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeAncestry(ancestry.id)}
                      data-testid="pack-editor-ancestry-remove"
                    >
                      {t('customContent.editor.ancestries.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingAncestry ? (
            <div className="mt-5">
              <AncestryForm
                draft={ancestryDraft}
                onChange={setAncestryDraft}
                onConfirm={confirmAncestry}
                onCancel={closeAncestryForm}
              />
            </div>
          ) : null}
        </div>

        {/* Classes (JALON 3C.9) — dernière catégorie utilisateur-facing du
            JALON 3C. À ce stade, toutes les 9 catégories du pack custom sont
            éditables in-app. */}
        <div className="mt-10" data-testid="pack-editor-classes">
          <header className="flex items-center justify-between gap-3">
            <h3 className="font-title text-body uppercase tracking-[0.18em] text-text">
              {t('customContent.category.classes')}
              <span className="ml-2 font-meta text-meta text-text-secondary">
                ({classCount})
              </span>
            </h3>
            {!isAddingClass ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openClassForm}
                data-testid="pack-editor-add-class"
              >
                {t('customContent.editor.classes.add')}
              </Button>
            ) : null}
          </header>

          {classCount === 0 && !isAddingClass ? (
            <p className="mt-4 font-serif text-body-sm italic text-text-secondary">
              {t('customContent.editor.classes.empty')}
            </p>
          ) : null}

          {classCount > 0 ? (
            <ul className="mt-4 space-y-2">
              {builder.state.classes.map((cls) => (
                <li
                  key={cls.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
                  data-testid="pack-editor-class-row"
                  data-class-id={cls.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-body text-text">
                      {cls.name.fr}
                    </p>
                    <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {cls.id} · {cls.hitDie.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setClassDraft(draftFromClass(cls));
                        setIsAddingClass(true);
                      }}
                      data-testid="pack-editor-class-edit"
                    >
                      {t('customContent.editor.entityRow.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => builder.removeClass(cls.id)}
                      data-testid="pack-editor-class-remove"
                    >
                      {t('customContent.editor.classes.remove')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {isAddingClass ? (
            <div className="mt-5">
              <ClassForm
                draft={classDraft}
                onChange={setClassDraft}
                onConfirm={confirmClass}
                onCancel={closeClassForm}
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* Erreur de validation */}
      {validationError ? (
        <p
          className="mt-6 rounded-card-sm border border-crimson/40 bg-crimson/[0.06] px-4 py-3 font-serif text-body-sm text-crimson"
          role="alert"
          data-testid="pack-editor-validation-error"
        >
          {validationError}
        </p>
      ) : null}

      {/* Actions */}
      <footer className="mt-10 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={handleCancel}
          disabled={isSaving}
          data-testid="pack-editor-cancel"
        >
          {t('customContent.editor.cancel')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => void handleSave()}
          disabled={
            isSaving ||
            isAddingFeat ||
            isAddingInvocation ||
            isAddingSubancestry ||
            isAddingBackground ||
            isAddingSubclass ||
            isAddingSpell ||
            isAddingItem ||
            isAddingAncestry ||
            isAddingClass
          }
          data-testid="pack-editor-save"
        >
          {t('customContent.editor.save')}
        </Button>
      </footer>
    </main>
  );
}

function formatValidationError(
  scope: 'root' | 'meta' | 'entity',
  field: string | null,
  message: string,
): string {
  const prefix =
    scope === 'meta'
      ? t('customContent.errors.scope.meta')
      : scope === 'entity'
        ? t('customContent.errors.scope.entity')
        : t('customContent.errors.scope.root');
  const parts: string[] = [prefix];
  if (field) parts.push(field);
  return `${parts.join(' · ')} — ${message}`;
}
