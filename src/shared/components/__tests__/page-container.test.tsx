import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PageContainer, type PageWidth } from '../page-container';

/**
 * Garde-fou du conteneur de page partagé. On fige l'IDENTITÉ des chaînes de
 * largeur (pas leur simple présence) : c'est ce qui garantit que l'élargissement
 * TV (`xl:`/`2xl:`) ne disparaît pas silencieusement par éviction tailwind-merge
 * ou par typo, et que les paliers mobiles/desktop ne régressent pas.
 */

function classOf(node: HTMLElement | null): string {
  return node?.getAttribute('class') ?? '';
}

describe('<PageContainer>', () => {
  it('rend un <main> par défaut avec le padding responsive partagé', () => {
    const { container } = render(<PageContainer>hello</PageContainer>);
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    const cls = classOf(main);
    expect(cls).toContain('relative');
    expect(cls).toContain('z-10');
    expect(cls).toContain('mx-auto');
    expect(cls).toContain('w-full');
    expect(cls).toContain('px-4');
    expect(cls).toContain('py-8');
    expect(cls).toContain('sm:px-6');
    expect(cls).toContain('lg:px-8');
  });

  it('applique par défaut le palier `content` (860 → 1080 → 1320)', () => {
    const { container } = render(<PageContainer>x</PageContainer>);
    const cls = classOf(container.querySelector('main'));
    expect(cls).toContain('max-w-[860px]');
    expect(cls).toContain('xl:max-w-[1080px]');
    expect(cls).toContain('2xl:max-w-[1320px]');
  });

  // Chaque palier : largeur de base (mobile→lg) + paliers d'élargissement exacts.
  const WIDTH_EXPECTATIONS: Record<PageWidth, string[]> = {
    narrow: ['max-w-[460px]'],
    prose: ['max-w-[760px]', 'xl:max-w-[920px]', '2xl:max-w-[1040px]'],
    content: ['max-w-[860px]', 'xl:max-w-[1080px]', '2xl:max-w-[1320px]'],
    wide: ['max-w-[960px]', 'xl:max-w-[1160px]', '2xl:max-w-[1360px]'],
    xwide: ['max-w-[1280px]', '2xl:max-w-[1536px]'],
  };

  for (const [width, expected] of Object.entries(WIDTH_EXPECTATIONS) as [
    PageWidth,
    string[],
  ][]) {
    it(`palier \`${width}\` rend exactement ${expected.join(' ')}`, () => {
      const { container } = render(<PageContainer width={width}>x</PageContainer>);
      const cls = classOf(container.querySelector('main'));
      for (const token of expected) {
        expect(cls).toContain(token);
      }
    });
  }

  it('honore `as` pour changer la balise', () => {
    const { container } = render(
      <PageContainer as="section">x</PageContainer>,
    );
    expect(container.querySelector('section')).not.toBeNull();
    expect(container.querySelector('main')).toBeNull();
  });

  it('fusionne la className appelante et transmet les props HTML', () => {
    const { container } = render(
      <PageContainer className="pb-32" aria-label="Zone">
        x
      </PageContainer>,
    );
    const main = container.querySelector('main');
    const cls = classOf(main);
    expect(cls).toContain('pb-32');
    // le padding vertical de base reste, la className ajoute le sien
    expect(cls).toContain('py-8');
    expect(main?.getAttribute('aria-label')).toBe('Zone');
  });
});
