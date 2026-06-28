import { useId, useState, type ChangeEvent, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';
import { formatMetersValue } from '@/shared/lib/rules/distance';
import type { MapToken } from '@/shared/types/map';

import type { LightPresetKey } from './light-state';
import { fileToTokenImage, TokenImageError } from './token-image-file';

/**
 * Éditeur d'un jeton de carte live (nom + couleur + suppression unitaire).
 *
 * S'ouvre au TAP d'un jeton (geste distinct du drag, cf. seuil dans
 * `map-live-screen`). Avant ce composant, la vue live ne permettait QUE de
 * poser un jeton « PJ/PNJ » au centre et de tout effacer en bloc — aucune
 * façon de renommer « PNJ » en « Gobelin chef », de le recolorer pour
 * distinguer deux factions, ou de retirer UN seul jeton vaincu.
 *
 * Données : `label` et `color` existent déjà sur `mapTokenSchema`, écrits via
 * `updateToken`/`deleteToken` (mêmes helpers que le mouvement, même autorité
 * Firestore déjà en live) — zéro changement de schéma, zéro nouvelle rule.
 *
 * Chaînes UI passées par `t()` (namespace `map.token.*`). Les constantes de
 * données (palette, types, presets) portent une clé i18n `StringKey` résolue au
 * rendu, pas le libellé en clair.
 */

/**
 * Palette de couleurs de jeton. Ce sont des données DE DOMAINE (la couleur
 * d'un marqueur de créature choisie par le MJ), pas des tokens de design —
 * d'où les hex en clair, comme `TOKEN_COLORS` côté `map-live-screen`. Huit
 * teintes nettement distinguables sur un fond de carte sombre.
 */
const TOKEN_PALETTE: readonly { hex: string; labelKey: StringKey }[] = [
  { hex: '#60a5fa', labelKey: 'map.token.colorBlue' },
  { hex: '#f87171', labelKey: 'map.token.colorRed' },
  { hex: '#4ade80', labelKey: 'map.token.colorGreen' },
  { hex: '#fbbf24', labelKey: 'map.token.colorAmber' },
  { hex: '#c084fc', labelKey: 'map.token.colorPurple' },
  { hex: '#2dd4bf', labelKey: 'map.token.colorTurquoise' },
  { hex: '#f472b6', labelKey: 'map.token.colorPink' },
  { hex: '#9ca3af', labelKey: 'map.token.colorGray' },
];

const KIND_LABELS: Record<MapToken['kind'], StringKey> = {
  pj: 'map.token.kindPj',
  pnj: 'map.token.kindPnj',
  marker: 'map.token.kindMarker',
};

/**
 * Sous-titre de chaque type, affiché sous le libellé dans le sélecteur. Aide le
 * MJ à choisir sans connaître le jargon : un repère ne porte pas de vision et
 * n'alimente pas la ligne de vue (cf. `map-scene` qui saute les markers).
 */
const KIND_HINTS: Record<MapToken['kind'], StringKey> = {
  pj: 'map.token.kindHintPj',
  pnj: 'map.token.kindHintPnj',
  marker: 'map.token.kindHintMarker',
};

/** Ordre d'affichage des types dans le sélecteur. */
const KIND_ORDER: readonly MapToken['kind'][] = ['pj', 'pnj', 'marker'];

const LABEL_MAX = 24;

/**
 * Portées de vision SRD, EN PIEDS (valeur canonique stockée — cf. `distance.ts`).
 * Affichées en mètres au rendu (convention FR ×0,3). Termes FR repris du bundle
 * SRD officiel (`public/data/*.json` : « Vision dans le noir », « …étendue à 36 m »).
 * Le rayon pilote la dissipation du brouillard autour du jeton (ligne de vue) :
 * un non-marqueur sans valeur explicite vaut `DEFAULT_VISION_FT` côté `map-scene`.
 */
const VISION_PRESETS: readonly { ft: number; subKey: StringKey }[] = [
  { ft: 0, subKey: 'map.token.visionNoneSub' },
  { ft: 30, subKey: 'map.token.visionNormalSub' },
  { ft: 60, subKey: 'map.token.visionDarkSub' },
  { ft: 120, subKey: 'map.token.visionDarkExtSub' },
];

/** Défaut quand un jeton non-marqueur n'a pas de portée explicite (= map-scene). */
const VISION_DEFAULT_FT = 30;

/**
 * Lumières PORTÉES proposées dans l'éditeur. Sous-ensemble des presets SRD
 * limité aux sources qu'une créature tient réellement (bougie / torche /
 * lanterne) ; le soleil et le sort Lumière restent posables en source statique
 * via la barre d'outils. La sentinelle `'none'` = ne porte aucune lumière.
 * `radius` = portée totale (vive + faible) en pieds, pour l'affichage en mètres.
 */
const CARRIED_LIGHT_OPTIONS: readonly {
  key: LightPresetKey | 'none';
  labelKey: StringKey;
  totalFt: number;
}[] = [
  { key: 'none', labelKey: 'map.token.lightNone', totalFt: 0 },
  { key: 'candle', labelKey: 'map.token.lightCandle', totalFt: 10 },
  { key: 'torch', labelKey: 'map.token.lightTorch', totalFt: 40 },
  { key: 'lantern', labelKey: 'map.token.lightLantern', totalFt: 60 },
];

interface Props {
  /** Jeton en cours d'édition, ou `null` quand la modale est fermée. */
  token: MapToken | null;
  /**
   * Persiste le nom + la couleur (+ portée de vision pour les non-marqueurs).
   * Le caller route vers `updateToken`. `visionRadius` est omis pour un repère
   * (`marker`) — un repère ne porte pas de vision et n'alimente pas la LOS.
   */
  onSave: (patch: {
    kind: MapToken['kind'];
    label: string;
    color: string;
    visionRadius?: number;
  }) => void;
  /** Duplique ce jeton (même type/couleur/vision, décalé). Ferme la modale. */
  onDuplicate: () => void;
  /** Supprime ce seul jeton (le caller route vers `deleteToken`). */
  onDelete: () => void;
  /** Ferme sans rien changer. */
  onClose: () => void;
  /**
   * Portrait courant (data URL base64) ou `null`. Affiché en vignette ronde.
   * Persisté INLINE sur le doc Firestore du jeton (`imageDataUrl`, optimisé
   * ≤32 Ko) → synchronisé cross-device.
   */
  imageUrl?: string | null;
  /**
   * Persiste un portrait (data URL DÉJÀ redimensionné par le form). Quand
   * absent, la section « Portrait » n'est pas rendue (capacité non câblée).
   */
  onUploadImage?: (dataUrl: string) => void;
  /** Retire le portrait du jeton. Rendu seulement si `onUploadImage` est fourni. */
  onRemoveImage?: () => void;
  /**
   * Preset de la lumière actuellement PORTÉE par ce jeton (`null` = aucune).
   * Source : le caller dérive `carriedLightPreset(map.lightSources, tokenId)`.
   */
  carriedLight?: LightPresetKey | null;
  /**
   * Change (ou retire avec `null`) la lumière portée par le jeton. Écriture
   * IMMÉDIATE côté caller (mise à jour de `map.lightSources`), comme le portrait
   * — pas attachée au bouton « Enregistrer ». Quand absent, la section « Lumière
   * portée » n'est pas rendue (capacité non câblée).
   */
  onCarriedLightChange?: (preset: LightPresetKey | null) => void;
}

export function TokenEditModal({
  token,
  onSave,
  onDuplicate,
  onDelete,
  onClose,
  imageUrl = null,
  onUploadImage,
  onRemoveImage,
  carriedLight = null,
  onCarriedLightChange,
}: Props): JSX.Element | null {
  return (
    <DetailModal
      open={token !== null}
      onClose={onClose}
      size="sm"
      closeLabel={t('map.token.closeLabel')}
    >
      {/* Form remonté (`key={id}`) à chaque jeton → state local frais sans
          `useEffect` de synchronisation (cf. convention « pas de useEffect
          pour de l'état dérivé »). */}
      {token && (
        <TokenEditForm
          key={token.id}
          token={token}
          onSave={onSave}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          imageUrl={imageUrl}
          onUploadImage={onUploadImage}
          onRemoveImage={onRemoveImage}
          carriedLight={carriedLight}
          onCarriedLightChange={onCarriedLightChange}
        />
      )}
    </DetailModal>
  );
}

function TokenEditForm({
  token,
  onSave,
  onDuplicate,
  onDelete,
  imageUrl,
  onUploadImage,
  onRemoveImage,
  carriedLight,
  onCarriedLightChange,
}: {
  token: MapToken;
  onSave: Props['onSave'];
  onDuplicate: Props['onDuplicate'];
  onDelete: Props['onDelete'];
  imageUrl: string | null;
  onUploadImage: Props['onUploadImage'];
  onRemoveImage: Props['onRemoveImage'];
  carriedLight: LightPresetKey | null;
  onCarriedLightChange: Props['onCarriedLightChange'];
}): JSX.Element {
  const [kind, setKind] = useState<MapToken['kind']>(token.kind);
  const [label, setLabel] = useState(token.label);
  const [color, setColor] = useState(token.color);
  // Les marqueurs ne portent pas de vision ; on initialise quand même l'état au
  // défaut pour garder le hook inconditionnel, mais la section n'est pas rendue.
  const [visionFt, setVisionFt] = useState(
    token.visionRadius ?? VISION_DEFAULT_FT,
  );
  // État LOCAL de l'upload de portrait : `busy` pendant le décodage/redim, et
  // message d'erreur FR adjacent au champ. Le portrait lui-même vient de la prop
  // `imageUrl` (source = doc Firestore côté parent), jamais d'un state local.
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  // Lumière portée : état LOCAL optimiste seedé une fois au montage (le form est
  // remonté par jeton via `key`). Le clic écrit IMMÉDIATEMENT côté caller (comme
  // le portrait) et met à jour la sélection sans attendre le round-trip Firestore.
  const [carried, setCarried] = useState<LightPresetKey | 'none'>(
    carriedLight ?? 'none',
  );
  const titleId = useId();

  const trimmed = label.trim();
  const canSave = trimmed.length > 0;
  // Dérivé du type LOCAL (pas de `token.kind`) : reclasser en « repère » masque
  // la section vision instantanément, sans `useEffect` de synchro.
  const hasVision = kind !== 'marker';
  // La section portrait n'existe que si le caller a câblé l'upload (capacité).
  const canEditImage = onUploadImage != null;
  // Idem pour la lumière portée : rendue seulement si le caller la câble.
  const canSetLight = onCarriedLightChange != null;

  const handleCarriedLight = (key: LightPresetKey | 'none'): void => {
    setCarried(key);
    onCarriedLightChange?.(key === 'none' ? null : key);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    // Réinitialise l'input pour autoriser le re-choix du même fichier.
    e.target.value = '';
    if (!file || !onUploadImage) return;
    setImageError(null);
    setImageBusy(true);
    try {
      const dataUrl = await fileToTokenImage(file);
      onUploadImage(dataUrl);
    } catch (err) {
      setImageError(
        err instanceof TokenImageError ? err.message : t('map.token.imageError'),
      );
    } finally {
      setImageBusy(false);
    }
  };

  const handleSave = (): void => {
    onSave({
      kind,
      label: trimmed,
      color,
      // Patch minimal : on ne pousse `visionRadius` que pour un porteur de vision.
      ...(hasVision ? { visionRadius: visionFt } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-1 pr-10">
        <p
          data-testid="token-edit-kind-eyebrow"
          className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary transition-colors duration-200 ease-base"
        >
          {t(KIND_LABELS[kind])}
        </p>
        <h2
          id={titleId}
          className="font-display text-2xl leading-tight text-gold-bright"
        >
          {t('map.token.editTitle')}
        </h2>
      </header>

      {canEditImage && (
        <div className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('map.token.portraitSection')}
          </span>
          <div className="flex items-center gap-4">
            {/* Vignette ronde : portrait s'il existe, sinon pastille couleur de
                repli (ce que la carte affiche sans portrait). */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${t('map.token.portraitAltPrefix')}${trimmed || t('map.token.portraitAltFallback')}`}
                data-testid="token-image-preview"
                className="h-16 w-16 shrink-0 rounded-full border-2 border-gold-dim/50 object-cover"
              />
            ) : (
              <span
                aria-hidden
                data-testid="token-image-placeholder"
                // Couleur de domaine (teinte du jeton) → style dynamique légitime.
                style={{ backgroundColor: token.color }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white-8 font-title text-[10px] uppercase tracking-[0.12em] text-white/70"
              >
                {kind === 'marker' ? '•' : kind.toUpperCase()}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-gold-dim/50 px-4 py-2 font-title text-[11px] uppercase tracking-[0.18em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10">
                <input
                  type="file"
                  accept="image/*"
                  data-testid="token-image-input"
                  onChange={(e) => {
                    void handleFile(e);
                  }}
                  className="sr-only"
                />
                {imageBusy
                  ? t('map.token.imageProcessing')
                  : imageUrl
                    ? t('map.token.imageReplace')
                    : t('map.token.imageAdd')}
              </label>
              {imageUrl && onRemoveImage && (
                <button
                  type="button"
                  data-testid="token-image-remove"
                  onClick={onRemoveImage}
                  className="rounded-pill border border-crimson/40 px-4 py-2 font-title text-[10px] uppercase tracking-[0.18em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/[0.08]"
                >
                  {t('map.token.imageRemove')}
                </button>
              )}
            </div>
          </div>
          {imageError && (
            <p
              data-testid="token-image-error"
              className="rounded-card-sm border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-serif text-meta text-crimson"
            >
              {imageError}
            </p>
          )}
          <p className="font-serif text-meta italic text-text-faint">
            {t('map.token.imageHelp')}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('map.token.kindSection')}
        </span>
        <div
          role="radiogroup"
          aria-label={t('map.token.kindSection')}
          className="flex flex-col gap-2"
        >
          {KIND_ORDER.map((k) => {
            const selected = k === kind;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${t(KIND_LABELS[k])} — ${t(KIND_HINTS[k])}`}
                data-testid={`token-kind-${k}`}
                onClick={() => setKind(k)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-card-sm border px-3 py-2 text-left transition-colors duration-200 ease-base',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/50',
                  selected
                    ? 'border-gold-bright bg-gold/10'
                    : 'border-white-8 hover:border-gold-dim/50',
                )}
              >
                <span
                  className={cn(
                    'font-serif text-body',
                    selected ? 'text-gold-bright' : 'text-text',
                  )}
                >
                  {t(KIND_LABELS[k])}
                </span>
                <span className="font-title text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  {t(KIND_HINTS[k])}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('map.common.nameLabel')}
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={LABEL_MAX}
          data-testid="token-edit-label"
          className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-serif text-body text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('map.token.colorSection')}
        </span>
        <div
          role="radiogroup"
          aria-label={t('map.token.colorGroupAria')}
          className="flex flex-wrap gap-3"
        >
          {TOKEN_PALETTE.map((c) => {
            const selected = c.hex.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(c.labelKey)}
                data-testid={`token-color-${c.hex.slice(1)}`}
                onClick={() => setColor(c.hex)}
                // Couleur de domaine (teinte du jeton) → style dynamique légitime.
                style={{ backgroundColor: c.hex }}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition-transform duration-200 ease-base',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/50',
                  selected
                    ? 'scale-110 border-gold-bright'
                    : 'border-white-8 hover:scale-105',
                )}
              />
            );
          })}
        </div>
      </div>

      {hasVision && (
        <div className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('map.token.visionSection')}
          </span>
          <div
            role="radiogroup"
            aria-label={t('map.token.visionGroupAria')}
            className="grid grid-cols-2 gap-2"
          >
            {VISION_PRESETS.map((p) => {
              const selected = p.ft === visionFt;
              const primary =
                p.ft === 0 ? t('map.token.visionNone') : `${formatMetersValue(p.ft)} m`;
              return (
                <button
                  key={p.ft}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${primary} — ${t(p.subKey)}`}
                  data-testid={`token-vision-${p.ft}`}
                  onClick={() => setVisionFt(p.ft)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-card-sm border px-3 py-2 text-left transition-colors duration-200 ease-base',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/50',
                    selected
                      ? 'border-gold-bright bg-gold/10'
                      : 'border-white-8 hover:border-gold-dim/50',
                  )}
                >
                  <span
                    className={cn(
                      'font-serif text-body',
                      selected ? 'text-gold-bright' : 'text-text',
                    )}
                  >
                    {primary}
                  </span>
                  <span className="font-title text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    {t(p.subKey)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="font-serif text-meta italic text-text-faint">
            {t('map.token.visionHelp')}
          </p>
        </div>
      )}

      {canSetLight && (
        <div className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('map.token.lightSection')}
          </span>
          <div
            role="radiogroup"
            aria-label={t('map.token.lightGroupAria')}
            className="grid grid-cols-2 gap-2"
          >
            {CARRIED_LIGHT_OPTIONS.map((opt) => {
              const selected = opt.key === carried;
              const sub =
                opt.key === 'none'
                  ? t('map.token.lightNoneSub')
                  : `${t('map.token.lightRadiusPrefix')}${formatMetersValue(opt.totalFt)} m`;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${t(opt.labelKey)} — ${sub}`}
                  data-testid={`token-light-${opt.key}`}
                  onClick={() => handleCarriedLight(opt.key)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-card-sm border px-3 py-2 text-left transition-colors duration-200 ease-base',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/50',
                    selected
                      ? 'border-gold-bright bg-gold/10'
                      : 'border-white-8 hover:border-gold-dim/50',
                  )}
                >
                  <span
                    className={cn(
                      'font-serif text-body',
                      selected ? 'text-gold-bright' : 'text-text',
                    )}
                  >
                    {t(opt.labelKey)}
                  </span>
                  <span className="font-title text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    {sub}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="font-serif text-meta italic text-text-faint">
            {t('map.token.lightHelp')}
          </p>
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2">
        <button
          type="button"
          data-testid="token-edit-save"
          disabled={!canSave}
          onClick={handleSave}
          className="rounded-pill border border-gold-dim/50 bg-gold/10 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/20 disabled:opacity-40"
        >
          {t('map.token.save')}
        </button>
        <button
          type="button"
          data-testid="token-edit-duplicate"
          onClick={onDuplicate}
          className="rounded-pill border border-gold-dim/40 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-text-secondary transition-colors duration-200 ease-base hover:bg-gold/10 hover:text-gold-bright"
        >
          {t('map.token.duplicate')}
        </button>
        <button
          type="button"
          data-testid="token-edit-delete"
          onClick={onDelete}
          className="rounded-pill border border-crimson/40 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/[0.08]"
        >
          {t('map.token.delete')}
        </button>
      </div>
    </div>
  );
}
