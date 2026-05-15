/**
 * Sprite SVG masqué — monté une fois en haut de l'arbre <App />, après quoi
 * <Icon name="i-flame" /> peut référencer n'importe quel symbole via <use href>.
 *
 * Copie verbatim des paths du prototype `prototype/grimwar.html`. Si on touche
 * à un path, garder synchro avec le prototype pour rester fidèle au visuel cible.
 */
export function IconSprite(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'none' }}
    >
      <defs>
        {/* Caractéristiques (FOR/DEX/CON/INT/SAG/CHA) */}
        <symbol id="i-for" viewBox="0 0 24 24">
          <path d="M5 13L12 6L19 13M8 19V11M16 19V11M6 19H18" />
        </symbol>
        <symbol id="i-dex" viewBox="0 0 24 24">
          <path d="M19 5C18 9 14 13 9 16C7 17 5 18 5 18M5 18L8 18M5 18V15M19 5L13 11M16 8L9 15" />
        </symbol>
        <symbol id="i-con" viewBox="0 0 24 24">
          <path d="M12 3L20 6V12C20 16.5 16.5 20 12 21C7.5 20 4 16.5 4 12V6L12 3Z" />
          <path d="M9 12L11 14L15 10" />
        </symbol>
        <symbol id="i-int" viewBox="0 0 24 24">
          <path d="M4 5C4 4 5 3 6 3H18C19 3 20 4 20 5V19C20 20 19 21 18 21H6C5 21 4 20 4 19V5Z" />
          <path d="M4 5C4 6 5 7 6 7H20" />
          <path d="M8 11H16M8 15H14" />
        </symbol>
        <symbol id="i-sag" viewBox="0 0 24 24">
          <path d="M21 12.5C21 17 17 21 12 21C7 21 3 17 3 12.5C3 8 7 4 12 4C14 4 16 4.5 17 5.5C15 5.5 13 7 13 9C13 11.5 16 12 18 11C19.5 10.5 20.5 11.5 21 12.5Z" />
        </symbol>
        <symbol id="i-cha" viewBox="0 0 24 24">
          <path d="M12 21C16 21 19 18 19 14C19 12 18 10 17 9C17 11 16 12 14 12C15 8 13 5 10 3C11 6 9 8 7 10C5 11 4 13 4 15C4 18 7 21 12 21Z" />
        </symbol>

        {/* Vitalité / combat */}
        <symbol id="i-init" viewBox="0 0 24 24">
          <path d="M13 3L4 14H11L10 21L19 10H12L13 3Z" />
        </symbol>
        <symbol id="i-ac" viewBox="0 0 24 24">
          <path d="M12 3L20 6V12C20 16.5 16.5 20 12 21C7.5 20 4 16.5 4 12V6L12 3Z" />
        </symbol>
        <symbol id="i-speed" viewBox="0 0 24 24">
          <path d="M5 12H19M19 12L13 6M19 12L13 18" />
        </symbol>
        <symbol id="i-spell" viewBox="0 0 24 24">
          <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z" />
        </symbol>

        {/* Armes */}
        <symbol id="i-sword" viewBox="0 0 24 24">
          <path d="M19 3L14 8L18 12L21 9L19 3Z" />
          <path d="M14 8L4 18L6 20L16 10" />
          <path d="M3 19L5 21" />
        </symbol>
        <symbol id="i-bow" viewBox="0 0 24 24">
          <path d="M4 4C4 4 14 6 18 18M4 4C4 4 6 14 18 18" />
          <path d="M14 10L18 6M16 8L19 5" />
        </symbol>
        <symbol id="i-dagger" viewBox="0 0 24 24">
          <path d="M12 3L9 12L12 15L15 12L12 3Z" />
          <path d="M12 15V21M9 18H15" />
        </symbol>
        <symbol id="i-staff" viewBox="0 0 24 24">
          <path d="M6 3L6 21M3 6L9 6M6 3C6 3 7 5 9 6" />
          <circle cx="6" cy="3" r="2" />
        </symbol>

        {/* Magie */}
        <symbol id="i-flame" viewBox="0 0 24 24">
          <path d="M12 2C14 6 16 7 16 11C16 13 15 14 13 14C14 12 14 10 12 10C12 14 8 14 8 18C8 20 10 22 12 22C16 22 18 18 18 14C18 8 14 6 12 2Z" />
        </symbol>
        <symbol id="i-magic" viewBox="0 0 24 24">
          <path d="M12 3L13 9L19 10L13 11L12 17L11 11L5 10L11 9L12 3Z" />
          <circle cx="19" cy="5" r="1.5" />
          <circle cx="5" cy="18" r="1" />
          <circle cx="20" cy="18" r="1" />
        </symbol>

        {/* Divers UI */}
        <symbol id="i-eye" viewBox="0 0 24 24">
          <path d="M2 12C4 7 8 4 12 4C16 4 20 7 22 12C20 17 16 20 12 20C8 20 4 17 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </symbol>
        <symbol id="i-book" viewBox="0 0 24 24">
          <path d="M4 4C4 3 5 2 6 2H18C19 2 20 3 20 4V22L12 18L4 22V4Z" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M12 2L20 5V12C20 16.5 16.5 20 12 22C7.5 20 4 16.5 4 12V5L12 2Z" />
        </symbol>
        <symbol id="i-potion" viewBox="0 0 24 24">
          <path d="M9 3H15M10 3V8L7 13V20C7 21 8 21 9 21H15C16 21 17 21 17 20V13L14 8V3" />
        </symbol>
        <symbol id="i-bag" viewBox="0 0 24 24">
          <path d="M5 8H19L18 21H6L5 8Z" />
          <path d="M9 8V5C9 4 10 3 12 3C14 3 15 4 15 5V8" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21L16 16" />
        </symbol>
        <symbol id="i-dice" viewBox="0 0 24 24">
          <path d="M4 6L12 2L20 6V18L12 22L4 18V6Z" />
          <path d="M4 6L12 10L20 6M12 10V22" />
          <circle cx="8" cy="10" r="0.5" fill="currentColor" />
          <circle cx="16" cy="10" r="0.5" fill="currentColor" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </symbol>
        <symbol id="i-heart" viewBox="0 0 24 24">
          <path d="M12 21C7 17 3 13 3 9C3 6 5 4 8 4C10 4 11 5 12 7C13 5 14 4 16 4C19 4 21 6 21 9C21 13 17 17 12 21Z" />
        </symbol>
        <symbol id="i-plus" viewBox="0 0 24 24">
          <path d="M12 5V19M5 12H19" />
        </symbol>
        <symbol id="i-feather" viewBox="0 0 24 24">
          <path d="M20 4C20 4 16 4 12 8C8 12 8 16 8 16M20 4L4 20M20 4C20 4 18 10 14 14" />
        </symbol>
        <symbol id="i-skull" viewBox="0 0 24 24">
          <path d="M4 11C4 6 7 3 12 3C17 3 20 6 20 11V16C20 17 19 18 18 18V21H15V18H9V21H6V18C5 18 4 17 4 16V11Z" />
          <circle cx="9" cy="12" r="1.5" fill="currentColor" />
          <circle cx="15" cy="12" r="1.5" fill="currentColor" />
        </symbol>
      </defs>
    </svg>
  );
}
