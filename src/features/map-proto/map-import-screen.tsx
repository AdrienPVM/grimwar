import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type JSX,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import {
  ImageOptimizeError,
  MAP_BACKGROUND_PRESET,
  optimizeDataUrl,
  optimizeImageFile,
  type OptimizedImage,
} from '@/shared/lib/image-optimize';
import { formatMetersValue } from '@/shared/lib/rules/distance';
import { ensureCampaignExists } from '@/shared/lib/services/campaigns';
import { createMap, type CreateMapInput } from '@/shared/lib/services/maps';

import { Dd2vttParseError, parseDd2vtt, type ParsedDd2vtt } from './dd2vtt';
import { pointsToSvgString } from './fog-state';
import { saveMapImage } from './map-image-store';
import { MAP_VIEWBOX_H, MAP_VIEWBOX_W } from './map-viewport';

/**
 * Écran d'import d'une carte Dungeon Alchemist `.dd2vtt` (capacité titre du
 * plan 29). Route `/map-proto/cloud/:cid/import`.
 *
 * Parcours :
 *   1. Choisir un fichier `.dd2vtt` (JSON) → lecture texte → `parseDd2vtt`.
 *   2. Aperçu : image de fond + murs (or) + lumières (points) superposés dans
 *      le viewBox, + résumé (dimensions, nb de murs/sommets, nb de lumières).
 *   3. Saisir un slug + nom → « Importer » crée la carte Firestore (murs +
 *      lumières + grille, `losEnabled:true`) et stocke l'image en LOCAL
 *      (IndexedDB) — Firebase Storage étant parqué, l'image ne se synchronise
 *      pas cross-device mais survit au reload sur l'appareil.
 *
 * SECOND ONGLET — « Image de battlemap » (M30/M31 de l'audit de malléabilité).
 * Le `.dd2vtt` était le SEUL chemin qui posait une image de fond : la création
 * normale force `imageUrl: null`, donc un JPG de battlemap trouvé en ligne ne
 * pouvait pas devenir une carte (fond noir définitif). Cet onglet réutilise la
 * plomberie déjà écrite — `optimizeImageFile(MAP_BACKGROUND_PRESET)` puis
 * `saveMapImage` — sans rien déduire : ni murs, ni lumières, ni échelle. La
 * grille part au défaut et se recale ensuite dans les réglages de la carte.
 *
 * Chaînes UI passées par `t()` (namespaces `map.common.*` / `map.import.*`).
 */

const SLUG_REGEX = /^[a-z0-9-]+$/;
const DEFAULT_FEET_PER_SQUARE = 5;
/** Défaut d'une carte non calibrée — recalable dans « Réglages de la carte ». */
const DEFAULT_GRID_SIZE_PX = 70;
/**
 * Plafond d'entreposage IndexedDB d'un fond de carte. Le preset vise ~1,4 Mo ;
 * ce garde-fou n'attrape que le repli « canvas indisponible → image brute »,
 * où une photo de 30 Mo passerait telle quelle.
 */
const MAX_MAP_IMAGE_BYTES = 6 * 1024 * 1024;

type ImportTab = 'dd2vtt' | 'image';

