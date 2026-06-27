/**
 * Optimisation d'image AVANT encodage base64 / persistance — point d'entrée
 * UNIQUE de toute image uploadée dans l'app (portraits de jeton, fonds de carte,
 * et toute future image : portraits de PNJ, avatars…).
 *
 * Pourquoi centraliser : une image est stockée soit en IndexedDB (local), soit
 * en base64 DANS un document Firestore (synchro cross-device). Dans les deux
 * cas, la chaîne base64 EST l'empreinte de stockage — et un document Firestore
 * plafonne à 1 Mio. Stocker une photo de 4000 px (plusieurs Mo) est donc à la
 * fois inutile (un disque de jeton fait ~44 px) et dangereux (dépassement de
 * quota / de limite de doc). On réduit donc TOUJOURS résolution + qualité avant
 * d'écrire quoi que ce soit, pour viser « le moins de place possible ».
 *
 * Stratégie « budget d'octets » (vs dimensions+qualité figées) : on vise une
 * TAILLE CIBLE de la chaîne finale. On encode, on mesure ; tant qu'on dépasse,
 * on baisse la qualité, puis (qualité au plancher) on réduit la dimension. On
 * obtient ainsi une garantie dure sur l'empreinte, quelle que soit l'image
 * source — pas un pari sur « 256 px à 0,82 ça devrait tenir ».
 *
 * Le recadrage + ré-encodage canvas est une capacité NAVIGATEUR : jsdom n'a pas
 * de décodeur d'image ni de contexte 2D. On détecte l'absence de canvas en
 * amont (`hasCanvas2d`) pour ne JAMAIS attendre un `Image.onload` qui ne se
 * déclenchera pas. Selon `allowRawFallback`, on retombe alors sur la data URL
 * brute (chemin local, dégradé) ou on lève une erreur (chemin Firestore, où une
 * image brute non bornée est inacceptable). Le vrai redimensionnement est
 * couvert par les e2e (chromium) ; la logique de décision est pure et testée.
 */

/** Recadrage appliqué avant réduction. */
export type CropMode = 'square' | 'none';

/** Réglages d'une passe d'optimisation (un preset par destination). */
export interface ImageOptimizeOptions {
  /** Recadrage : carré « cover » centré (portraits ronds) ou aucun (fonds). */
  readonly crop: CropMode;
  /** Côté max initial (px) du plus grand côté avant la boucle de réduction. */
  readonly maxDim: number;
  /** Côté min sous lequel on refuse de descendre (px). */
  readonly minDim: number;
  /** Qualité de ré-encodage de départ (webp/jpeg, 0–1). */
  readonly startQuality: number;
  /** Qualité plancher avant de réduire la dimension. */
  readonly minQuality: number;
  /** Budget de la chaîne finale, EN OCTETS (≈ empreinte Firestore/IndexedDB). */
  readonly targetMaxBytes: number;
  /** Plafond de l'upload brut AVANT lecture (octets) — garde-fou mémoire. */
  readonly maxUploadBytes: number;
  /**
   * Si le canvas est indisponible (jsdom / navigateur exotique) : `true` →
   * renvoie la data URL brute (chemins LOCAUX, dégradé mais fonctionnel) ;
   * `false` → lève (chemins FIRESTORE, où une image non bornée est interdite).
   */
  readonly allowRawFallback: boolean;
}

/** Résultat d'une optimisation : la data URL + ses métadonnées de poids. */
export interface OptimizedImage {
  /** Data URL finale (`data:image/webp;base64,…`, ou jpeg en repli). */
  readonly dataUrl: string;
  /** Largeur finale (px). */
  readonly width: number;
  /** Hauteur finale (px). */
  readonly height: number;
  /** Taille de la chaîne `dataUrl` en octets (empreinte de stockage). */
  readonly bytes: number;
  /** Type MIME effectif (`image/webp` ou `image/jpeg`). */
  readonly mime: string;
  /** `true` si on a renvoyé l'image brute faute de canvas (cf. allowRawFallback). */
  readonly raw: boolean;
}

