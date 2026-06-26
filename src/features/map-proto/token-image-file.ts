/**
 * Lecture + redimensionnement d'un fichier image choisi par le MJ en un data
 * URL prêt à stocker comme portrait de jeton (`token-image-store.ts`).
 *
 * Un portrait s'affiche dans un disque d'environ 44 px : inutile d'entreposer
 * une photo 4000 px en IndexedDB. On recadre donc au CENTRE en carré et on
 * réduit à `MAX_TOKEN_DIM` px (les jetons sont ronds → recadrage « cover »
 * centré, jamais déformé), puis on ré-encode compressé. Résultat : quelques
 * dizaines de Ko au lieu de plusieurs Mo.
 *
 * La validation (type, taille) est synchrone et testée en unitaire. Le
 * recadrage canvas est une capacité navigateur (jsdom n'a pas de décodeur
 * d'image) : si le contexte 2D est indisponible, on retombe sur le data URL
 * brut — dégradé mais fonctionnel — et le vrai redimensionnement est couvert
 * par les e2e (chromium).
 */

/** Côté max du portrait carré (px). Largement suffisant pour un disque ~44 px. */
export const MAX_TOKEN_DIM = 256;

/** Plafond de l'upload AVANT lecture (10 Mo) — garde-fou mémoire/quota. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Qualité de ré-encodage (webp/jpeg) — compromis poids / netteté à 44 px. */
const ENCODE_QUALITY = 0.82;

/** Erreur typée portant un message FR prêt à afficher dans l'éditeur. */
export class TokenImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenImageError';
  }
}

/** Lit un fichier en data URL via FileReader (rejette sur erreur de lecture). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new TokenImageError('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

/** Décode un data URL en HTMLImageElement (rejette si le décodage échoue). */
function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new TokenImageError("Image illisible ou format non supporté."));
    img.src = dataUrl;
  });
}

/**
 * Recadre `img` au centre en carré et le réduit à `MAX_TOKEN_DIM` px. Renvoie
 * `null` si le contexte canvas est indisponible (jsdom) — le caller retombe
 * alors sur le data URL brut.
 */
function resizeToSquare(img: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = MAX_TOKEN_DIM;
  canvas.height = MAX_TOKEN_DIM;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Recadrage « cover » : on prend le plus grand carré centré de la source.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, MAX_TOKEN_DIM, MAX_TOKEN_DIM);

  // webp si supporté (plus léger) ; sinon le navigateur renvoie du png → on
  // bascule explicitement sur jpeg pour garder un poids maîtrisé.
  const webp = canvas.toDataURL('image/webp', ENCODE_QUALITY);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', ENCODE_QUALITY);
}

/**
 * Transforme un fichier choisi en data URL de portrait. Valide le type et la
 * taille, lit, décode et redimensionne. Lève `TokenImageError` (message FR) sur
 * fichier invalide.
 */
export async function fileToTokenImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new TokenImageError('Choisissez un fichier image (PNG, JPEG, WebP…).');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new TokenImageError('Image trop lourde (maximum 10 Mo).');
  }
  const rawDataUrl = await readAsDataUrl(file);
  const img = await decodeImage(rawDataUrl);
  return resizeToSquare(img) ?? rawDataUrl;
}
