import { useRef, type JSX, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { t } from '@/shared/lib/i18n';
import type { MapToken } from '@/shared/types/map';

import { MapScene } from './map-scene';
import { MapZoomControls } from './map-zoom-controls';
import { useMap } from './use-map';
import { useMapImage } from './use-map-image';
import { useMapTransform } from './use-map-transform';

/**
 * Vue présentation / TV (capacité titre du plan 33). Route
 * `/map-proto/cloud/:cid/maps/:mid/tv`.
 *
 * Plein écran, fond noir, AUCUN outil d'édition : c'est la carte telle qu'on la
 * projette sur un écran de table / une TV. Lecture seule, mêmes données live que
 * la vue MJ (`useMap` temps réel) — quand le MJ déplace un token ou révèle une
 * zone, la TV se met à jour instantanément.
 *
 * Différence clé avec la vue MJ : le voile de brouillard est rendu À PLEINE
 * opacité (les joueurs ne voient PAS au travers), tandis que la vue MJ l'atténue
 * pour que le meneur garde l'œil sur tout.
 */

const TV_TOKEN_RADIUS = 18;
const TV_FOG_OPACITY = 0.92;

export function MapTvScreen(): JSX.Element {
  const { cid, mid } = useParams<{ cid: string; mid: string }>();
  const navigate = useNavigate();
  const { isReady } = useAuth();
  const { map, tokens, isLoading, error } = useMap(cid, mid);
  const { localImageUrl } = useMapImage(cid, mid);
  const svgRef = useRef<SVGSVGElement>(null);
  // Cadrage local — c'est ici qu'il compte le plus : sur un téléphone de joueur,
  // un donjon entier rend les jetons illisibles.
  const view = useMapTransform(svgRef);
  if (!cid || !mid) {
    return (
      <Centered testid="map-tv-missing-params">
        {t('map.tv.missingParams')}
      </Centered>
    );
  }
  if (!isReady || isLoading) {
    return (
      <Centered testid="map-tv-loading">{t('map.common.loadingMap')}</Centered>
    );
  }
  if (error) {
    return (
      <Centered testid="map-tv-error">
        {t('map.common.errorPrefix')}
        {error.message}
      </Centered>
    );
  }
  if (!map) {
    return <Centered testid="map-tv-not-found">{t('map.tv.notFound')}</Centered>;
  }

  return (
    <main
      data-testid="map-tv-root"
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
    >
      {/* Bandeau discret : nom + retour + cadrage. Ne gêne pas la projection.
          Le retour pointe la LISTE des cartes, pas la vue live : cet écran est
          désormais la porte d'entrée des joueurs, qui n'ont pas accès à la vue
          MJ (`firestore.rules:349` réserve l'écriture au meneur). */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 flex w-full flex-wrap items-center justify-between gap-2 p-3">
        <button
          type="button"
          data-testid="map-tv-back"
          onClick={() => navigate(`/map-proto/cloud/${cid}`)}
          className="pointer-events-auto rounded-pill border border-gold-dim/30 bg-black/50 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright/80 transition-colors duration-200 ease-base hover:text-gold-bright"
        >
          ◂ {t('map.tv.back')}
        </button>
        <div className="pointer-events-auto">
          <MapZoomControls view={view} testidPrefix="map-tv" tone="overlay" />
        </div>
        <span
          data-testid="map-tv-name"
          className="rounded-pill bg-black/50 px-3 py-1 font-display text-[13px] uppercase tracking-[0.18em] text-gold-bright/90"
        >
          {map.name}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={view.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        style={view.isPanning ? { cursor: 'grabbing' } : { cursor: 'grab' }}
        data-testid="map-tv-svg"
        onPointerDown={view.beginPan}
        onPointerMove={view.movePan}
        onPointerUp={view.endPan}
        onPointerLeave={view.endPan}
      >
        <MapScene
          map={map}
          localImageUrl={localImageUrl}
          tokens={tokens}
          maskId={`fog-tv-${mid}`}
          fogOpacity={TV_FOG_OPACITY}
        />
        {tokens.map((token: MapToken) => {
          const portrait = token.imageDataUrl ?? undefined;
          const clipId = `tv-tok-clip-${token.id}`;
          return (
            <g key={token.id} data-testid={`map-tv-token-${token.id}`}>
              {portrait ? (
                <>
                  <clipPath id={clipId}>
                    <circle
                      cx={token.position.x}
                      cy={token.position.y}
                      r={TV_TOKEN_RADIUS}
                    />
                  </clipPath>
                  <image
                    data-testid={`map-tv-token-image-${token.id}`}
                    href={portrait}
                    x={token.position.x - TV_TOKEN_RADIUS}
                    y={token.position.y - TV_TOKEN_RADIUS}
                    width={TV_TOKEN_RADIUS * 2}
                    height={TV_TOKEN_RADIUS * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clipId})`}
                  />
                  <circle
                    cx={token.position.x}
                    cy={token.position.y}
                    r={TV_TOKEN_RADIUS}
                    fill="none"
                    stroke={token.color}
                    strokeWidth={3}
                  />
                </>
              ) : (
                <>
                  <circle
                    cx={token.position.x}
                    cy={token.position.y}
                    r={TV_TOKEN_RADIUS}
                    fill={token.color}
                    stroke="white"
                    strokeWidth={2}
                  />
                  <text
                    x={token.position.x}
                    y={token.position.y + 4}
                    textAnchor="middle"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fontSize="11"
                    fill="white"
                    pointerEvents="none"
                  >
                    {token.label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </main>
  );
}

function Centered({
  testid,
  children,
}: {
  readonly testid: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-black p-6">
      <p
        data-testid={testid}
        className="font-serif text-sm text-text-secondary"
      >
        {children}
      </p>
    </main>
  );
}
