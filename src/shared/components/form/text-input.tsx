import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { inputBaseClasses } from './input-base';

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

interface TextInputProps extends NativeProps {
  /** `text` par défaut, `email` ou `search` quand nécessaire. */
  type?: 'text' | 'email' | 'search';
}

/**
 * Input texte unifié — seul point d'entrée pour `<input type=text|email|search>`
 * dans l'app. Le bug "texte blanc sur fond blanc" (plan 05 §0.3) ne peut plus
 * réapparaître tant qu'aucun `<input>` natif n'est utilisé hors du form-kit.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { type = 'text', className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(inputBaseClasses, 'font-serif text-body', className)}
      {...rest}
    />
  );
});
