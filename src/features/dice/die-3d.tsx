import { useMemo, type CSSProperties, type JSX } from 'react';

import { polyhedronFor } from '@/shared/lib/dice3d/polyhedra';
import {
  landingRotation,
  placeFace,
  restLighting,
  rotate3dCss,
  tumbleFor,
  type FacePlacement,
} from '@/shared/lib/dice3d/transforms';
import { cn } from '@/shared/lib/cn';

/**
 * Un dé, en vraie 3D CSS.
 *
 * **Pourquoi pas une bibliothèque.** Un moteur physique 3D (Babylon + ammo)
 * pèse plusieurs mégaoctets pour une app qui doit démarrer dans une cave sans
 * réseau, et serait une dépendance externe — décision qui ne m'appartient pas.
 * Les faces sont donc de vrais polygones posés dans l'espace par `matrix3d` :
 * pas de simulation de rebond, mais un solide authentique qui culbute et se
 * pose sur la face tirée.
 *
 * **Comment la culbute finit juste.** Trois couches emboîtées :
 *   1. l'enveloppe fait la CHUTE (translation + échelle, avec un léger rebond) ;
 *   2. la couche du milieu fait la CULBUTE, une rotation multi-tours qui
 *      s'achève sur l'identité ;
 *   3. la couche interne porte la POSE, rotation statique amenant la face
 *      tirée vers la caméra.
 *
 * Comme la culbute finit sur l'identité, la composition au repos vaut
 * exactement la pose : le dé s'arrête forcément sur le bon chiffre. Une
 * animation qui interpolerait directement vers la rotation finale prendrait le
 * plus court chemin et ne tournerait pas du tout — CSS n'interpole l'angle que
 * si les deux `rotate3d` partagent le même axe.
 */

interface Die3DProps {
  sides: number;
  /** Face tirée par le moteur — c'est elle qui sera face à la caméra. */
  face: number;
  /** `false` pour un dé écarté par l'avantage : présent, mais en retrait. */
  kept?: boolean;
  /** Rayon circonscrit en pixels. */
  radius?: number;
  /** Rang du dé dans le jet — sème une culbute différente pour chacun. */
  index?: number;
  /** Graine du jet — deux jets successifs ne culbutent pas pareil. */
  seed?: number;
  className?: string;
}

const DEFAULT_RADIUS = 40;

/**
 * Taille d'un dé selon le nombre de dés du jet.
 *
 * Un d20 solitaire est LE geste de la table : il mérite d'occuper l'écran. Huit
 * dés de boule de feu, eux, doivent tenir ensemble sans se chevaucher sur un
 * téléphone de 412 px. Une taille fixe ne peut pas servir les deux.
 */
export function radiusForCount(count: number): number {
  if (count <= 1) return 52;
  if (count <= 4) return 40;
  return 30;
}