/** Erreur typée portant un message FR prêt à afficher. */
export class ImageOptimizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageOptimizeError';
  }
}

/** Pas de réduction de qualité par itération. */
const QUALITY_STEP = 0.12;
/** Facteur de réduction de dimension quand la qualité est au plancher. */
const DIM_STEP = 0.8;
/** Garde-fou de boucle (terminaison garantie même sur cas pathologique). */
const MAX_ITERATIONS = 40;
/** Tolérance flottante pour comparer des qualités. */
const Q_EPSILON = 1e-3;

/**
 * Preset PORTRAIT — destiné à la synchro base64-dans-Firestore (jetons, PNJ).
 * Carré, petit, budget serré : un disque ~44 px n'a pas besoin de plus, et la
 * cible ~32 Ko est minuscule face à la limite de 1 Mio d'un document Firestore.
 */
export const PORTRAIT_PRESET: ImageOptimizeOptions = {
  crop: 'square',
  maxDim: 192,
  minDim: 96,
  startQuality: 0.78,
  minQuality: 0.5,
  targetMaxBytes: 32 * 1024,
  maxUploadBytes: 10 * 1024 * 1024,
  allowRawFallback: false,
};

/**
 * Preset FOND DE CARTE — IndexedDB local (pas de limite de doc), mais on évite
 * d'entreposer un PNG `.dd2vtt` brut de 20 Mo. Aspect préservé (l'image est
 * étirée sur le viewBox au rendu), ré-encodage webp, dimension plafonnée.
 */
export const MAP_BACKGROUND_PRESET: ImageOptimizeOptions = {
  crop: 'none',
  maxDim: 2048,
  minDim: 1024,
  startQuality: 0.8,
  minQuality: 0.55,
  targetMaxBytes: 1_400 * 1024,
  maxUploadBytes: 40 * 1024 * 1024,
  allowRawFallback: true,
};

/**
 * Empreinte de stockage d'une data URL, en octets. Firestore (et IndexedDB)
 * stockent la chaîne telle quelle ; une data URL base64 est du pur ASCII, donc
 * 1 caractère = 1 octet. C'est la mesure honnête du coût de stockage — pas le
 * poids de l'image décodée. Fonction pure → testable sans canvas.
 */
export function dataUrlByteSize(dataUrl: string): number {
  return dataUrl.length;
}

/**
 * Décide de la prochaine passe (dimension, qualité) à tenter quand l'encodage
 * courant dépasse le budget. On baisse d'abord la QUALITÉ (peu coûteux
 * visuellement), puis — qualité au plancher — on réduit la DIMENSION et on
 * remonte la qualité au départ (une image plus petite peut se permettre plus de
 * qualité à budget égal). Renvoie `null` quand dimension ET qualité sont au
 * plancher : on a fait au mieux. Fonction pure → testable sans canvas.
 */
export function nextEncodeStep(
  state: { readonly dim: number; readonly quality: number },
  opts: Pick<ImageOptimizeOptions, 'minDim' | 'startQuality' | 'minQuality'>,
): { readonly dim: number; readonly quality: number } | null {
  if (state.quality > opts.minQuality + Q_EPSILON) {
    return {
      dim: state.dim,
      quality: Math.max(opts.minQuality, state.quality - QUALITY_STEP),
    };
  }
  if (state.dim > opts.minDim) {
    const nextDim = Math.max(opts.minDim, Math.round(state.dim * DIM_STEP));
    if (nextDim < state.dim) {
      return { dim: nextDim, quality: opts.startQuality };
    }
  }
  return null;
}

/** `true` si un contexte canvas 2D est disponible (faux en jsdom). */
function hasCanvas2d(): boolean {
  try {
    return document.createElement('canvas').getContext('2d') != null;
  } catch {
    return false;
  }
}

/** Décode une data URL en HTMLImageElement (rejette si le décodage échoue). */
function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new ImageOptimizeError('Image illisible ou format non supporté.'));
    img.src = dataUrl;
  });
}

