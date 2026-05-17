import { render, screen, fireEvent } from '@testing-library/react';
import { useRef, useState, type JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailModal } from '../detail-modal';

/**
 * Composant partagé `DetailModal` (UAT post-plan 05 — ajustement 2 mobile).
 *
 * Rouge avant vert : le fichier `detail-modal.tsx` n'existe pas encore au moment
 * d'écrire ce test → l'import échoue → tout le bloc est RED. Une fois le
 * primitive en place avec le contrat ci-dessous, les tests deviennent verts.
 *
 * Contrat attendu (cf. brief Adrien) :
 *   - role="dialog" + aria-modal="true" + aria-labelledby.
 *   - ESC ferme (callback `onClose`).
 *   - Click sur le backdrop (zone hors panneau) ferme.
 *   - Click sur le bouton de fermeture intégré ferme.
 *   - À l'ouverture, le focus part dans la modale (premier focusable interne).
 *   - À la fermeture, le focus est rendu à l'élément qui avait le focus avant l'ouverture.
 *   - Tab cycle entre les éléments focusables INTERNES (focus piégé).
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DetailModal — primitive accessible partagée', () => {
  it('expose role="dialog", aria-modal="true" et aria-labelledby', () => {
    render(
      <DetailModal
        open
        onClose={() => {}}
        titleId="modal-title"
      >
        <h2 id="modal-title">Titre</h2>
        <p>Contenu détail</p>
      </DetailModal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(screen.getByText('Contenu détail')).toBeInTheDocument();
  });

  it('appelle onClose quand l’utilisateur appuie sur Échap', () => {
    const onClose = vi.fn();
    render(
      <DetailModal open onClose={onClose} titleId="t">
        <h2 id="t">Titre</h2>
        <p>Body</p>
      </DetailModal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('appelle onClose au clic sur le backdrop (hors du panneau)', () => {
    const onClose = vi.fn();
    render(
      <DetailModal open onClose={onClose} titleId="t">
        <h2 id="t">Titre</h2>
        <p>Body</p>
      </DetailModal>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('un clic à l’intérieur du panneau NE ferme PAS', () => {
    const onClose = vi.fn();
    render(
      <DetailModal open onClose={onClose} titleId="t">
        <h2 id="t">Titre</h2>
        <p data-testid="inner">Body</p>
      </DetailModal>,
    );
    const inner = screen.getByTestId('inner');
    fireEvent.mouseDown(inner);
    fireEvent.click(inner);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('expose un bouton de fermeture accessible (aria-label) qui déclenche onClose', () => {
    const onClose = vi.fn();
    render(
      <DetailModal open onClose={onClose} titleId="t">
        <h2 id="t">Titre</h2>
        <p>Body</p>
      </DetailModal>,
    );
    const closeBtn = screen.getByRole('button', { name: /fermer/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rend le focus au déclencheur après fermeture', () => {
    function Wrapper(): JSX.Element {
      const [open, setOpen] = useState(false);
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button
            ref={triggerRef}
            data-testid="trigger"
            onClick={() => setOpen(true)}
          >
            Ouvrir
          </button>
          <DetailModal open={open} onClose={() => setOpen(false)} titleId="t">
            <h2 id="t">Titre</h2>
            <p>Body</p>
          </DetailModal>
        </>
      );
    }

    render(<Wrapper />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    // À l’ouverture, le focus part dans la modale → trigger perd le focus.
    expect(trigger).not.toHaveFocus();
    // Fermeture via ESC → focus revient au trigger.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });

  it('quand open=false, ne rend rien (pas de role=dialog)', () => {
    render(
      <DetailModal open={false} onClose={() => {}} titleId="t">
        <h2 id="t">Caché</h2>
      </DetailModal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('DetailModal — focus management', () => {
  it("place le focus à l'intérieur de la modale à l'ouverture", () => {
    function Wrapper(): JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button data-testid="trigger" onClick={() => setOpen(true)}>
            Ouvrir
          </button>
          <DetailModal open={open} onClose={() => setOpen(false)} titleId="t">
            <h2 id="t">Titre</h2>
            <button data-testid="inside">Action interne</button>
          </DetailModal>
        </>
      );
    }
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId('trigger'));
    // Le focus est désormais dans la modale, pas sur le trigger.
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

// Anti-régression : on s’assure aussi qu’un clic sur l’overlay déclenche bien
// `onClose` même si la modale contient un élément interactif au pointeur (ex.
// un autre `<button>` qui a un `onClick` propre) — `e.stopPropagation()` côté
// panneau interne ne doit pas suffire à neutraliser le close, mais le clic
// hors panneau (qui voit `event.target === dialog`) doit toujours fermer.
beforeEach(() => {
  // rien à seeded, juste un anchor pour grouper les anti-régression futures
});

/**
 * Contrat « vraie modale en portal + overlay » — UAT post-plan 05 bug n°2.
 *
 * Pourquoi ces tests : la modale précédente s'affichait DANS le flux de la
 * page parce que le `<GlassPanel>` du wizard applique `backdrop-blur-xl`,
 * et `backdrop-filter` crée un nouveau containing block → `position: fixed`
 * devient relatif au panel et non au viewport. La modale apparaissait alors
 * tout en bas, hors-écran, sans backdrop plein viewport.
 *
 * Jsdom ne calcule pas les styles (pas de layout), donc on attrape ce qui
 * est attrapable structurellement :
 *   1. Rendu via `createPortal` → l'élément est attaché à `document.body`,
 *      pas dans l'arbre DOM du composant parent qui le déclenche.
 *   2. Classes Tailwind `fixed` + `inset-0` présentes sur le backdrop —
 *      garantit qu'il couvre tout le viewport (ou son containing block ;
 *      grâce au portal, c'est bien `body`).
 *   3. `document.body.style.overflow === 'hidden'` quand `open=true`, et
 *      restauré quand `open=false` — bloque le scroll de la page derrière.
 *
 * Ces 3 invariants n'auraient pas tout attrapé (le containing block réel
 * n'est testable qu'en e2e), mais ils auraient bloqué le rendu inline qui
 * a échappé à l'UAT machine.
 */
