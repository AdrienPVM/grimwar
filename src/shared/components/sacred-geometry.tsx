/**
 * Filigrane SVG en arrière-plan : cercles concentriques + étoile de David
 * dessinée par deux triangles superposés. Rotation lente (180s). Reprise du
 * `body::before` du prototype — porté ici en React pour rester composable.
 */
export function SacredGeometry(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-[-20%] -z-10 opacity-[0.05] animate-slowDrift"
    >
      <svg
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[130vmin] w-[130vmin] max-h-none mx-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <g fill="none" stroke="var(--gold)" strokeWidth="0.5">
          <circle cx="300" cy="300" r="280" />
          <circle cx="300" cy="300" r="220" />
          <circle cx="300" cy="300" r="160" />
          <polygon points="300,40 525,430 75,430" />
          <polygon points="300,560 75,170 525,170" />
          <line x1="40" y1="300" x2="560" y2="300" />
          <line x1="300" y1="40" x2="300" y2="560" />
        </g>
      </svg>
    </div>
  );
}
