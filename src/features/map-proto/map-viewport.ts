/**
 * Dimensions du viewBox SVG du mode carte — source unique partagée par la vue
 * live MJ (`map-live-screen`), la vue présentation/TV (`map-tv-screen`) et le
 * parseur d'import `.dd2vtt` (`dd2vtt.ts`).
 *
 * Tout est exprimé dans cet espace de coords logique 0..W / 0..H : tokens, fog,
 * lumières, AoE et murs. L'image de fond est étirée sur ce viewBox ; l'import
 * `.dd2vtt` normalise les coords du donjon dans ce même espace pour que les
 * murs se superposent exactement à l'image.
 *
 * Le ratio 1000×700 (~1.43) est volontairement proche du 3:2 d'un écran
 * paysage de table — pas un carré, pour éviter le letterbox sur la plupart des
 * cartes de donjon.
 */
export const MAP_VIEWBOX_W = 1000 as const;
export const MAP_VIEWBOX_H = 700 as const;
