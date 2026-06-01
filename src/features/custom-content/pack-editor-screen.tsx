import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { parseCustomContentPack } from '@/shared/lib/custom-content/parse-pack';
import { t } from '@/shared/lib/i18n';
import { writePack } from '@/shared/lib/services/pack-storage';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Feat } from '@/shared/types/content';

import { FeatForm, EMPTY_FEAT_DRAFT, type FeatFormDraft } from './forms/feat-form';
import { FieldI18n } from './forms/fields/field-i18n';
import { FieldString } from './forms/fields/field-string';
import {
  packFromBuilderState,
  usePackBuilder,
} from './use-pack-builder';

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
  const builder = usePackBuilder();
  const [featDraft, setFeatDraft] = useState<FeatFormDraft>(EMPTY_FEAT_DRAFT);
  const [isAddingFeat, setIsAddingFeat] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const featCount = builder.state.feats.length;

  return (
    <main
      className="relative z-10 mx-auto w-full max-w-[860px] px-4 py-8 sm:px-6"
      data-screen="custom-content-pack-editor"
    >
      <header className="text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {t('customContent.editor.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-[48ch] font-serif text-body italic text-text-secondary">
          {t('customContent.editor.subtitle')}
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
              helper={t('customContent.editor.meta.idHelper')}
              required
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => builder.removeFeat(feat.id)}
                    data-testid="pack-editor-feat-remove"
                  >
                    {t('customContent.editor.feats.remove')}
                  </Button>
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

        {/* Catégories à venir (3C.2..3C.9). On les liste pour communiquer la
            roadmap sans pour autant les rendre cliquables : un placeholder
            grisé suffit en 3C.1. */}
        <div className="mt-10 rounded-card border border-dashed border-white-8 px-6 py-5">
          <p className="font-meta text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('customContent.editor.comingSoon.title')}
          </p>
          <p className="mt-2 font-serif text-body-sm text-text-secondary">
            {t('customContent.editor.comingSoon.body')}
          </p>
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
          disabled={isSaving || isAddingFeat}
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
