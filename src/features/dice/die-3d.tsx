import { useEffect, useRef, useState, type JSX } from 'react';

import { polyhedronFor, type Polyhedron } from '@/shared/lib/dice3d/polyhedra';
import {
  LIGHT_SCREEN,
  multiply,
  projectDie,
  restRotation,
  rotationAxisAngle,
  visualScaleFor,
  type Mat3,
  type ProjectedFace,
} from '@/shared/lib/dice3d/projection';
import { easeOutTumble, tumbleFor } from '@/shared/lib/dice3d/tumble';
import { cn } from '@/shared/lib/cn';

/**
 * Un dé, en volume, tracé sur un canevas.
 *
 * **Pourquoi pas une bibliothèque 3D.** Un moteur physique (Babylon + ammo) pèse
 * plusieurs mégaoctets pour une app qui doit démarrer dans une cave sans réseau,
 * et serait une dépendance externe — décision qui ne m'appartient pas.
 *
 * **Pourquoi pas la 3D CSS non plus.** C'était la version précédente : chaque
 * face posée dans l'espace par `matrix3d`, le navigateur composant le tout.
 * Chromium trie des couches, pas des fragments ; vingt faces qui se croisent
 * n'ont pas d'ordre de tri valide, et le même d20 sortait correct sur une face
 * tirée, éclaté en moulin à vent sur une autre. On projette donc nous-mêmes
 * (cf. `projection.ts`) et on remplit des polygones : sur un solide convexe
 * amputé de ses faces arrière, plus rien ne se recouvre.
 *
 * **Comment la culbute finit juste.** La rotation dessinée vaut
 * `culbute(t) · pose`, où la culbute s'annule exactement en fin de course
 * (cf. `easeOutTumble`). La dernière image vaut donc la pose : le dé s'arrête
 * forcément sur le chiffre tiré, sans qu'aucun réglage d'animation puisse le
 * décaler.
 */

interface Die3DProps {
  sides: number;
  /** Face tirée par le moteur — c'est elle qui sera face à la caméra. */
  face: number;
  /** `false` pour un dé écarté par l'avantage : présent, mais en retrait. */
  kept?: boolean;
  /** Rayon de référence en pixels. */
  radius?: number;
  /** Rang du dé dans le jet — sème une culbute différente pour chacun. */
  index?: number;
  /** Graine du jet — deux jets successifs ne culbutent pas pareil. */
  seed?: number;
  className?: string;
}

const DEFAULT_RADIUS = 40;

/** Marge autour du solide : le trait doré et l'ombre portée débordent un peu. */
const PADDING_PX = 6;

/**
 * Distance de la caméra, en multiples du rayon.
 *
 * Assez proche pour que la fuite se voie (une valeur élevée revient à une
 * projection orthographique, qui écrase le relief), assez loin pour que les
 * arêtes ne partent pas en éventail.
 */
const PERSPECTIVE_RATIO = 5.5;

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Le dé annonce lui-même qu'il s'est posé. Sans ce signal, un observateur
  // extérieur — une capture d'UAT, par exemple — ne peut qu'attendre à
  // l'estime ; et une attente à l'estime devient fausse dès que la machine
  // rame, alors que le plateau, lui, se retire au bout de 2,2 s.
  const [settled, setSettled] = useState(false);
  const solid = polyhedronFor(sides);

  // Le rayon circonscrit est corrigé pour que tous les solides d'un même jet
  // aient la même taille APPARENTE — un cube ne remplit pas sa sphère comme un
  // icosaèdre (cf. `visualScaleFor`).
  const drawRadius = solid ? radius * visualScaleFor(solid) : radius;
  const box = Math.ceil(radius * 2 + PADDING_PX * 2);
  const tumble = tumbleFor(seed * 31 + index);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !solid) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const target = solid.faces.find((f) => f.value === face) ?? solid.faces[0]!;
    const rest = restRotation(solid, target);
    const spin = tumbleFor(seed * 31 + index);
    let cancelled = false;

    // Le canevas est dimensionné en pixels PHYSIQUES : sans cela, le tracé est
    // rééchantillonné à l'affichage et les arêtes fines bavent sur écran retina.
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(box * dpr);
    canvas.height = Math.round(box * dpr);

    const paint = (rotation: Mat3): void => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box, box);
      ctx.translate(box / 2, box / 2);
      drawSolid(ctx, solid, {
        radiusPx: drawRadius,
        rotation,
        perspectivePx: drawRadius * PERSPECTIVE_RATIO,
        targetValue: target.value,
      });
    };

    /**
     * Un chiffre tracé sur un canevas ne se redessine PAS quand la fonte finit
     * d'arriver — contrairement à un `<span>`, que le navigateur remet en page
     * tout seul. Sans ce rappel, le premier jet d'une session afficherait ses
     * chiffres dans la police de repli, définitivement.
     */
    const repaintWhenFontArrives = (): void => {
      if (!('fonts' in document)) return;
      void document.fonts.ready.then(() => {
        if (!cancelled) paint(rest);
      });
    };

    const still =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (still) {
      paint(rest);
      setSettled(true);
      repaintWhenFontArrives();
      return () => {
        cancelled = true;
      };
    }

    let raf = 0;
    let start = 0;
    const step = (now: number): void => {
      if (!start) start = now;
      const elapsed = now - start - spin.delayMs;
      if (elapsed >= spin.durationMs) {
        // Dernière image posée explicitement sur la pose : on ne dépend pas de
        // l'instant exact où le navigateur nous rappelle.
        paint(rest);
        setSettled(true);
        repaintWhenFontArrives();
        return;
      }
      const remaining = rotationAxisAngle(
        spin.axis,
        (1 - easeOutTumble(Math.max(0, elapsed) / spin.durationMs)) *
          spin.turns *
          2 *
          Math.PI,
      );
      paint(multiply(remaining, rest));
      raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [solid, face, drawRadius, box, seed, index]);

  if (!solid) return null;

  return (
    <div
      className={cn('die3d-drop', !kept && 'opacity-40 saturate-50', className)}
      style={{
        animationDelay: `${tumble.delayMs}ms`,
        animationDuration: `${tumble.durationMs}ms`,
      }}
      // Le chiffre est déjà annoncé par le toast du jet ; le dé n'est qu'une mise
      // en scène. L'annoncer deux fois ferait bafouiller le lecteur d'écran.
      aria-hidden="true"
      data-testid="die-3d"
      data-sides={sides}
      data-face={face}
      data-kept={kept ? 'true' : 'false'}
      data-settled={settled ? 'true' : 'false'}
    >
      <canvas ref={canvasRef} style={{ width: box, height: box }} />
    </div>
  );
}

