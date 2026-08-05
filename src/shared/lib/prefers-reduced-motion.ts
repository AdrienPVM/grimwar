/**
 * Lecture unique de `prefers-reduced-motion`. Le motif était recopié à
 * l'identique dans trois composants (aurore, particules, sceaux de sort) avec la
 * même double garde `typeof window` / `typeof matchMedia` — nécessaire parce que
 * les tests unitaires tournent sous jsdom, qui n'implémente pas toujours
 * `matchMedia`.
 *
 * Lecture paresseuse et non souscrite : la préférence change rarement au cours
 * d'une session, et un composant qui la relirait à chaque rendu paierait un
 * appel `matchMedia` par image d'animation.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
