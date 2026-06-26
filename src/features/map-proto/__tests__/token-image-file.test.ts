import { describe, expect, it } from 'vitest';

import {
  fileToTokenImage,
  MAX_UPLOAD_BYTES,
  TokenImageError,
} from '../token-image-file';

/**
 * Validation de `fileToTokenImage`. Seuls les rejets SYNCHRONES (type, taille)
 * sont testables en jsdom : ils lèvent AVANT toute lecture/décodage. Le
 * recadrage canvas est une capacité navigateur (jsdom n'a pas de décodeur
 * d'image) couverte par les e2e — on ne déclenche donc jamais le chemin
 * « image valide » ici (il pendrait sur un `Image.onload` qui ne se déclenche
 * pas en jsdom).
 */

describe('fileToTokenImage — validation', () => {
  it('rejette un fichier non-image avec un message FR', async () => {
    const notImage = new File(['{}'], 'data.json', {
      type: 'application/json',
    });
    await expect(fileToTokenImage(notImage)).rejects.toBeInstanceOf(
      TokenImageError,
    );
    await expect(fileToTokenImage(notImage)).rejects.toThrow(/fichier image/i);
  });

  it('rejette une image trop lourde (> 10 Mo)', async () => {
    const big = new File(['x'], 'huge.png', { type: 'image/png' });
    // On force la taille rapportée sans allouer 10 Mo réels.
    Object.defineProperty(big, 'size', { value: MAX_UPLOAD_BYTES + 1 });
    await expect(fileToTokenImage(big)).rejects.toBeInstanceOf(TokenImageError);
    await expect(fileToTokenImage(big)).rejects.toThrow(/trop lourde/i);
  });
});