/** Teintes du dé — pierre violette, gravure claire, arêtes dorées. */
const STONE_DARK = [46, 32, 66] as const;
const STONE_LIGHT = [156, 122, 196] as const;
const GOLD = '#d8bc76';
const ENGRAVING = '#f2ecfa';
const ENGRAVING_TARGET = '#ffe9b0';

function drawSolid(
  ctx: CanvasRenderingContext2D,
  solid: Polyhedron,
  options: Parameters<typeof projectDie>[1],
): void {
  const faces = projectDie(solid, options);
  for (const face of faces) drawFace(ctx, face);
}

/** Écart de teinte entre l'arête éclairée d'une face et son arête à l'ombre. */
const BEVEL = 0.14;

function drawFace(ctx: CanvasRenderingContext2D, face: ProjectedFace): void {
  if (face.polygon.length < 3) return;

  ctx.beginPath();
  face.polygon.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  // La face tirée est un cran plus claire : elle attire l'œil sans changer de
  // matière. Une couleur franchement différente — l'or plein de la version
  // précédente — donnait un dé bicolore où la face lue semblait d'un autre objet.
  const shade = Math.min(1, face.shade * (face.isTarget ? 1.2 : 1));
  ctx.fillStyle = bevelGradient(ctx, face, shade);
  ctx.fill();

  // Le liseré porte la lisibilité du solide : c'est lui qui sépare deux faces
  // d'orientations voisines, que l'ombrage seul ne distingue pas assez.
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.5 + 0.42 * face.shade;
  ctx.lineWidth = 1.1;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawDigit(ctx, face);
}

/**
 * Dégradé d'une face, de son arête tournée vers la lumière à son arête à l'ombre.
 *
 * L'axe est celui de la lumière PROJETÉE : le dégradé de toutes les faces suit
 * donc la même direction, ce qui se lit comme une seule source et non comme des
 * facettes éclairées chacune pour soi.
 */
function bevelGradient(
  ctx: CanvasRenderingContext2D,
  face: ProjectedFace,
  shade: number,
): CanvasGradient {
  const [lx, ly] = LIGHT_SCREEN;
  let min = Infinity;
  let max = -Infinity;
  for (const [x, y] of face.polygon) {
    const d = x * lx + y * ly;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  // Le côté éclairé est celui qui va le plus LOIN dans la direction de la
  // lumière, donc `max` — la source est du côté vers lequel pointe `LIGHT`.
  const g = ctx.createLinearGradient(max * lx, max * ly, min * lx, min * ly);
  g.addColorStop(0, mix(STONE_DARK, STONE_LIGHT, Math.min(1, shade + BEVEL)));
  g.addColorStop(1, mix(STONE_DARK, STONE_LIGHT, Math.max(0, shade - BEVEL)));
  return g;
}

function drawDigit(ctx: CanvasRenderingContext2D, face: ProjectedFace): void {
  const [a, b, c, d, e, f] = face.digitTransform;
  // Une face vue quasiment par la tranche écrase son repère : le chiffre y
  // deviendrait un trait. On l'omet plutôt que de dessiner une bavure.
  if (Math.abs(a * d - b * c) < 0.05) return;

  ctx.save();
  ctx.transform(a, b, c, d, e, f);
  ctx.font = `700 ${face.digitSize.toFixed(2)}px Cinzel, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = face.isTarget ? ENGRAVING_TARGET : ENGRAVING;
  ctx.globalAlpha = face.isTarget ? 1 : 0.35 + 0.55 * face.shade;
  // Léger décalage optique : `middle` cale sur la moyenne des hauteurs de fonte,
  // qui tombe un peu haut pour des chiffres sans jambage.
  ctx.fillText(String(face.value), 0, face.digitSize * 0.04);
  ctx.restore();
}

/** Interpolation linéaire entre deux teintes, `t` de 0 à 1. */
function mix(
  dark: readonly [number, number, number],
  light: readonly [number, number, number],
  t: number,
): string {
  const k = Math.min(1, Math.max(0, t));
  const channel = (i: number): number =>
    Math.round(dark[i]! + (light[i]! - dark[i]!) * k);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}
