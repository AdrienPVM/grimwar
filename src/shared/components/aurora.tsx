/**
 * Aurora — trois blobs en arrière-plan. Animation CSS-only (Tailwind keyframes
 * `drift1/2/3`), couplée à `mix-blend-mode: screen` pour un fondu cinématique.
 * `prefers-reduced-motion` coupe l'animation via la règle globale dans `globals.css`.
 * Pas de JS update loop — c'est une décision design (cf. `docs/DESIGN-SYSTEM.md`).
 */
export function Aurora(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-[-10%] -z-20 overflow-hidden opacity-30 blur-[100px]"
    >
      <div
        className="absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-gold mix-blend-screen animate-drift1"
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-amethyst-deep mix-blend-screen animate-drift2"
      />
      <div
        className="absolute left-1/2 top-[40%] h-[600px] w-[600px] rounded-full bg-ruby opacity-60 mix-blend-screen animate-drift3"
      />
    </div>
  );
}
