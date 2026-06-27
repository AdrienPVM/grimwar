/**
 * Lecture + optimisation d'un fichier image choisi par le MJ en un data URL
 * prêt à stocker comme portrait de jeton.
 *
 * Délègue désormais à l'optimiseur centralisé `@/shared/lib/image-optimize`
 * (point d'entrée unique de toute image uploadée — cf. son en-tête). Ce module
 * ne garde qu'une fine couche de compatibilité : son erreur typée historique
 * (`TokenImageError`) et le preset portrait. Le recadrage rond + la réduction
 * « budget d'octets » vivent dans l'optimiseur.
 */
import {
  ImageOptimizeError,
  optimizeImageFile,
  PORTRAIT_PRESET,
} from '@/shared/lib/image-optimize';

/** Côté max du portrait carré (px) — repris du preset portrait. */
export const MAX_TOKEN_DIM = PORTRAIT_PRESET.maxDim;

/** Plafond de l'upload AVANT lecture (octets) — repris du preset portrait. */
export const MAX_UPLOAD_BYTES = PORTRAIT_PRESET.maxUploadBytes;

/** Erreur typée portant un message FR prêt à afficher dans l'éditeur. */
export class TokenImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenImageError';
  }
}

/**
 * Transforme un fichier choisi en data URL de portrait optimisé. Le portrait
 * d'un jeton reste pour l'instant stocké en IndexedDB local : on autorise le
 * repli sur l'image brute si le canvas est indisponible (dégradé mais
 * fonctionnel hors navigateur). Lève `TokenImageError` (message FR) sur fichier
 * invalide.
 */
export async function fileToTokenImage(file: File): Promise<string> {
  try {
    const result = await optimizeImageFile(file, {
      ...PORTRAIT_PRESET,
      allowRawFallback: true,
    });
    return result.dataUrl;
  } catch (err) {
    if (err instanceof ImageOptimizeError) {
      throw new TokenImageError(err.message);
    }
    throw err;
  }
}
