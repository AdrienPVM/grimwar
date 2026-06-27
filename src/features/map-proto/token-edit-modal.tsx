import { useId, useState, type ChangeEvent, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
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
 * Convention map-proto : chaînes FR inline (cf. en-tête `map-live-screen`).
 */

/**
 * Palette de couleurs de jeton. Ce sont des données DE DOMAINE (la couleur
 * d'un marqueur de créature choisie par le MJ), pas des tokens de design —
 * d'où les hex en clair, comme `TOKEN_COLORS` côté `map-live-screen`. Huit
 * teintes nettement distinguables sur un fond de carte sombre.
 */
const TOKEN_PALETTE: readonly { hex: string; label: string }[] = [
  { hex: '#60a5fa', label: 'Bleu' },
  { hex: '#f87171', label: 'Rouge' },
  { hex: '#4ade80', label: 'Vert' },
  { hex: '#fbbf24', label: 'Ambre' },
  { hex: '#c084fc', label: 'Violet' },
  { hex: '#2dd4bf', label: 'Turquoise' },
  { hex: '#f472b6', label: 'Rose' },
  { hex: '#9ca3af', label: 'Gris' },
];

const KIND_LABELS: Record<MapToken['kind'], string> = {
  pj: 'Personnage joueur',
  pnj: 'PNJ / monstre',
  marker: 'Repère',
};

/**
 * Sous-titre de chaque type, affiché sous le libellé dans le sélecteur. Aide le
 * MJ à choisir sans connaître le jargon : un repère ne porte pas de vision et
 * n'alimente pas la ligne de vue (cf. `map-scene` qui saute les markers).
 */
const KIND_HINTS: Record<MapToken['kind'], string> = {
  pj: 'Allié contrôlé par un joueur',
  pnj: 'Créature contrôlée par le MJ',
  marker: 'Point d’intérêt, sans vision',
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
const VISION_PRESETS: readonly { ft: number; sub: string }[] = [
  { ft: 0, sub: 'Sans ligne de vue' },
  { ft: 30, sub: 'Vision normale' },
  { ft: 60, sub: 'Vision dans le noir' },
  { ft: 120, sub: 'Vision dans le noir étendue' },
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
  label: string;
  totalFt: number;
}[] = [
  { key: 'none', label: 'Aucune', totalFt: 0 },
  { key: 'candle', label: 'Bougie', totalFt: 10 },
  { key: 'torch', label: 'Torche', totalFt: 40 },
  { key: 'lantern', label: 'Lanterne', totalFt: 60 },
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
      closeLabel="Fermer l'édition du jeton"
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
        err instanceof TokenImageError
          ? err.message
          : "Échec du chargement de l'image.",
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
          {KIND_LABELS[kind]}
        </p>
        <h2
          id={titleId}
          className="font-display text-2xl leading-tight text-gold-bright"
        >
          Modifier le jeton
        </h2>
      </header>

      {canEditImage && (
        <div className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            Portrait
          </span>
          <div className="flex items-center gap-4">
            {/* Vignette ronde : portrait s'il existe, sinon pastille couleur de
                repli (ce que la carte affiche sans portrait). */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Portrait de ${trimmed || 'ce jeton'}`}
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
                  ? 'Traitement…'
                  : imageUrl
                    ? 'Remplacer'
                    : 'Ajouter une image'}
              </label>
              {imageUrl && onRemoveImage && (
                <button
                  type="button"
                  data-testid="token-image-remove"
                  onClick={onRemoveImage}
                  className="rounded-pill border border-crimson/40 px-4 py-2 font-title text-[10px] uppercase tracking-[0.18em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/[0.08]"
                >
                  Retirer l&apos;image
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
            Recadrée en rond et optimisée, puis synchronisée sur tous les écrans
            (vue TV, autres appareils).
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          Type de jeton
        </span>
        <div
          role="radiogroup"
          aria-label="Type de jeton"
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
                aria-label={`${KIND_LABELS[k]} — ${KIND_HINTS[k]}`}
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
                  {KIND_LABELS[k]}
                </span>
                <span className="font-title text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  {KIND_HINTS[k]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          Nom
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
          Couleur
        </span>
        <div
          role="radiogroup"
          aria-label="Couleur du jeton"
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
                aria-label={c.label}
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
            Portée de vision
          </span>
          <div
            role="radiogroup"
            aria-label="Portée de vision du jeton"
            className="grid grid-cols-2 gap-2"
          >
            {VISION_PRESETS.map((p) => {
              const selected = p.ft === visionFt;
              const primary = p.ft === 0 ? 'Aucune' : `${formatMetersValue(p.ft)} m`;
              return (
                <button
                  key={p.ft}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${primary} — ${p.sub}`}
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
                    {p.sub}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="font-serif text-meta italic text-text-faint">
            Rayon de brouillard dissipé autour du jeton quand la ligne de vue
            est active.
          </p>
        </div>
      )}

      {canSetLight && (
        <div className="flex flex-col gap-2">
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            Lumière portée
          </span>
          <div
            role="radiogroup"
            aria-label="Lumière portée par le jeton"
            className="grid grid-cols-2 gap-2"
          >
            {CARRIED_LIGHT_OPTIONS.map((opt) => {
              const selected = opt.key === carried;
              const sub =
                opt.key === 'none'
                  ? 'Ne porte rien'
                  : `Rayon ${formatMetersValue(opt.totalFt)} m`;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${opt.label} — ${sub}`}
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
                    {opt.label}
                  </span>
                  <span className="font-title text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    {sub}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="font-serif text-meta italic text-text-faint">
            La lumière suit le jeton quand il se déplace (appliquée
            immédiatement).
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
          Enregistrer
        </button>
        <button
          type="button"
          data-testid="token-edit-duplicate"
          onClick={onDuplicate}
          className="rounded-pill border border-gold-dim/40 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-text-secondary transition-colors duration-200 ease-base hover:bg-gold/10 hover:text-gold-bright"
        >
          Dupliquer le jeton
        </button>
        <button
          type="button"
          data-testid="token-edit-delete"
          onClick={onDelete}
          className="rounded-pill border border-crimson/40 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/[0.08]"
        >
          Supprimer ce jeton
        </button>
      </div>
    </div>
  );
}
