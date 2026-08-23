import { useId, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { t } from '@/shared/lib/i18n';
import { formatMetersValue } from '@/shared/lib/rules/distance';
import type { MapMeta } from '@/shared/types/map';

import {
  feetPerSquareFromMeters,
  metersPerSquareValue,
} from './map-calibration';

/**
 * Réglages d'une carte déjà créée : nom, calibrage de la grille et URL d'image
 * partagée (M30 / M34b de l'audit de malléabilité).
 *
 * Avant ce panneau, `gridSize` (70 px) et `feetPerSquare` (5 ft) étaient posés
 * une fois à la création — par un défaut arbitraire côté « nouvelle carte », par
 * le fichier côté import `.dd2vtt` — et plus AUCUN écran ne les rééditait. Une
 * grille décalée d'un pixel ou une table qui joue en cases de 3 m condamnait la
 * carte : distances, portées de vision, gabarits d'AoE et rayons de lumière
 * dérivent tous de ce couple (`ruler-state.ts`), donc tout héritait du mauvais
 * calibrage sans recours autre que réimporter.
 *
 * `UpdateMapPatch` acceptait déjà les trois champs et `firestore.rules:349`
 * autorise le MJ à les écrire : il ne manquait que la surface.
 *
 * Le calibrage se saisit en MÈTRES (convention d'affichage FR du projet) et se
 * stocke en pieds — `map-calibration.ts` porte la conversion, testée à part.
 */

const NAME_MAX = 60;
/** Bornes de bon sens sur la taille de case à l'écran (le schéma dit « entier > 0 »). */
const GRID_MIN_PX = 10;
const GRID_MAX_PX = 400;

export interface MapSettingsPatch {
  readonly name: string;
  readonly gridSize: number;
  readonly feetPerSquare: number;
  readonly imageUrl: string | null;
}

interface Props {
  /** Carte en cours de réglage, ou `null` quand le panneau est fermé. */
  readonly map: MapMeta | null;
  readonly onSave: (patch: MapSettingsPatch) => void;
  readonly onClose: () => void;
}

export function MapSettingsModal({ map, onSave, onClose }: Props): JSX.Element {
  return (
    <DetailModal
      open={map !== null}
      onClose={onClose}
      size="sm"
      closeLabel={t('map.settings.closeLabel')}
    >
      {/* Form remonté par `key` → état local frais à chaque ouverture, sans
          `useEffect` de synchronisation (même parti que `TokenEditModal`). */}
      {map && <MapSettingsForm key={map.id} map={map} onSave={onSave} />}
    </DetailModal>
  );
}

function MapSettingsForm({
  map,
  onSave,
}: {
  readonly map: MapMeta;
  readonly onSave: Props['onSave'];
}): JSX.Element {
  const [name, setName] = useState<string>(map.name);
  const [gridSize, setGridSize] = useState<string>(String(map.gridSize));
  const [meters, setMeters] = useState<string>(
    metersPerSquareValue(map.feetPerSquare),
  );
  const [imageUrl, setImageUrl] = useState<string>(map.imageUrl ?? '');
  const titleId = useId();

  const trimmedName = name.trim();
  const gridPx = Number.parseInt(gridSize, 10);
  const gridValid =
    Number.isFinite(gridPx) && gridPx >= GRID_MIN_PX && gridPx <= GRID_MAX_PX;
  // Virgule décimale française acceptée à la saisie — « 1,5 » vaut « 1.5 ».
  const metersNum = Number.parseFloat(meters.replace(',', '.'));
  const feetPerSquare = feetPerSquareFromMeters(metersNum);
  const metersValid = feetPerSquare !== null;
  const canSave = trimmedName.length > 0 && gridValid && metersValid;

  const handleSave = (): void => {
    if (!canSave || feetPerSquare === null) return;
    const url = imageUrl.trim();
    onSave({
      name: trimmedName,
      gridSize: gridPx,
      feetPerSquare,
      imageUrl: url.length > 0 ? url : null,
    });
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-1 pr-10">
        <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {map.id}
        </p>
        <h2
          id={titleId}
          className="font-display text-2xl leading-tight text-gold-bright"
        >
          {t('map.settings.title')}
        </h2>
      </header>

      <label className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('map.common.nameLabel')}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          data-testid="map-settings-name"
          className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-serif text-body text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('map.settings.gridSizeLabel')}
        </span>
        <input
          type="number"
          inputMode="numeric"
          value={gridSize}
          min={GRID_MIN_PX}
          max={GRID_MAX_PX}
          onChange={(e) => setGridSize(e.target.value)}
          data-testid="map-settings-grid-size"
          className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-mono text-body text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
        />
        <span className="font-serif text-meta italic text-text-faint">
          {t('map.settings.gridSizeHelp')}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('map.settings.scaleLabel')}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={meters}
          onChange={(e) => setMeters(e.target.value)}
          data-testid="map-settings-scale"
          className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-mono text-body text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
        />
        <span
          data-testid="map-settings-scale-echo"
          className="font-serif text-meta italic text-text-faint"
        >
          {metersValid
            ? `${t('map.settings.scaleEchoPrefix')}${formatMetersValue(feetPerSquare)} m`
            : t('map.settings.scaleInvalid')}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('map.settings.imageUrlLabel')}
        </span>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder={t('map.settings.imageUrlPlaceholder')}
          data-testid="map-settings-image-url"
          className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-mono text-[12px] text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="font-serif text-meta italic text-text-faint">
          {t('map.settings.imageUrlHelp')}
        </span>
      </label>

      <button
        type="button"
        data-testid="map-settings-save"
        disabled={!canSave}
        onClick={handleSave}
        className="rounded-pill border border-gold-dim/50 bg-gold/10 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/20 disabled:opacity-40"
      >
        {t('map.settings.save')}
      </button>
    </div>
  );
}