/** Géométrie source→cible selon le mode de recadrage, sans jamais agrandir. */
function computeDraw(
  img: HTMLImageElement,
  crop: CropMode,
  dim: number,
): {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
} {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  if (crop === 'square') {
    const side = Math.min(natW, natH);
    const target = Math.min(dim, side);
    return {
      sx: (natW - side) / 2,
      sy: (natH - side) / 2,
      sw: side,
      sh: side,
      dw: target,
      dh: target,
    };
  }
  const longest = Math.max(natW, natH);
  const scale = Math.min(1, dim / longest);
  return {
    sx: 0,
    sy: 0,
    sw: natW,
    sh: natH,
    dw: Math.max(1, Math.round(natW * scale)),
    dh: Math.max(1, Math.round(natH * scale)),
  };
}

/** Une passe de rendu : recadre, réduit, ré-encode (webp, jpeg en repli). */
function drawToDataUrl(
  img: HTMLImageElement,
  crop: CropMode,
  dim: number,
  quality: number,
): { dataUrl: string; width: number; height: number; mime: string } {
  const { sx, sy, sw, sh, dw, dh } = computeDraw(img, crop, dim);
  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new ImageOptimizeError('Contexte de rendu image indisponible.');
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) {
    return { dataUrl: webp, width: dw, height: dh, mime: 'image/webp' };
  }
  const jpeg = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl: jpeg, width: dw, height: dh, mime: 'image/jpeg' };
}

/**
 * Cœur de l'optimisation : prend une data URL DÉJÀ lue, renvoie la version
 * optimisée sous le budget (ou au mieux si le plancher est atteint). Gère le
 * repli sans-canvas selon `allowRawFallback`.
 */
export async function optimizeDataUrl(
  dataUrl: string,
  opts: ImageOptimizeOptions,
): Promise<OptimizedImage> {
  if (!hasCanvas2d()) {
    if (opts.allowRawFallback) {
      return {
        dataUrl,
        width: 0,
        height: 0,
        bytes: dataUrlByteSize(dataUrl),
        mime: '',
        raw: true,
      };
    }
    throw new ImageOptimizeError(
      "Optimisation d'image indisponible sur cet appareil.",
    );
  }

  const img = await decodeImage(dataUrl);
  let state = { dim: opts.maxDim, quality: opts.startQuality };
  let best = drawToDataUrl(img, opts.crop, state.dim, state.quality);
  let bestSize = dataUrlByteSize(best.dataUrl);

  let guard = 0;
  while (bestSize > opts.targetMaxBytes && guard < MAX_ITERATIONS) {
    guard += 1;
    const next = nextEncodeStep(state, opts);
    if (!next) break;
    state = next;
    best = drawToDataUrl(img, opts.crop, state.dim, state.quality);
    bestSize = dataUrlByteSize(best.dataUrl);
  }

  return {
    dataUrl: best.dataUrl,
    width: best.width,
    height: best.height,
    bytes: bestSize,
    mime: best.mime,
    raw: false,
  };
}

/** Lit un fichier en data URL via FileReader (rejette sur erreur de lecture). */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new ImageOptimizeError('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Optimise un FICHIER image choisi par l'utilisateur. Valide le type + la taille
 * (rejets synchrones, message FR), lit, puis délègue à `optimizeDataUrl`. Point
 * d'entrée recommandé pour tout `<input type="file" accept="image/*">`.
 */
export async function optimizeImageFile(
  file: File,
  opts: ImageOptimizeOptions,
): Promise<OptimizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new ImageOptimizeError(
      'Choisissez un fichier image (PNG, JPEG, WebP…).',
    );
  }
  if (file.size > opts.maxUploadBytes) {
    const mb = Math.round(opts.maxUploadBytes / (1024 * 1024));
    throw new ImageOptimizeError(`Image trop lourde (maximum ${mb} Mo).`);
  }
  const dataUrl = await readFileAsDataUrl(file);
  return optimizeDataUrl(dataUrl, opts);
}
