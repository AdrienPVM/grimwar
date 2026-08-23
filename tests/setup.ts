import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom n'implémente pas `scrollIntoView` — une liste qui garde sa sélection
// dans le champ de vision (palette de commandes) casserait sinon en test alors
// qu'elle marche en navigateur. Un no-op suffit : c'est du confort de défilement,
// pas un comportement à vérifier ici.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}

// Polyfill matchMedia for components that read prefers-reduced-motion
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
