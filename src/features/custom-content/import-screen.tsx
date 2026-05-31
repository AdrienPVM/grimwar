import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { cn } from '@/shared/lib/cn';
import {
  parseCustomContentPack,
  type PackParseError,
  type PackParseResult,
} from '@/shared/lib/custom-content/parse-pack';
import { t } from '@/shared/lib/i18n';
import {
  deletePack,
  writePack,
} from '@/shared/lib/services/pack-storage';
import { showToast } from '@/shared/lib/slices/toast-slice';
import {
  CUSTOM_CONTENT_PACK_CATEGORIES,
  type CustomContentPackCategory,
} from '@/shared/types/custom-content-pack';

import { usePacks, type PackListEntry } from './use-packs';

/**
 * Écran d'import de packs custom (JALON 3B.4, option γ user-scoped).
 *
 * Flux : drop / picker JSON → JSON.parse → parseCustomContentPack →
 *   - si ok : preview (meta + counts) → bouton « Importer » → writePack
 *   - si erreurs : liste structurée scope/category/index/entityId/field/message
 *
 * Sous le formulaire d'import : liste des packs déjà importés (live via
 * onSnapshot), avec un bouton « Supprimer » par pack.
 *
 * Pré-requis Firestore : rule `users/{uid}/customContentPacks/{packId}`
 * (JALON 3B.3) doit être déployée avant que l'écran soit consommé en prod.
 */

type LocalState =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'invalid-json' }
  | { kind: 'parsed'; result: PackParseResult };

