import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// Polyfill matchMedia for components that read prefers-reduced-motion
if (typeof window !== 'undefined' && !window.matchMedia) {
  // @ts-expect-error -- jsdom doesn't ship matchMedia by default
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
