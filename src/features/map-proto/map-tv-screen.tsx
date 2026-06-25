import { type JSX, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import type { MapToken } from '@/shared/types/map';

import { MapScene } from './map-scene';
import { MAP_VIEWBOX_H, MAP_VIEWBOX_W } from './map-viewport';
import { useMap } from './use-map';
import { useMapImage } from './use-map-image';

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

  if (!cid || !mid) {
    return (
      <Centered testid="map-tv-missing-params">
        URL invalide : il manque `cid` ou `mid`.
      </Centered>
    );
  }
  if (!isReady || isLoading) {
    return <Centered testid="map-tv-loading">Chargement de la carte…</Centered>;
  }
  if (error) {
    return (
      <Centered testid="map-tv-error">Erreur : {error.message}</Centered>
    );
  }
  if (!map) {
    return <Centered testid="map-tv-not-found">Carte introuvable.</Centered>;
  }

  return (
    <main
      data-testid="map-tv-root"
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
    >
      {/* Bandeau discret : nom + retour. Ne gêne pas la projection. */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-center justify-between p-3">
        <button
          type="button"
          data-testid="map-tv-back"
          onClick={() => navigate(`/map-proto/cloud/${cid}/maps/${mid}`)}
          className="pointer-events-auto rounded-pill border border-gold-dim/30 bg-black/50 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright/80 transition-colors duration-200 ease-base hover:text-gold-bright"
        >
          ◂ Retour
        </button>
        <span
          data-testid="map-tv-name"
          className="rounded-pill bg-black/50 px-3 py-1 font-display text-[13px] uppercase tracking-[0.18em] text-gold-bright/90"
        >
          {map.name}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${MAP_VIEWBOX_W} ${MAP_VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        data-testid="map-tv-svg"
      >
        <MapScene
          map={map}
          localImageUrl={localImageUrl}
          tokens={tokens}
          maskId={`fog-tv-${mid}`}
          fogOpacity={TV_FOG_OPACITY}
        />
        {tokens.map((token: MapToken) => (
          <g key={token.id} data-testid={`map-tv-token-${token.id}`}>
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
          </g>
        ))}
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
