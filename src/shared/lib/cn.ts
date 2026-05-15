import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Concatène des classes Tailwind conditionnelles tout en réconciliant les conflits
 * (`px-2 px-4` → `px-4`). Standard projet pour TOUT className conditionnel.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
