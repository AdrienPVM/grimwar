import { useMemo } from 'react';

type Particle = {
  id: number;
  left: number;
  duration: number;
  delay: number;
};

const PARTICLE_COUNT = 20;

/**
 * 20 points de poussière dorée flottants. Animation CSS-only (`animate-float` +
 * keyframes Tailwind). Positions et timing tirés une seule fois au mount via
 * `useMemo` — pas de boucle JS de frame. `prefers-reduced-motion` neutralise
 * le keyframes via la règle globale.
 */
export function Particles(): JSX.Element {
  const particles = useMemo<readonly Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
      id,
      left: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: -Math.random() * 30,
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute h-[2px] w-[2px] rounded-full bg-gold-bright shadow-[0_0_6px_var(--gold)] opacity-0 animate-float"
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
