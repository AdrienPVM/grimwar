import { useId, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import type { MapToken } from '@/shared/types/map';

/**
 * Éditeur d'un jeton de carte live (nom + couleur + suppression unitaire).
 *
 * S'ouvre au TAP d'un jeton (geste distinct du drag, cf. seuil dans
 * `map-live-screen`). Avant ce composant, la vue live ne permettait QUE de
 * poser un jeton « PJ/PNJ » au centre et de tout effacer en bloc — aucune
 * façon de renommer « PNJ » en « Gobelin chef », de le recolorer pour
 * distinguer deux factions, ou de retirer UN seul jeton vaincu.
 *
 * Données : `label` et `color` existent déjà sur `mapTokenSchema`, écrits via
 * `updateToken`/`deleteToken` (mêmes helpers que le mouvement, même autorité
 * Firestore déjà en live) — zéro changement de schéma, zéro nouvelle rule.
 *
 * Convention map-proto : chaînes FR inline (cf. en-tête `map-live-screen`).
 */

/**
 * Palette de couleurs de jeton. Ce sont des données DE DOMAINE (la couleur
 * d'un marqueur de créature choisie par le MJ), pas des tokens de design —
 * d'où les hex en clair, comme `TOKEN_COLORS` côté `map-live-screen`. Huit
 * teintes nettement distinguables sur un fond de carte sombre.
 */
const TOKEN_PALETTE: readonly { hex: string; label: string }[] = [
  { hex: '#60a5fa', label: 'Bleu' },
  { hex: '#f87171', label: 'Rouge' },
  { hex: '#4ade80', label: 'Vert' },
  { hex: '#fbbf24', label: 'Ambre' },
  { hex: '#c084fc', label: 'Violet' },
  { hex: '#2dd4bf', label: 'Turquoise' },
  { hex: '#f472b6', label: 'Rose' },
  { hex: '#9ca3af', label: 'Gris' },
];

const KIND_LABELS: Record<MapToken['kind'], string> = {
  pj: 'Personnage joueur',
  pnj: 'PNJ / monstre',
  marker: 'Repère',
};

const LABEL_MAX = 24;

interface Props {
  /** Jeton en cours d'édition, ou `null` quand la modale est fermée. */
  token: MapToken | null;
  /** Persiste le nom + la couleur (le caller route vers `updateToken`). */
  onSave: (patch: { label: string; color: string }) => void;
  /** Supprime ce seul jeton (le caller route vers `deleteToken`). */
  onDelete: () => void;
  /** Ferme sans rien changer. */
  onClose: () => void;
}

export function TokenEditModal({
  token,
  onSave,
  onDelete,
  onClose,
}: Props): JSX.Element | null {
  return (
    <DetailModal
      open={token !== null}
      onClose={onClose}
      size="sm"
      closeLabel="Fermer l'édition du jeton"
    >
      {/* Form remonté (`key={id}`) à chaque jeton → state local frais sans
          `useEffect` de synchronisation (cf. convention « pas de useEffect
          pour de l'état dérivé »). */}
      {token && (
        <TokenEditForm
          key={token.id}
          token={token}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </DetailModal>
  );
}

function TokenEditForm({
  token,
  onSave,
  onDelete,
}: {
  token: MapToken;
  onSave: Props['onSave'];
  onDelete: Props['onDelete'];
}): JSX.Element {
  const [label, setLabel] = useState(token.label);
  const [color, setColor] = useState(token.color);
  const titleId = useId();

  const trimmed = label.trim();
  const canSave = trimmed.length > 0;

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-1 pr-10">
        <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {KIND_LABELS[token.kind]}
        </p>
        <h2
          id={titleId}
          className="font-display text-2xl leading-tight text-gold-bright"
        >
          Modifier le jeton
        </h2>
      </header>

      <label className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          Nom
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={LABEL_MAX}
          data-testid="token-edit-label"
          className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-4 py-3 font-serif text-body text-text outline-none transition-colors duration-200 ease-base placeholder:italic placeholder:text-text-faint focus:border-gold"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          Couleur
        </span>
        <div
          role="radiogroup"
          aria-label="Couleur du jeton"
          className="flex flex-wrap gap-3"
        >
          {TOKEN_PALETTE.map((c) => {
            const selected = c.hex.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c.label}
                data-testid={`token-color-${c.hex.slice(1)}`}
                onClick={() => setColor(c.hex)}
                // Couleur de domaine (teinte du jeton) → style dynamique légitime.
                style={{ backgroundColor: c.hex }}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition-transform duration-200 ease-base',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/50',
                  selected
                    ? 'scale-110 border-gold-bright'
                    : 'border-white-8 hover:scale-105',
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-2">
        <button
          type="button"
          data-testid="token-edit-save"
          disabled={!canSave}
          onClick={() => onSave({ label: trimmed, color })}
          className="rounded-pill border border-gold-dim/50 bg-gold/10 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/20 disabled:opacity-40"
        >
          Enregistrer
        </button>
        <button
          type="button"
          data-testid="token-edit-delete"
          onClick={onDelete}
          className="rounded-pill border border-crimson/40 px-4 py-3 font-title text-[11px] uppercase tracking-[0.18em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/[0.08]"
        >
          Supprimer ce jeton
        </button>
      </div>
    </div>
  );
}