describe('DetailModal — vraie modale (portal + overlay + body lock)', () => {
  it('rend via createPortal hors de l’arbre du parent (cible = document.body)', () => {
    const { container } = render(
      <div data-testid="parent">
        <DetailModal open onClose={() => {}} titleId="t">
          <h2 id="t">Titre</h2>
          <p>Body</p>
        </DetailModal>
      </div>,
    );
    const dialog = screen.getByRole('dialog');
    // L'arbre du parent ne contient PAS la modale.
    const parent = screen.getByTestId('parent');
    expect(parent.contains(dialog)).toBe(false);
    // Le container de render() ne contient PAS la modale.
    expect(container.contains(dialog)).toBe(false);
    // En revanche, document.body la contient.
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('le backdrop est position:fixed + inset-0 (classes Tailwind)', () => {
    render(
      <DetailModal open onClose={() => {}} titleId="t">
        <h2 id="t">Titre</h2>
      </DetailModal>,
    );
    const dialog = screen.getByRole('dialog');
    // Vérification structurelle : les classes Tailwind nécessaires sont là.
    // Jsdom ne résout pas le layout, mais l'absence de ces classes est une
    // régression visuelle immédiate en navigateur.
    expect(dialog.className).toMatch(/\bfixed\b/);
    expect(dialog.className).toMatch(/\binset-0\b/);
  });

  it('verrouille le scroll de la page (body.overflow = hidden) tant que open=true', () => {
    function Wrapper(): JSX.Element {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button data-testid="close-btn" onClick={() => setOpen(false)}>
            close
          </button>
          <DetailModal open={open} onClose={() => setOpen(false)} titleId="t">
            <h2 id="t">Titre</h2>
          </DetailModal>
        </>
      );
    }
    // Pré-condition : body.overflow vide au départ.
    document.body.style.overflow = '';
    const { unmount } = render(<Wrapper />);
    expect(document.body.style.overflow).toBe('hidden');
    // À la fermeture, restaure le scroll.
    fireEvent.click(screen.getByTestId('close-btn'));
    expect(document.body.style.overflow).not.toBe('hidden');
    unmount();
  });

  it('restaure le scroll du body au démontage même si la modale était ouverte', () => {
    document.body.style.overflow = '';
    const { unmount } = render(
      <DetailModal open onClose={() => {}} titleId="t">
        <h2 id="t">Titre</h2>
      </DetailModal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
