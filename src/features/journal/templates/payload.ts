/**
 * Accès sûrs au `payload` d'un événement (plan 25.1).
 *
 * `GameEvent.payload` est typé `Record<string, unknown>` (kind-specific, non
 * validé au schéma) : les templates narrowent chaque champ via ces helpers,
 * jamais par un `as`. Une valeur absente / d'un mauvais type retombe sur le
 * défaut — le journal ne plante pas sur un payload partiel ou legacy.
 */

export function payloadString(
  payload: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  const v = payload[key];
  return typeof v === 'string' ? v : fallback;
}

export function payloadNumber(
  payload: Record<string, unknown>,
  key: string,
  fallback = 0,
): number {
  const v = payload[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function payloadBool(payload: Record<string, unknown>, key: string): boolean {
  return payload[key] === true;
}

/** Slug → libellé de repli capitalisé (« long-sword » → « Long sword »). */
export function capitalizeSlug(slug: string): string {
  if (!slug) return slug;
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}