export function Die3D({
  sides,
  face,
  kept = true,
  radius = DEFAULT_RADIUS,
  index = 0,
  seed = 0,
  className,
}: Die3DProps): JSX.Element | null {
  const solid = polyhedronFor(sides);

  const model = useMemo(() => {
    if (!solid) return null;
    // Le moteur peut rendre une face hors bornes si une formule exotique passe :
    // on retombe sur la première face plutôt que de ne rien afficher.
    const target =
      solid.faces.find((f) => f.value === face) ?? solid.faces[0]!;
    const landing = landingRotation(target);
    return {
      faces: solid.faces.map((f) => ({
        placed: placeFace(f, radius),
        lighting: restLighting(f.normal, landing),
      })),
      landing: rotate3dCss(landing.axis, landing.angleDeg),
      tumble: tumbleFor(seed * 31 + index),
    };
  }, [solid, face, radius, seed, index]);

  if (!solid || !model) return null;

  const { tumble } = model;
  const dropStyle: CSSProperties = {
    animationDelay: `${tumble.delayMs}ms`,
    animationDuration: `${tumble.durationMs}ms`,
  };
  const tumbleStyle: CSSProperties = {
    ...dropStyle,
    // Départ de la culbute : N tours autour d'un axe tiré de la graine. La fin
    // (0deg) est posée dans la keyframe — même axe, donc CSS interpole l'angle.
    ['--die-spin-from' as string]: rotate3dCss(
      tumble.axis,
      tumble.turns * 360,
    ),
    ['--die-spin-axis' as string]: `${tumble.axis[0]},${tumble.axis[1]},${tumble.axis[2]}`,
  };

  return (
    <div
      className={cn('die3d-drop', !kept && 'opacity-40 saturate-50', className)}
      style={dropStyle}
      // Le chiffre est déjà annoncé par le toast du jet ; le dé n'est qu'une
      // mise en scène. L'annoncer deux fois ferait bafouiller le lecteur d'écran.
      aria-hidden="true"
      data-testid="die-3d"
      data-sides={sides}
      data-face={face}
      data-kept={kept ? 'true' : 'false'}
    >
      <div className="die3d-tumble" style={tumbleStyle}>
        <div
          className="die3d-solid"
          style={{
            width: radius * 2,
            height: radius * 2,
            transform: model.landing,
          }}
        >
          {model.faces.map(({ placed, lighting }) => (
            <DieFace
              key={placed.value}
              placed={placed}
              radius={radius}
              lighting={lighting}
              highlighted={placed.value === face}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DieFaceProps {
  placed: FacePlacement;
  radius: number;
  /** Éclairement de la face au repos, 0 (tranche) à 1 (de face). */
  lighting: number;
  highlighted: boolean;
}

/**
 * Une face : le polygone exact déduit de la géométrie, plus son chiffre.
 *
 * **Des `<div>` découpés, et surtout PAS des `<svg>`.** La première version
 * dessinait chaque face en SVG, ce qui est plus direct à écrire — un
 * `<polygon points>` et c'est fini. Le résultat était un solide troué : les
 * facettes apparaissaient éparpillées, avec un vide là où la face tournée vers
 * la caméra aurait dû être. La géométrie n'y était pour rien, une sonde l'a
 * établi en recomposant les matrices appliquées par le navigateur : douze
 * sommets distincts, chacun partagé par cinq faces, tous à la bonne distance.
 * C'est la RASTÉRISATION qui lâche — Chromium traite mal un `<svg>` placé dans
 * un contexte `transform-style: preserve-3d`. Un `<div>` découpé au
 * `clip-path` est le chemin balisé de la 3D CSS, et il rend juste.
 *
 * L'arête dorée est obtenue en superposant deux découpes : la face pleine en or
 * dessous, la face légèrement rétrécie en couleur de facette dessus. Une
 * bordure classique ne suivrait pas le `clip-path`.
 */
function DieFace({
  placed,
  radius,
  lighting,
  highlighted,
}: DieFaceProps): JSX.Element {
  const { box } = placed;
  // Rétrécissement homothétique : le polygone est centré sur l'origine, une
  // simple mise à l'échelle en tient donc lieu d'inset.
  const circumradius = Math.max(
    ...placed.polygon.map(([x, y]) => Math.hypot(x, y)),
  );
  const innerScale = Math.max(0.5, 1 - 1.4 / circumradius);

  return (
    <div
      className="die3d-face"
      // L'ombrage passe par une variable CSS plutôt que par une couleur en dur :
      // la teinte reste décidée par la feuille de style (donc par le thème),
      // seule l'INTENSITÉ vient de la géométrie. Portée par l'enveloppe pour que
      // le chiffre en hérite — sinon une facette de tranche afficherait un
      // chiffre en pleine lumière.
      style={{
        width: box.width,
        height: box.height,
        // La boîte est serrée sur le polygone : son coin haut-gauche se cale par
        // marge, et l'origine de transformation revient au centre de la face.
        marginLeft: box.offsetX,
        marginTop: box.offsetY,
        transformOrigin: `${-box.offsetX}px ${-box.offsetY}px 0`,
        transform: placed.transform,
        clipPath: clipPathFor(placed, 1),
        ['--facet-light' as string]: lighting.toFixed(3),
      }}
    >
      <div
        className={cn('die3d-facet', highlighted && 'die3d-facet--lit')}
        style={{ clipPath: clipPathFor(placed, innerScale) }}
      />
      <span
        className={cn('die3d-pip', highlighted && 'die3d-pip--lit')}
        // Le chiffre se centre sur le CENTRE DE LA FACE, pas sur le centre de la
        // boîte : pour un triangle les deux diffèrent nettement, et un chiffre
        // calé sur la boîte flotterait vers une pointe.
        style={{
          left: -box.offsetX,
          top: -box.offsetY,
          fontSize: faceFontSize(placed.polygon, radius),
        }}
      >
        {placed.value}
      </span>
    </div>
  );
}

/** `clip-path: polygon(...)` d'une face, en coordonnées de sa boîte serrée. */
function clipPathFor(placed: FacePlacement, scale: number): string {
  const { offsetX, offsetY } = placed.box;
  const points = placed.polygon
    .map(
      ([x, y]) =>
        `${(x * scale - offsetX).toFixed(2)}px ${(y * scale - offsetY).toFixed(2)}px`,
    )
    .join(',');
  return `polygon(${points})`;
}

/** Rayon inscrit approché du polygone → taille de chiffre qui tient dedans. */
function faceFontSize(
  polygon: readonly (readonly [number, number])[],
  radius: number,
): number {
  const inradius = Math.min(
    ...polygon.map(([x, y], i) => {
      const [nx, ny] = polygon[(i + 1) % polygon.length]!;
      // Distance du centre au segment [p_i, p_i+1].
      const ex = nx - x;
      const ey = ny - y;
      const len = Math.hypot(ex, ey) || 1;
      return Math.abs((ex * -y - ey * -x) / len);
    }),
  );
  return Math.max(9, Math.min(radius * 0.9, inradius * 1.15));
}
