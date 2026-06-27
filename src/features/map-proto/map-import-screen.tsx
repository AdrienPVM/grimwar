import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type JSX,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import {
  MAP_BACKGROUND_PRESET,
  optimizeDataUrl,
} from '@/shared/lib/image-optimize';
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
 * Convention prototype : chaînes FR inline (comme `maps-cloud-screen`).
 */

const SLUG_REGEX = /^[a-z0-9-]+$/;
const DEFAULT_FEET_PER_SQUARE = 5;

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

  const [parsed, setParsed] = useState<ParsedDd2vtt | null>(null);
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
      try {
        const text = await file.text();
        const result = parseDd2vtt(text);
        setParsed(result);
        setFileName(file.name);
        setSlug(slugFromFilename(file.name));
        setName(slugFromFilename(file.name).replace(/-/g, ' ') || file.name);
      } catch (err) {
        const msg =
          err instanceof Dd2vttParseError
            ? err.message
            : `Lecture impossible : ${err instanceof Error ? err.message : String(err)}`;
        setParseError(msg);
      }
    },
    [],
  );

  const handleImport = useCallback(async (): Promise<void> => {
    if (!user || !cid || !parsed) return;
    const id = slug.trim();
    const mapName = name.trim();
    if (!id || !SLUG_REGEX.test(id)) {
      setSubmitError(
        'Identifiant invalide (slug kebab-case : minuscules, chiffres, tirets).',
      );
      return;
    }
    if (!mapName) {
      setSubmitError('Le nom est requis.');
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
        lightingEnabled: parsed.lights.length > 0,
        fogPolygons: [],
        lightSources: [...parsed.lights],
        aoeTemplates: [],
        walls: [...parsed.walls],
        losEnabled: true,
      };
      await createMap(cid, id, input, user.uid);
      if (parsed.imageDataUrl) {
        // Le `.dd2vtt` embarque l'image de fond en PNG base64 BRUT (souvent
        // plusieurs Mo). On la ré-encode/réduit avant de l'entreposer en
        // IndexedDB (preset « fond de carte » : aspect préservé, webp, dimension
        // plafonnée) — même exigence d'empreinte minimale que les portraits.
        const optimized = await optimizeDataUrl(
          parsed.imageDataUrl,
          MAP_BACKGROUND_PRESET,
        );
        await saveMapImage(cid, id, optimized.dataUrl);
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
          URL invalide : il manque l&apos;identifiant de campagne (`cid`).
        </p>
      </main>
    );
  }
  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p className="font-serif text-sm text-text-secondary">Chargement…</p>
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
          Connexion requise pour importer une carte.
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
            ← Cartes
          </button>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright">
            Importer une carte
          </h1>
          <span className="rounded-pill border border-gold-dim/40 bg-gold/10 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
            .dd2vtt — Dungeon Alchemist
          </span>
        </div>
        <p className="mt-2 max-w-[70ch] font-serif text-[12px] text-text-tertiary">
          Sélectionnez un fichier <code className="text-gold-bright">.dd2vtt</code>{' '}
          exporté par Dungeon Alchemist. Les murs, lumières et la grille sont
          importés et synchronisés ; l&apos;image de fond reste stockée localement
          sur cet appareil (la synchro cross-device arrivera avec Firebase
          Storage).
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-gold-dim/30 bg-bg-elev/80 p-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-gold-dim/40 px-4 py-2 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10">
          <input
            type="file"
            accept=".dd2vtt,.json,application/json"
            onChange={(e) => {
              void handleFile(e);
            }}
            data-testid="map-import-file"
            className="sr-only"
          />
          Choisir un fichier .dd2vtt
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

      {parsed && (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              testid="map-import-stat-size"
              label="Dimensions"
              value={`${parsed.mapSizeSquares.x} × ${parsed.mapSizeSquares.y} cases`}
            />
            <Stat
              testid="map-import-stat-walls"
              label="Murs"
              value={`${parsed.walls.length} (${parsed.wallVertexCount} sommets)`}
            />
            <Stat
              testid="map-import-stat-lights"
              label="Lumières"
              value={`${parsed.lights.length}`}
            />
            <Stat
              testid="map-import-stat-image"
              label="Image"
              value={parsed.imageDataUrl ? 'Incluse' : 'Absente'}
            />
          </section>

          <section className="mb-6">
            <h2 className="mb-2 font-title text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
              Aperçu
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

          <section className="rounded-lg border border-gold-dim/30 bg-bg-elev/80 p-4">
            <h2 className="mb-3 font-title text-[12px] uppercase tracking-[0.16em] text-gold-bright">
              Enregistrer la carte
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                  Identifiant (slug)
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  data-testid="map-import-slug"
                  className="w-56 rounded border border-gold-dim/30 bg-bg px-2 py-1 font-mono text-[12px] text-text focus:border-gold-bright focus:outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                  Nom
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="map-import-name"
                  className="w-72 rounded border border-gold-dim/30 bg-bg px-2 py-1 text-[12px] text-text focus:border-gold-bright focus:outline-none"
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  void handleImport();
                }}
                disabled={submitting || !ensureDone}
                data-testid="map-import-submit"
                className="rounded-pill border border-gold-dim/40 px-4 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
              >
                {submitting ? 'Import…' : 'Importer'}
              </button>
            </div>
            {submitError && (
              <p
                data-testid="map-import-submit-error"
                className="mt-3 rounded-md border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-mono text-[11px] text-crimson"
              >
                {submitError}
              </p>
            )}
          </section>
        </>
      )}
    </main>
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
