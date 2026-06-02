import { useCallback, useState } from 'react';

import type {
  Ancestry,
  Background,
  Feat,
  Invocation,
  Item,
  Spell,
  Subancestry,
  Subclass,
} from '@/shared/types/content';
import type { CustomContentPack } from '@/shared/types/custom-content-pack';

/**
 * État local du PackEditor (JALON 3C.1+) — un brouillon de pack en cours de
 * création. La forme distingue les champs scalaires (id, version, author) des
 * objets i18n éclatés en deux strings (`*Fr` / `*En`) pour rester compatible
 * avec les inputs natifs.
 *
 * 3C.1 wire `feats`. 3C.2 ajoute `invocations`. 3C.3 ajoute `subancestries`.
 * 3C.4 ajoute `backgrounds`. 3C.5 ajoute `subclasses`. 3C.6 ajoute `spells`.
 * 3C.7 ajoute `items`. 3C.8 ajoute `ancestries`. Les autres tableaux restent
 * vides ; le sous-jalon 3C.9 ajoutera `classes`. La validation Zod
 * (`parsePack`) tolère des tableaux vides tant qu'AU MOINS un tableau est non
 * vide.
 */
export interface PackBuilderState {
  meta: {
    id: string;
    nameFr: string;
    nameEn: string;
    author: string;
    version: string;
    descriptionFr: string;
    descriptionEn: string;
  };
  feats: Feat[];
  invocations: Invocation[];
  subancestries: Subancestry[];
  backgrounds: Background[];
  subclasses: Subclass[];
  spells: Spell[];
  items: Item[];
  ancestries: Ancestry[];
}

export const EMPTY_PACK_BUILDER_STATE: PackBuilderState = {
  meta: {
    id: '',
    nameFr: '',
    nameEn: '',
    author: '',
    version: '1.0.0',
    descriptionFr: '',
    descriptionEn: '',
  },
  feats: [],
  invocations: [],
  subancestries: [],
  backgrounds: [],
  subclasses: [],
  spells: [],
  items: [],
  ancestries: [],
};

/**
 * Sérialise l'état builder en candidat `CustomContentPack` prêt pour
 * `parseCustomContentPack`. `createdAt` est posé au moment du save (ISO 8601
 * UTC, sans millisecondes — c'est ce que `ISO_DATE_REGEX` accepte).
 */
export function packFromBuilderState(
  state: PackBuilderState,
  now: Date = new Date(),
): CustomContentPack {
  const createdAt = now.toISOString().replace(/\.\d+Z$/, 'Z');
  const meta: CustomContentPack['meta'] = {
    id: state.meta.id.trim(),
    name: {
      fr: state.meta.nameFr.trim(),
      ...(state.meta.nameEn.trim() ? { en: state.meta.nameEn.trim() } : {}),
    },
    version: state.meta.version.trim(),
    author: state.meta.author.trim(),
    createdAt,
    ...(state.meta.descriptionFr.trim()
      ? {
          description: {
            fr: state.meta.descriptionFr.trim(),
            ...(state.meta.descriptionEn.trim()
              ? { en: state.meta.descriptionEn.trim() }
              : {}),
          },
        }
      : {}),
  };
  return {
    meta,
    entities: {
      feats: state.feats.length > 0 ? state.feats : undefined,
      invocations:
        state.invocations.length > 0 ? state.invocations : undefined,
      subancestries:
        state.subancestries.length > 0 ? state.subancestries : undefined,
      backgrounds:
        state.backgrounds.length > 0 ? state.backgrounds : undefined,
      subclasses:
        state.subclasses.length > 0 ? state.subclasses : undefined,
      spells: state.spells.length > 0 ? state.spells : undefined,
      items: state.items.length > 0 ? state.items : undefined,
      ancestries:
        state.ancestries.length > 0 ? state.ancestries : undefined,
    },
  } as CustomContentPack;
}

