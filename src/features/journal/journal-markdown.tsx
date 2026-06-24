import { Fragment, type JSX } from 'react';

/**
 * Renderer Markdown MINIMAL pour le journal compilé (plan 25.2).
 *
 * Le compilateur (25.1) n'émet qu'un sous-ensemble STRICT et connu de Markdown :
 *   - `## Titre`      → titre de section (H2)
 *   - `- texte`       → puce
 *   - `**gras**`      → gras inline
 *   - `_italique_`    → italique inline (utilisé par le repli `journal.empty`)
 *   - lignes simples  → paragraphes (pied d'issue de combat)
 *   - lignes vides    → séparateurs
 *
 * On rend donc ce sous-ensemble nous-mêmes plutôt que d'introduire une
 * dépendance Markdown externe (react-markdown…) — décision documentée plan 25.2
 * (option (a) : zéro dépendance, cohérent avec les notes de séance). Si Adrien
 * veut un jour le rendu Markdown riche (tables, liens, code), une dépendance
 * dédiée sera arbitrée à ce moment.
 *
 * NB : pas de `dangerouslySetInnerHTML` — on construit l'arbre React à la main
 * (le contenu vient du compilateur, mais on n'injecte jamais de HTML brut).
 */
export function JournalMarkdown({ markdown }: { markdown: string }): JSX.Element {
  const lines = markdown.split('\n');
  const blocks: JSX.Element[] = [];
  let bullets: string[] = [];

  const flushBullets = (keyHint: number): void => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${keyHint}`} className="flex flex-col gap-2">
        {items.map((b, i) => (
          <li key={i} className="flex gap-2 font-serif text-body text-text">
            <span aria-hidden className="select-none text-gold/70">
              •
            </span>
            <span>{renderInline(b)}</span>
          </li>
        ))}
      </ul>,
    );
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();

    if (line.startsWith('## ')) {
      flushBullets(idx);
      blocks.push(
        <h2
          key={`h2-${idx}`}
          className="mt-2 font-title text-meta uppercase tracking-[0.18em] text-gold-bright"
        >
          {line.slice(3)}
        </h2>,
      );
      return;
    }

    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      return;
    }

    flushBullets(idx);

    if (line.trim().length === 0) return; // ligne vide = séparateur

    // Paragraphe simple (ex. pied d'issue « Issue : victoire. » ou repli italique).
    blocks.push(
      <p key={`p-${idx}`} className="font-serif text-body-sm text-text-secondary">
        {renderInline(line)}
      </p>,
    );
  });

  flushBullets(lines.length);

  return <div className="flex flex-col gap-4">{blocks}</div>;
}

/**
 * Rend les emphases inline `**gras**` et `_italique_` d'une ligne. On tokenise
 * sur ces deux marqueurs ; tout le reste est du texte brut (pas d'autres
 * marqueurs émis par le compilateur). Les marqueurs imbriqués ne sont pas
 * gérés — le compilateur n'en produit pas.
 */
function renderInline(text: string): JSX.Element {
  // Split en conservant les segments **…** et _…_.
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-text">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('_') && part.endsWith('_')) {
          return (
            <em key={i} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