export function ImportScreen(): JSX.Element {
  const { user, isReady } = useAuth();
  const { packs, isLoading } = usePacks();
  const [local, setLocal] = useState<LocalState>({ kind: 'idle' });
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setLocal({ kind: 'parsing' });
    try {
      const text = await readFileAsText(file);
      const json = JSON.parse(text) as unknown;
      const result = parseCustomContentPack(json);
      setLocal({ kind: 'parsed', result });
    } catch {
      // JSON malformé OU lecture fichier impossible — même fallback côté UI
      // (Recommencer suffit). Le validateur Zod ne lève jamais, donc une
      // exception ici ne peut venir que de la couche lecture/parse JSON.
      setLocal({ kind: 'invalid-json' });
    }
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      void handleFile(file);
      event.target.value = '';
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      void handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const reset = useCallback(() => setLocal({ kind: 'idle' }), []);

  const handleImport = useCallback(async () => {
    if (local.kind !== 'parsed' || !local.result.ok || !user) return;
    setIsImporting(true);
    try {
      await writePack(user.uid, local.result.pack);
      showToast({
        kind: 'info',
        title: t('customContent.toast.imported'),
        sub: t('customContent.toast.importedSub').replace(
          '{count}',
          String(local.result.totalEntities),
        ),
      });
      reset();
    } catch (err) {
      showToast({
        kind: 'grim',
        title: t('customContent.toast.error'),
        sub: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsImporting(false);
    }
  }, [local, user, reset]);

  const handleDelete = useCallback(
    async (packId: string) => {
      if (!user) return;
      const confirmMsg = t('customContent.list.deleteConfirm');
      if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return;
      setDeletingId(packId);
      try {
        await deletePack(user.uid, packId);
        showToast({
          kind: 'info',
          title: t('customContent.toast.deleted'),
        });
      } catch (err) {
        showToast({
          kind: 'grim',
          title: t('customContent.toast.error'),
          sub: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setDeletingId(null);
      }
    },
    [user],
  );

  if (!isReady) return <Splash />;

  return (
    <main
      className="relative z-10 mx-auto w-full max-w-[760px] px-4 py-8 sm:px-6"
      data-screen="custom-content-import"
    >
      <header className="text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {t('customContent.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-[48ch] font-serif text-body italic text-text-secondary">
          {t('customContent.subtitle')}
        </p>
        <div className="mt-5">
          <Link
            to="/account/content/new"
            className="inline-flex items-center font-meta text-meta uppercase tracking-[0.18em] text-gold-bright underline-offset-4 transition-opacity duration-150 ease-base hover:underline focus-visible:underline focus-visible:outline-none"
            data-testid="pack-create-link"
          >
            {t('customContent.createLink')}
          </Link>
        </div>
      </header>

      <section className="mt-8" aria-label={t('customContent.dropzone.title')}>
        {local.kind === 'idle' && (
          <DropZone
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onPick={() => fileInputRef.current?.click()}
          />
        )}
        {local.kind === 'parsing' && (
          <GlassPanel className="px-6 py-10 text-center">
            <p className="font-serif text-body italic text-text-secondary">
              …
            </p>
          </GlassPanel>
        )}
        {local.kind === 'invalid-json' && (
          <InvalidJsonCard onReset={reset} />
        )}
        {local.kind === 'parsed' && local.result.ok && (
          <PreviewCard
            result={local.result}
            isImporting={isImporting}
            onImport={() => void handleImport()}
            onCancel={reset}
          />
        )}
        {local.kind === 'parsed' && !local.result.ok && (
          <ErrorsCard errors={local.result.errors} onReset={reset} />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleInputChange}
          className="hidden"
          aria-label={t('customContent.dropzone.cta')}
          data-testid="pack-file-input"
        />
      </section>

      <section className="mt-12" aria-label={t('customContent.list.title')}>
        <h2 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
          {t('customContent.list.title')}
        </h2>
        <Divider className="mt-3" />
        {isLoading ? null : packs.length === 0 ? (
          <p className="mt-6 text-center font-serif text-body-sm italic text-text-secondary">
            {t('customContent.list.empty')}
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {packs.map((pack) => (
              <PackRow
                key={pack.packId}
                pack={pack}
                isDeleting={deletingId === pack.packId}
                onDelete={() => void handleDelete(pack.packId)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

interface DropZoneProps {
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onPick: () => void;
}

function DropZone({ onDrop, onDragOver, onPick }: DropZoneProps): JSX.Element {
  const [isOver, setIsOver] = useState<boolean>(false);
  return (
    <div
      onDrop={(event) => {
        setIsOver(false);
        onDrop(event);
      }}
      onDragOver={(event) => {
        setIsOver(true);
        onDragOver(event);
      }}
      onDragLeave={() => setIsOver(false)}
      className={cn(
        'rounded-card border border-dashed transition-colors duration-200 ease-base',
        'px-6 py-12 text-center',
        isOver
          ? 'border-gold-bright bg-white/[0.06]'
          : 'border-white-8 bg-glass backdrop-blur-xl',
      )}
      data-testid="pack-dropzone"
    >
      <h2 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.dropzone.title')}
      </h2>
      <p className="mx-auto mt-3 max-w-[40ch] font-serif text-body-sm text-text-secondary">
        {t('customContent.dropzone.body')}
      </p>
      <Button variant="secondary" size="md" onClick={onPick} className="mt-6">
        {t('customContent.dropzone.cta')}
      </Button>
    </div>
  );
}

interface PreviewCardProps {
  result: Extract<PackParseResult, { ok: true }>;
  isImporting: boolean;
  onImport: () => void;
  onCancel: () => void;
}

function PreviewCard({
  result,
  isImporting,
  onImport,
  onCancel,
}: PreviewCardProps): JSX.Element {
  const { pack, countByCategory, totalEntities } = result;
  const nonZeroCategories = CUSTOM_CONTENT_PACK_CATEGORIES.filter(
    (cat) => countByCategory[cat] > 0,
  );
  return (
    <GlassPanel className="px-6 py-7" data-testid="pack-preview">
      <h2 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.preview.title')}
      </h2>
      <Divider className="my-4" />
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
            {pack.meta.name.fr}
          </dt>
          <dd className="mt-1 font-serif text-body-sm text-text">
            {pack.meta.id}
          </dd>
        </div>
        <div>
          <dt className="font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.preview.metaAuthor')}
          </dt>
          <dd className="mt-1 font-serif text-body-sm text-text">
            {pack.meta.author}
          </dd>
        </div>
        <div>
          <dt className="font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.preview.metaVersion')}
          </dt>
          <dd className="mt-1 font-serif text-body-sm text-text">
            {pack.meta.version}
          </dd>
        </div>
        <div>
          <dt className="font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.preview.entities')}
          </dt>
          <dd className="mt-1 font-serif text-body-sm text-text">
            {totalEntities}
          </dd>
        </div>
      </dl>
      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="pack-counts">
        {nonZeroCategories.map((cat) => (
          <li
            key={cat}
            className="flex items-center justify-between rounded-card-sm border border-white-8 px-3 py-2"
            data-category={cat}
          >
            <span className="font-serif text-body-sm text-text-secondary">
              {t(categoryKey(cat))}
            </span>
            <span className="font-title text-body text-gold-bright">
              {countByCategory[cat]}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onImport}
          disabled={isImporting}
          data-testid="pack-import-confirm"
        >
          {t('customContent.preview.import')}
        </Button>
        <Button variant="secondary" size="md" onClick={onCancel} disabled={isImporting}>
          {t('customContent.preview.cancel')}
        </Button>
      </div>
    </GlassPanel>
  );
}

interface ErrorsCardProps {
  errors: PackParseError[];
  onReset: () => void;
}

function ErrorsCard({ errors, onReset }: ErrorsCardProps): JSX.Element {
  return (
    <GlassPanel className="px-6 py-7" data-testid="pack-errors">
      <h2 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
        {t('customContent.errors.title')}
      </h2>
      <Divider className="my-4" />
      <ul className="space-y-3">
        {errors.map((err, idx) => (
          <li
            key={`${err.scope}-${err.category ?? 'x'}-${err.index ?? 'x'}-${idx}`}
            className="rounded-card-sm border border-crimson/40 bg-crimson/[0.06] px-4 py-3"
            data-testid="pack-error-row"
          >
            <p className="font-meta text-meta uppercase tracking-[0.18em] text-crimson">
              {scopeLabel(err)}
            </p>
            <p className="mt-1 font-serif text-body-sm text-text">{err.message}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" size="md" onClick={onReset}>
          {t('customContent.errors.retry')}
        </Button>
      </div>
    </GlassPanel>
  );
}

interface InvalidJsonCardProps {
  onReset: () => void;
}

function InvalidJsonCard({ onReset }: InvalidJsonCardProps): JSX.Element {
  return (
    <GlassPanel className="px-6 py-7" data-testid="pack-invalid-json">
      <h2 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
        {t('customContent.errors.title')}
      </h2>
      <Divider className="my-4" />
      <p className="font-serif text-body-sm text-text">
        {t('customContent.errors.parseJson')}
      </p>
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" size="md" onClick={onReset}>
          {t('customContent.errors.retry')}
        </Button>
      </div>
    </GlassPanel>
  );
}

interface PackRowProps {
  pack: PackListEntry;
  isDeleting: boolean;
  onDelete: () => void;
}

function PackRow({ pack, isDeleting, onDelete }: PackRowProps): JSX.Element {
  return (
    <li
      className="flex items-center justify-between gap-4 rounded-card border border-white-8 bg-glass px-4 py-3 backdrop-blur-xl"
      data-testid="pack-row"
      data-pack-id={pack.packId}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-body text-text">
          {pack.meta.name.fr}
        </p>
        <p className="truncate font-meta text-meta uppercase tracking-[0.18em] text-text-secondary">
          {pack.meta.author} · v{pack.meta.version}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={isDeleting}
        data-testid="pack-delete"
      >
        {t('customContent.list.delete')}
      </Button>
    </li>
  );
}

function categoryKey(
  cat: CustomContentPackCategory,
):
  | 'customContent.category.spells'
  | 'customContent.category.classes'
  | 'customContent.category.subclasses'
  | 'customContent.category.ancestries'
  | 'customContent.category.subancestries'
  | 'customContent.category.backgrounds'
  | 'customContent.category.feats'
  | 'customContent.category.invocations'
  | 'customContent.category.items' {
  return `customContent.category.${cat}` as const;
}

/**
 * Lit un `File` comme texte UTF-8. On évite `file.text()` qui est absent
 * de jsdom 25 (et donc casse l'écosystème de tests Vitest) et `FileReader`
 * qui marche partout — y compris dans les vieux navigateurs et en jsdom.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader did not return a string'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsText(file);
  });
}

function scopeLabel(err: PackParseError): string {
  if (err.scope === 'meta') {
    return `${t('customContent.errors.scope.meta')}${err.field ? ` · ${err.field}` : ''}`;
  }
  if (err.scope === 'entity') {
    const parts: string[] = [t('customContent.errors.scope.entity')];
    if (err.category) parts.push(t(categoryKey(err.category)));
    if (err.entityId) parts.push(err.entityId);
    else if (err.index !== null) parts.push(`#${err.index}`);
    if (err.field) parts.push(err.field);
    return parts.join(' · ');
  }
  return t('customContent.errors.scope.root');
}
