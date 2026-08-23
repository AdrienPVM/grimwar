/**
 * Export d'un pack de contenu maison (M29 de l'audit de malléabilité).
 *
 * L'écran de packs ne faisait qu'ENTRER : `PackRow` n'offrait qu'« Éditer » et
 * « Supprimer », et `pack-storage.ts` n'avait aucune sérialisation sortante. Un
 * pack fabriqué dans l'app ne ressortait donc jamais sous la forme JSON qu'elle
 * sait pourtant ingérer — impossible de le donner à l'autre MJ de la table, ou
 * simplement de le sauvegarder avant de changer de téléphone.
 *
 * Le format produit est EXACTEMENT celui qu'accepte `parseCustomContentPack`
 * (`{ meta, entities }` = `CustomContentPackSchema`) : l'aller-retour
 * export → import est un invariant testé, pas une coïncidence.
 */

import type { CustomContentPack } from '@/shared/types/custom-content-pack';

/** JSON indenté : un pack se relit et se corrige à la main dans un éditeur. */
export function serializeCustomContentPack(pack: CustomContentPack): string {
  return JSON.stringify({ meta: pack.meta, entities: pack.entities }, null, 2);
}

/**
 * Nom de fichier proposé au téléchargement. On part de l'`id` du pack (déjà
 * slugifié à la création) plutôt que de son nom affiché, qui peut contenir des
 * accents, des espaces et des barres obliques.
 */
export function packExportFilename(pack: CustomContentPack): string {
  const safeId = pack.meta.id.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${safeId}-v${pack.meta.version}.json`;
}

/**
 * Déclenche le téléchargement du pack. Effet de bord isolé ici pour que la
 * sérialisation reste pure et testable ; l'URL objet est révoquée aussitôt,
 * sinon chaque export fuiterait un blob jusqu'au rechargement de l'onglet.
 */
export function downloadCustomContentPack(pack: CustomContentPack): void {
  const blob = new Blob([serializeCustomContentPack(pack)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = packExportFilename(pack);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