/** Slug depuis un nom de fichier image (extensions courantes retirées). */
function slugFromImageFilename(filename: string): string {
  return filename
    .replace(/\.(png|jpe?g|webp|gif|avif|bmp)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Poids lisible d'une chaîne base64 (1 caractère = 1 octet). Passe en Mo au-delà
 * du millier de Ko — un « 21 340 Ko » ne se lit pas.
 */
function formatBytes(bytes: number): string {
  const ko = bytes / 1024;
  return ko >= 1000
    ? `${(ko / 1024).toFixed(1).replace('.', ',')} Mo`
    : `${Math.round(ko)} Ko`;
}

/** Dérive un slug raisonnable depuis un nom de fichier. */
function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.dd2vtt$/i, '')
    .replace(/\.json$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function MapImportScreen(): JSX.Element {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const { user, isReady } = useAuth();

  const [tab, setTab] = useState<ImportTab>('dd2vtt');
  const [parsed, setParsed] = useState<ParsedDd2vtt | null>(null);
  const [image, setImage] = useState<OptimizedImage | null>(null);
  const [imageBusy, setImageBusy] = useState<boolean>(false);
  /** Poids de l'image AVANT réduction — sert à montrer ce qu'on a économisé. */
  const [sourceImageBytes, setSourceImageBytes] = useState<number>(0);
  const [fileName, setFileName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ensureDone, setEnsureDone] = useState<boolean>(false);

  // Idempotent : crée la campagne stub si on arrive en deeplink direct (sinon
  // les rules `maps` refusent le create, le parent n'existant pas).
  useEffect(() => {
    if (!user || !cid) {
      setEnsureDone(false);
      return;
    }
    let cancelled = false;
    ensureCampaignExists(cid, user.uid)
      .then(() => {
        if (!cancelled) setEnsureDone(true);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setSubmitError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [user, cid]);

  const handleFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseError(null);
      setSubmitError(null);
      setParsed(null);
      setSourceImageBytes(0);
      setImageBusy(true);
      try {
        const text = await file.text();
        const result = parseDd2vtt(text);

        // RÉDUCTION À LA SÉLECTION, pas à l'enregistrement. Un export
        // Dungeondraft réel embarque une image de 8320 × 5760 px (~20 Mo de
        // base64, ~190 Mo une fois décodée en RVBA). L'ancien chemin la gardait
        // BRUTE dans l'état React, la donnait telle quelle à l'aperçu — donc un
        // second décodage plein format — et ne la réduisait qu'au clic sur
        // « Importer ». Sur un téléphone, la page mourait avant le clic.
        // On réduit donc une seule fois, tout de suite : l'état ne retient plus
        // qu'un webp d'environ 1,4 Mo, l'aperçu montre ce qui sera réellement
        // enregistré, et le poids affiché est le vrai.
        if (result.imageDataUrl) {
          setSourceImageBytes(result.imageDataUrl.length);
          const optimized = await optimizeDataUrl(
            result.imageDataUrl,
            MAP_BACKGROUND_PRESET,
          );
          setParsed({ ...result, imageDataUrl: optimized.dataUrl });
        } else {
          setParsed(result);
        }

        setFileName(file.name);
        setSlug(slugFromFilename(file.name));
        setName(slugFromFilename(file.name).replace(/-/g, ' ') || file.name);
      } catch (err) {
        const msg =
          err instanceof Dd2vttParseError
            ? err.message
            : `${t('map.import.parseFailedPrefix')}${err instanceof Error ? err.message : String(err)}`;
        setParseError(msg);
      } finally {
        setImageBusy(false);
      }
    },
    [],
  );

  const handleImageFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseError(null);
      setSubmitError(null);
      setImage(null);
      setImageBusy(true);
      try {
        const optimized = await optimizeImageFile(file, MAP_BACKGROUND_PRESET);
        if (optimized.bytes > MAX_MAP_IMAGE_BYTES) {
          setParseError(t('map.import.imageTooLarge'));
          return;
        }
        setImage(optimized);
        setFileName(file.name);
        const derived = slugFromImageFilename(file.name);
        setSlug(derived);
        setName(derived.replace(/-/g, ' ') || file.name);
      } catch (err) {
        setParseError(
          err instanceof ImageOptimizeError
            ? err.message
            : t('map.import.imageFailed'),
        );
      } finally {
        setImageBusy(false);
      }
    },
    [],
  );

  /**
   * Crée une carte depuis une image nue : aucune donnée n'est DÉDUITE de
   * l'image (ni murs, ni lumières, ni échelle). La grille part au défaut et se
   * recale dans « Réglages de la carte » — mieux vaut un calibrage assumé
   * qu'une devinette sur les pixels.
   */
  const handleImportImage = useCallback(async (): Promise<void> => {
    if (!user || !cid || !image) return;
    const id = slug.trim();
    const mapName = name.trim();
    if (!id || !SLUG_REGEX.test(id)) {
      setSubmitError(t('map.common.invalidSlug'));
      return;
    }
    if (!mapName) {
      setSubmitError(t('map.common.nameRequired'));
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const input: CreateMapInput = {
        name: mapName,
        imageUrl: null, // image locale (IndexedDB), comme le chemin .dd2vtt
        gridSize: DEFAULT_GRID_SIZE_PX,
        feetPerSquare: DEFAULT_FEET_PER_SQUARE,
        // Grille ON : c'est la référence visuelle qui sert à recaler l'échelle
        // sur celle de l'image. Un clic la retire si l'image porte la sienne.
        showGrid: true,
        // Voile OFF à la création, comme l'import .dd2vtt : le MJ voit sa carte
        // entière d'emblée et pose le brouillard quand il en a besoin.
        fogEnabled: false,
        lightingEnabled: false,
        fogPolygons: [],
        lightSources: [],
        aoeTemplates: [],
        // Pas de murs → la ligne de vue serait un bouton mort ; on la laisse OFF.
        losEnabled: false,
      };
      await createMap(cid, id, input, user.uid);
      await saveMapImage(cid, id, image.dataUrl);
      navigate(`/map-proto/cloud/${cid}/maps/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }, [user, cid, image, slug, name, navigate]);

  const handleImport = useCallback(async (): Promise<void> => {
    if (!user || !cid || !parsed) return;
    const id = slug.trim();
    const mapName = name.trim();
    if (!id || !SLUG_REGEX.test(id)) {
      setSubmitError(t('map.common.invalidSlug'));
      return;
    }
    if (!mapName) {
      setSubmitError(t('map.common.nameRequired'));
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const input: CreateMapInput = {
        name: mapName,
        imageUrl: null, // image stockée en local (Dexie), pas en Firestore/Storage
        gridSize: parsed.gridSizePx,
        feetPerSquare: DEFAULT_FEET_PER_SQUARE,
        showGrid: false, // l'image .dd2vtt embarque déjà sa grille
        // Voile OFF à l'import : le MJ voit le donjon entier d'emblée (meilleure
        // première impression). Il l'active en jeu — la LOS est déjà prête.
        fogEnabled: false,
        // Éclairage allumé SEULEMENT si la carte y gagne. Trois des cinq exports
        // réels testés ne portent aucune lumière ; et tous déclarent
        // `baked_lighting`, l'image étant déjà éclairée à l'export. Poser notre
        // couche par-dessus assombrit une carte qui n'en a pas besoin. Les
        // sources sont importées quand même — le MJ allume s'il le veut.
        lightingEnabled: parsed.lights.length > 0 && !parsed.bakedLighting,
        fogPolygons: [],
        lightSources: [...parsed.lights],
        aoeTemplates: [],
        walls: [...parsed.walls],
        // Sans mur, la ligne de vue ne bloque rien : l'interrupteur afficherait
        // « ON » en ne commandant rien. Les cartes d'extérieur exportées par
        // Dungeondraft sont dans ce cas.
        losEnabled: parsed.walls.length > 0,
      };
      await createMap(cid, id, input, user.uid);
      if (parsed.imageDataUrl) {
        // Déjà réduite à la sélection (cf. `handleFile`) — on entrepose tel quel.
        await saveMapImage(cid, id, parsed.imageDataUrl);
      }
      navigate(`/map-proto/cloud/${cid}/maps/${id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }, [user, cid, parsed, slug, name, navigate]);

  if (!cid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-import-missing-cid"
          className="font-serif text-sm text-text-secondary"
        >
          {t('map.common.missingCid')}
        </p>
      </main>
    );
  }
  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p className="font-serif text-sm text-text-secondary">
          {t('map.common.loading')}
        </p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-import-signed-out"
          className="font-serif text-sm text-text-secondary"
        >
          {t('map.import.signedOut')}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1100px] p-4 sm:p-6">
      <header className="mb-6 border-b border-gold-dim/30 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/map-proto/cloud/${cid}`)}
            className="rounded-pill border border-gold-dim/30 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary transition-colors duration-200 ease-base hover:border-gold-bright hover:text-gold-bright"
          >
            ← {t('map.import.back')}
          </button>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright">
            {t('map.import.title')}
          </h1>
          <span className="rounded-pill border border-gold-dim/40 bg-gold/10 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
            {t('map.import.badge')}
          </span>
        </div>
        <p className="mt-2 max-w-[70ch] font-serif text-[12px] text-text-tertiary">
          {t('map.import.introBefore')}
          <code className="text-gold-bright">.dd2vtt</code>
          {t('map.import.introAfter')}
        </p>
      </header>

      {/* Deux provenances, deux exigences : le `.dd2vtt` porte murs + lumières
          et se refuse s'il est mal formé ; une image nue n'apporte que le fond
          et ne peut donc jamais échouer à la lecture d'un champ manquant. */}
      <div
        role="tablist"
        aria-label={t('map.import.title')}
        className="mb-4 flex flex-wrap gap-2"
      >
        {(['dd2vtt', 'image'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-testid={`map-import-tab-${key}`}
            onClick={() => {
              setTab(key);
              setParseError(null);
              setSubmitError(null);
            }}
            className={cn(
              'rounded-pill border px-4 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] transition-colors duration-200 ease-base',
              tab === key
                ? 'border-gold-bright bg-gold/10 text-gold-bright'
                : 'border-gold-dim/30 text-text-tertiary hover:border-gold-dim/60 hover:text-gold-bright',
            )}
          >
            {t(key === 'dd2vtt' ? 'map.import.tabDd2vtt' : 'map.import.tabImage')}
          </button>
        ))}
      </div>

      {tab === 'image' && (
        <p className="mb-4 max-w-[70ch] font-serif text-[12px] text-text-tertiary">
          {t('map.import.imageIntro')}
        </p>
      )}

      <section className="mb-6 rounded-lg border border-gold-dim/30 bg-bg-elev/80 p-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-gold-dim/40 px-4 py-2 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10">
          {tab === 'dd2vtt' ? (
            <>
              <input
                type="file"
                accept=".dd2vtt,.json,application/json"
                onChange={(e) => {
                  void handleFile(e);
                }}
                data-testid="map-import-file"
                className="sr-only"
              />
              {/* La réduction d'un fond de 20 Mo prend un instant : sans ce
                  libellé, l'écran paraît figé entre le choix et l'aperçu. */}
              {imageBusy
                ? t('map.import.imageProcessing')
                : t('map.import.chooseFile')}
            </>
          ) : (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  void handleImageFile(e);
                }}
                data-testid="map-import-image-file"
                className="sr-only"
              />
              {imageBusy
                ? t('map.import.imageProcessing')
                : t('map.import.chooseImage')}
            </>
          )}
        </label>
        {fileName && (
          <span
            data-testid="map-import-filename"
            className="ml-3 font-mono text-[11px] text-text-tertiary"
          >
            {fileName}
          </span>
        )}
        {parseError && (
          <p
            data-testid="map-import-parse-error"
            className="mt-3 rounded-md border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-mono text-[11px] text-crimson"
          >
            {parseError}
          </p>
        )}
      </section>

      {tab === 'image' && image && (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              testid="map-import-image-stat-size"
              label={t('map.import.statDimensions')}
              value={`${image.width} × ${image.height} px`}
            />
            <Stat
              testid="map-import-image-stat-weight"
              label={t('map.import.statWeight')}
              value={`${Math.round(image.bytes / 1024)} Ko`}
            />
            <Stat
              testid="map-import-image-stat-scale"
              label={t('map.import.statScale')}
              value={`${DEFAULT_GRID_SIZE_PX} px · ${formatMetersValue(DEFAULT_FEET_PER_SQUARE)} m`}
            />
            <Stat
              testid="map-import-image-stat-walls"
              label={t('map.import.statWalls')}
              value="0"
            />
          </section>

          <section className="mb-6">
            <h2 className="mb-2 font-title text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
              {t('map.import.preview')}
            </h2>
            <div
              className="overflow-hidden rounded-lg border border-gold-dim/30 bg-black/40"
              style={{ aspectRatio: `${MAP_VIEWBOX_W} / ${MAP_VIEWBOX_H}` }}
            >
              <svg
                viewBox={`0 0 ${MAP_VIEWBOX_W} ${MAP_VIEWBOX_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full"
                data-testid="map-import-image-preview"
              >
                <image
                  href={image.dataUrl}
                  x={0}
                  y={0}
                  width={MAP_VIEWBOX_W}
                  height={MAP_VIEWBOX_H}
                  preserveAspectRatio="none"
                />
              </svg>
            </div>
            <p className="mt-2 max-w-[70ch] font-serif text-[11px] italic text-text-faint">
              {t('map.import.imageHint')}
            </p>
          </section>

          <SaveSection
            slug={slug}
            name={name}
            onSlugChange={setSlug}
            onNameChange={setName}
            onSubmit={() => {
              void handleImportImage();
            }}
            submitting={submitting}
            disabled={submitting || !ensureDone}
            error={submitError}
            testidPrefix="map-import-image"
          />
        </>
      )}

      {tab === 'dd2vtt' && parsed && (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              testid="map-import-stat-size"
              label={t('map.import.statDimensions')}
              value={`${parsed.mapSizeSquares.x} × ${parsed.mapSizeSquares.y} ${t('map.import.squaresSuffix')}`}
            />
            <Stat
              testid="map-import-stat-walls"
              label={t('map.import.statWalls')}
              value={`${parsed.walls.length} (${parsed.wallVertexCount} ${t('map.import.verticesSuffix')})`}
            />
            <Stat
              testid="map-import-stat-lights"
              label={t('map.import.statLights')}
              value={`${parsed.lights.length}`}
            />
            {/* Le poids AVANT → APRÈS, plutôt qu'un « Incluse » qui ne dit rien :
                c'est le chiffre qui explique pourquoi l'import prend un instant,
                et il rend visible ce que la réduction a évité d'entreposer. */}
            <Stat
              testid="map-import-stat-image"
              label={t('map.import.statImage')}
              value={
                parsed.imageDataUrl
                  ? sourceImageBytes > 0
                    ? `${formatBytes(sourceImageBytes)} → ${formatBytes(parsed.imageDataUrl.length)}`
                    : t('map.import.imageIncluded')
                  : t('map.import.imageAbsent')
              }
            />
          </section>

          <section className="mb-6">
            <h2 className="mb-2 font-title text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
              {t('map.import.preview')}
            </h2>
            <div
              className="overflow-hidden rounded-lg border border-gold-dim/30 bg-black/40"
              style={{ aspectRatio: `${MAP_VIEWBOX_W} / ${MAP_VIEWBOX_H}` }}
            >
              <svg
                viewBox={`0 0 ${MAP_VIEWBOX_W} ${MAP_VIEWBOX_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full"
                data-testid="map-import-preview"
              >
                {parsed.imageDataUrl && (
                  <image
                    href={parsed.imageDataUrl}
                    x={0}
                    y={0}
                    width={MAP_VIEWBOX_W}
                    height={MAP_VIEWBOX_H}
                    preserveAspectRatio="none"
                  />
                )}
                {/* Murs : tracé or fin, semi-opaque. */}
                <g
                  fill="none"
                  stroke="rgba(220,184,108,0.9)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  data-testid="map-import-walls"
                >
                  {parsed.walls.map((w) => (
                    <polyline key={w.id} points={pointsToSvgString(w.points)} />
                  ))}
                </g>
                {/* Lumières : disques ambrés translucides. */}
                <g data-testid="map-import-lights">
                  {parsed.lights.map((l) =>
                    l.position ? (
                      <circle
                        key={l.id}
                        cx={l.position.x}
                        cy={l.position.y}
                        r={6}
                        fill={l.color ?? '#fbbf24'}
                        opacity={0.85}
                      />
                    ) : null,
                  )}
                </g>
              </svg>
            </div>
          </section>

          <SaveSection
            slug={slug}
            name={name}
            onSlugChange={setSlug}
            onNameChange={setName}
            onSubmit={() => {
              void handleImport();
            }}
            submitting={submitting}
            disabled={submitting || !ensureDone}
            error={submitError}
            testidPrefix="map-import"
          />
        </>
      )}
    </main>
  );
}

/**
 * Bloc « slug + nom + Importer », partagé par les deux onglets : la carte se
 * nomme de la même façon qu'elle vienne d'un `.dd2vtt` ou d'un JPG. Le préfixe
 * de `data-testid` distingue les deux instances — une seule est montée à la
 * fois, mais les specs ciblent explicitement l'onglet qu'elles jouent.
 */
function SaveSection({
  slug,
  name,
  onSlugChange,
  onNameChange,
  onSubmit,
  submitting,
  disabled,
  error,
  testidPrefix,
}: {
  readonly slug: string;
  readonly name: string;
  readonly onSlugChange: (v: string) => void;
  readonly onNameChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly submitting: boolean;
  readonly disabled: boolean;
  readonly error: string | null;
  readonly testidPrefix: string;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-gold-dim/30 bg-bg-elev/80 p-4">
      <h2 className="mb-3 font-title text-[12px] uppercase tracking-[0.16em] text-gold-bright">
        {t('map.import.saveSection')}
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('map.common.slugLabel')}
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            data-testid={`${testidPrefix}-slug`}
            className="w-56 rounded border border-gold-dim/30 bg-bg px-2 py-1 font-mono text-[12px] text-text focus:border-gold-bright focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('map.common.nameLabel')}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            data-testid={`${testidPrefix}-name`}
            className="w-72 rounded border border-gold-dim/30 bg-bg px-2 py-1 text-[12px] text-text focus:border-gold-bright focus:outline-none"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          data-testid={`${testidPrefix}-submit`}
          className="rounded-pill border border-gold-dim/40 px-4 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
        >
          {submitting ? t('map.import.submitting') : t('map.import.submit')}
        </button>
      </div>
      {error && (
        <p
          data-testid={`${testidPrefix}-submit-error`}
          className="mt-3 rounded-md border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-mono text-[11px] text-crimson"
        >
          {error}
        </p>
      )}
    </section>
  );
}

function Stat({
  testid,
  label,
  value,
}: {
  readonly testid: string;
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div className="rounded-md border border-gold-dim/20 bg-bg-elev/60 p-3">
      <p className="font-title text-[9px] uppercase tracking-[0.16em] text-text-tertiary">
        {label}
      </p>
      <p
        data-testid={testid}
        className="mt-1 font-mono text-[12px] text-gold-bright"
      >
        {value}
      </p>
    </div>
  );
}
