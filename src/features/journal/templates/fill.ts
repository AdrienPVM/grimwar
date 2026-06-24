/**
 * Substitution de placeholders `{clé}` dans une chaîne i18n (plan 25.1).
 *
 * Le compilateur de journal produit une chaîne Markdown, pas du JSX — il ne peut
 * donc pas composer un libellé interpolé en assemblant des fragments React comme
 * le reste de l'app. On garde toute la prose dans la couche i18n (`t()`, FR par
 * défaut, EN ajouté en S5) et on substitue ici les variables.
 *
 * `{actor}` → `vars.actor`. Un placeholder sans variable correspondante est
 * laissé tel quel (visible = bug de template attrapé en test, pas un crash). Les
 * valeurs numériques sont coercées en chaîne.
 */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}
