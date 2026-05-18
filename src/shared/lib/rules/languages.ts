import type { I18n } from '@/shared/types/content';

/**
 * Langues SRD 5.2.1 — 16 langues canoniques (8 Standard + 8 Rare).
 *
 * Source : SRD 5.2.1 §Languages. Le Common est marqué `standard` mais déjà
 * connu de tous les personnages — pas proposé dans le chooser de langues
 * supplémentaires (filtré côté UI).
 */
export interface LanguageEntry {
  readonly id: string;
  readonly name: I18n;
  readonly tier: 'standard' | 'rare';
  readonly script: string;
}

export const LANGUAGES: readonly LanguageEntry[] = [
  // Standard
  { id: 'common', name: { fr: 'Commun', en: 'Common' }, tier: 'standard', script: 'Common' },
  { id: 'dwarvish', name: { fr: 'Nain', en: 'Dwarvish' }, tier: 'standard', script: 'Dwarvish' },
  { id: 'elvish', name: { fr: 'Elfique', en: 'Elvish' }, tier: 'standard', script: 'Elvish' },
  { id: 'giant', name: { fr: 'Géant', en: 'Giant' }, tier: 'standard', script: 'Dwarvish' },
  { id: 'gnomish', name: { fr: 'Gnome', en: 'Gnomish' }, tier: 'standard', script: 'Dwarvish' },
  { id: 'goblin', name: { fr: 'Gobelin', en: 'Goblin' }, tier: 'standard', script: 'Dwarvish' },
  { id: 'halfling', name: { fr: 'Halfelin', en: 'Halfling' }, tier: 'standard', script: 'Common' },
  { id: 'orc', name: { fr: 'Orc', en: 'Orc' }, tier: 'standard', script: 'Dwarvish' },
  // Rare
  { id: 'abyssal', name: { fr: 'Abyssal', en: 'Abyssal' }, tier: 'rare', script: 'Infernal' },
  { id: 'celestial', name: { fr: 'Céleste', en: 'Celestial' }, tier: 'rare', script: 'Celestial' },
  { id: 'deep-speech', name: { fr: 'Profond', en: 'Deep Speech' }, tier: 'rare', script: '—' },
  { id: 'draconic', name: { fr: 'Drake', en: 'Draconic' }, tier: 'rare', script: 'Draconic' },
  { id: 'infernal', name: { fr: 'Infernal', en: 'Infernal' }, tier: 'rare', script: 'Infernal' },
  { id: 'primordial', name: { fr: 'Primordial', en: 'Primordial' }, tier: 'rare', script: 'Dwarvish' },
  { id: 'sylvan', name: { fr: 'Sylvestre', en: 'Sylvan' }, tier: 'rare', script: 'Elvish' },
  { id: 'undercommon', name: { fr: 'Profond commun', en: 'Undercommon' }, tier: 'rare', script: 'Elvish' },
];

export function getLanguage(id: string): LanguageEntry | undefined {
  return LANGUAGES.find((l) => l.id === id);
}
