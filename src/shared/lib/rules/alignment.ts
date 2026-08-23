import { t, type StringKey } from '@/shared/lib/i18n';

/**
 * Les 9 alignements 5e, en une source unique.
 *
 * Le personnage persiste un CODE (« LB », « N »…), pas un libellé : le champ
 * `alignment` est un `z.string().max(8)` et la traduction se fait à
 * l'affichage. Trois endroits en avaient chacun leur copie — le chooser du
 * wizard, la validation du brouillon, et la fiche (qui, elle, ne traduisait
 * rien du tout et affichait « LB » à l'écran). Une seule liste ici.
 */
export const ALIGNMENT_CODES = [
  'LB',
  'NB',
  'CB',
  'LN',
  'N',
  'CN',
  'LM',
  'NM',
  'CM',
] as const;

export type AlignmentCode = (typeof ALIGNMENT_CODES)[number];

const ALIGNMENT_LABEL_KEYS: Record<AlignmentCode, StringKey> = {
  LB: 'alignment.LB',
  NB: 'alignment.NB',
  CB: 'alignment.CB',
  LN: 'alignment.LN',
  N: 'alignment.N',
  CN: 'alignment.CN',
  LM: 'alignment.LM',
  NM: 'alignment.NM',
  CM: 'alignment.CM',
};

export function isAlignmentCode(value: string): value is AlignmentCode {
  return (ALIGNMENT_CODES as readonly string[]).includes(value);
}

/**
 * Libellé affichable d'un code d'alignement.
 *
 * Repli sur la valeur brute pour un code inconnu : le schéma accepte n'importe
 * quelle chaîne de 8 caractères, et une fiche importée ou éditée à la main ne
 * doit pas afficher du vide là où elle portait quelque chose.
 */
export function alignmentLabel(code: string): string {
  return isAlignmentCode(code) ? t(ALIGNMENT_LABEL_KEYS[code]) : code;
}

/** Options du chooser, libellés résolus au rendu (donc i18n-ready). */
export function alignmentOptions(): { value: string; label: string }[] {
  return ALIGNMENT_CODES.map((code) => ({
    value: code,
    label: t(ALIGNMENT_LABEL_KEYS[code]),
  }));
}