interface UsePackBuilderApi {
  state: PackBuilderState;
  setMetaField: <K extends keyof PackBuilderState['meta']>(
    key: K,
    value: PackBuilderState['meta'][K],
  ) => void;
  addFeat: (feat: Feat) => void;
  removeFeat: (id: string) => void;
  addInvocation: (invocation: Invocation) => void;
  removeInvocation: (id: string) => void;
  addSubancestry: (subancestry: Subancestry) => void;
  removeSubancestry: (id: string) => void;
  addBackground: (background: Background) => void;
  removeBackground: (id: string) => void;
  addSubclass: (subclass: Subclass) => void;
  removeSubclass: (id: string) => void;
  addSpell: (spell: Spell) => void;
  removeSpell: (id: string) => void;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  addAncestry: (ancestry: Ancestry) => void;
  removeAncestry: (id: string) => void;
  reset: () => void;
}

export function usePackBuilder(
  initial: PackBuilderState = EMPTY_PACK_BUILDER_STATE,
): UsePackBuilderApi {
  const [state, setState] = useState<PackBuilderState>(initial);

  const setMetaField = useCallback(
    <K extends keyof PackBuilderState['meta']>(
      key: K,
      value: PackBuilderState['meta'][K],
    ): void => {
      setState((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
    },
    [],
  );

  const addFeat = useCallback((feat: Feat): void => {
    setState((prev) => {
      const next = prev.feats.filter((existing) => existing.id !== feat.id);
      return { ...prev, feats: [...next, feat] };
    });
  }, []);

  const removeFeat = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      feats: prev.feats.filter((feat) => feat.id !== id),
    }));
  }, []);

  const addInvocation = useCallback((invocation: Invocation): void => {
    setState((prev) => {
      const next = prev.invocations.filter(
        (existing) => existing.id !== invocation.id,
      );
      return { ...prev, invocations: [...next, invocation] };
    });
  }, []);

  const removeInvocation = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      invocations: prev.invocations.filter((inv) => inv.id !== id),
    }));
  }, []);

  const addSubancestry = useCallback((subancestry: Subancestry): void => {
    setState((prev) => {
      const next = prev.subancestries.filter(
        (existing) => existing.id !== subancestry.id,
      );
      return { ...prev, subancestries: [...next, subancestry] };
    });
  }, []);

  const removeSubancestry = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      subancestries: prev.subancestries.filter((sub) => sub.id !== id),
    }));
  }, []);

  const addBackground = useCallback((background: Background): void => {
    setState((prev) => {
      const next = prev.backgrounds.filter(
        (existing) => existing.id !== background.id,
      );
      return { ...prev, backgrounds: [...next, background] };
    });
  }, []);

  const removeBackground = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      backgrounds: prev.backgrounds.filter((bg) => bg.id !== id),
    }));
  }, []);

  const addSubclass = useCallback((subclass: Subclass): void => {
    setState((prev) => {
      const next = prev.subclasses.filter(
        (existing) => existing.id !== subclass.id,
      );
      return { ...prev, subclasses: [...next, subclass] };
    });
  }, []);

  const removeSubclass = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      subclasses: prev.subclasses.filter((sc) => sc.id !== id),
    }));
  }, []);

  const addSpell = useCallback((spell: Spell): void => {
    setState((prev) => {
      const next = prev.spells.filter((existing) => existing.id !== spell.id);
      return { ...prev, spells: [...next, spell] };
    });
  }, []);

  const removeSpell = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      spells: prev.spells.filter((sp) => sp.id !== id),
    }));
  }, []);

  const addItem = useCallback((item: Item): void => {
    setState((prev) => {
      const next = prev.items.filter((existing) => existing.id !== item.id);
      return { ...prev, items: [...next, item] };
    });
  }, []);

  const removeItem = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  }, []);

  const addAncestry = useCallback((ancestry: Ancestry): void => {
    setState((prev) => {
      const next = prev.ancestries.filter(
        (existing) => existing.id !== ancestry.id,
      );
      return { ...prev, ancestries: [...next, ancestry] };
    });
  }, []);

  const removeAncestry = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      ancestries: prev.ancestries.filter((a) => a.id !== id),
    }));
  }, []);

  const reset = useCallback((): void => {
    setState(initial);
  }, [initial]);

  return {
    state,
    setMetaField,
    addFeat,
    removeFeat,
    addInvocation,
    removeInvocation,
    addSubancestry,
    removeSubancestry,
    addBackground,
    removeBackground,
    addSubclass,
    removeSubclass,
    addSpell,
    removeSpell,
    addItem,
    removeItem,
    addAncestry,
    removeAncestry,
    reset,
  };
}
