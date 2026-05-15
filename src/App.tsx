/**
 * Placeholder de démarrage. Valide que les tokens (couleurs, polices, animations
 * drift1/2/3) sont bien câblés via Tailwind. Sera remplacé en plan 02 par le
 * vrai composant <Aurora> dans shared/components/.
 */
export function App(): JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink">
      {/* Aurora — trois blobs en arrière-plan, animation CSS-only */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(124,108,219,0.35),transparent_60%)] blur-3xl animate-drift1" />
        <div className="absolute right-[-15%] top-[20%] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle,rgba(220,184,108,0.28),transparent_60%)] blur-3xl animate-drift2" />
        <div className="absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle,rgba(232,90,90,0.18),transparent_65%)] blur-3xl animate-drift3" />
      </div>

      <h1
        className="font-display text-[clamp(48px,12vw,120px)] font-black uppercase tracking-wider [background:linear-gradient(180deg,#fde9b4_0%,#d4b25e_45%,#5e4d2c_100%)] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(220,184,108,0.35)]"
      >
        GrimWar
      </h1>
    </main>
  );
}
