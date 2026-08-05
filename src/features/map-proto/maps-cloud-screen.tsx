import { useCallback, useEffect, useState, type FormEvent, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Tooltip } from '@/shared/components/tooltip';
import { t } from '@/shared/lib/i18n';
import { ensureCampaignExists } from '@/shared/lib/services/campaigns';
import {
  createMap,
  deleteMap,
  type CreateMapInput,
} from '@/shared/lib/services/maps';

import { useIsMapGm } from './use-is-map-gm';
import { useMapsList } from './use-maps-list';

/**
 * Écran de gestion des cartes côté MJ (CHANTIER D phase 2, tracer D.3).
 *
 * Route : `/map-proto/cloud/:cid`. Le `cid` arrive en URL parce que la
 * feature `campaigns/` n'existe pas encore (S2) — pas de selector ici, on
 * mise sur un cid stable dans l'URL (deeplink, bookmark) et `ensureCampaignExists`
 * crée la campagne stub au premier accès si le user signé-in n'est pas
 * encore DM dessus. Les rules `campaigns/{cid}` autorisent `create` pour
 * tout signed-in qui pose `auth.uid in gmIds && createdBy == auth.uid`
 * (firestore.rules — match /campaigns/{campaignId} create).
 *
 * Périmètre PROTOTYPE :
 *   - Liste de cartes via `useMapsList(cid)`.
 *   - Création d'une carte minimale (id slug + name) — les autres champs
 *     du schéma `MapMeta` prennent des défauts sensibles.
 *   - Suppression de carte (bouton inline, pas de confirmation modale).
 *   - PAS d'édition de carte ici — D.4 ouvrira l'écran d'édition live.
 *   - PAS de gestion de tokens / fog / lights : tout ça vit dans la carte
 *     une fois ouverte (D.4+).
 *
 * Chaînes UI passées par `t()` (namespaces `map.common.*` / `map.cloud.*`).
 */

const DEFAULT_GRID_SIZE_PX = 70;
const DEFAULT_FEET_PER_SQUARE = 5;
const SLUG_REGEX = /^[a-z0-9-]+$/;

interface FormState {
  readonly id: string;
  readonly name: string;
}

const EMPTY_FORM: FormState = { id: '', name: '' };

function buildMapInput(name: string): CreateMapInput {
  return {
    name,
    imageUrl: null,
    gridSize: DEFAULT_GRID_SIZE_PX,
    feetPerSquare: DEFAULT_FEET_PER_SQUARE,
    showGrid: true,
    fogEnabled: true,
    lightingEnabled: true,
    fogPolygons: [],
    lightSources: [],
    aoeTemplates: [],
  };
}

export function MapsCloudScreen(): JSX.Element {
  const { cid } = useParams<{ cid: string }>();
  const { user, isReady } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const [ensureDone, setEnsureDone] = useState<boolean>(false);

  // Gate le listener `useMapsList` derrière `ensureDone` — sinon le
  // `onSnapshot` s'abonne avant que la campagne stub soit posée et reçoit
  // permission-denied terminal (les rules sur `campaigns/{cid}/maps` font un
  // `get()` sur le parent qui n'existe pas encore = eval error → deny).
  // Une fois la campagne créée, on passe le `cid` réel et le listener
  // démarre proprement.
  const { maps, isLoading, error } = useMapsList(ensureDone ? cid : undefined);
  // Même gate que la liste : interroger `gmIds` avant que la campagne stub soit
  // posée retournerait « pas meneur » et masquerait la création au MJ.
  const { isGm } = useIsMapGm(ensureDone ? cid : undefined);

  // Crée la campagne stub si absente, dès qu'un utilisateur signé-in arrive.
  useEffect(() => {
    if (!user || !cid) {
      setEnsureDone(false);
      return;
    }
    let cancelled = false;
    ensureCampaignExists(cid, user.uid)
      .then(() => {
        if (!cancelled) {
          setEnsureDone(true);
          setEnsureError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setEnsureError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [user, cid]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (!user || !cid) return;
      const id = form.id.trim();
      const name = form.name.trim();
      if (!id || !SLUG_REGEX.test(id)) {
        setFormError(t('map.common.invalidSlug'));
        return;
      }
      if (!name) {
        setFormError(t('map.common.nameRequired'));
        return;
      }
      setFormError(null);
      setSubmitting(true);
      try {
        await createMap(cid, id, buildMapInput(name), user.uid);
        setForm(EMPTY_FORM);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setFormError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [cid, form, user],
  );

  const handleDelete = useCallback(
    async (mapId: string): Promise<void> => {
      if (!cid) return;
      try {
        await deleteMap(cid, mapId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setFormError(msg);
      }
    },
    [cid],
  );

  if (!cid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="maps-cloud-missing-cid"
          className="font-serif text-sm text-text-secondary"
        >
          {t('map.common.missingCid')}
        </p>
      </main>
    );
  }

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p className="font-serif text-sm text-text-secondary">
          {t('map.common.loading')}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="maps-cloud-signed-out"
          className="font-serif text-sm text-text-secondary"
        >
          {t('map.cloud.signedOut')}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[960px] p-4 sm:p-6">
      <header className="mb-6 border-b border-gold-dim/30 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/campaigns/${cid}`}
            data-testid="maps-cloud-back"
            className="rounded-pill border border-gold-dim/30 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary transition-colors duration-200 ease-base hover:border-gold-bright hover:text-gold-bright"
          >
            ← {t('map.common.backToCampaign')}
          </Link>
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright">
            {t('map.cloud.title')}
          </h1>
          <span className="rounded-pill border border-gold-dim/40 bg-gold/10 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
            {t('map.badge.prototype')}
          </span>
        </div>
        <p
          data-testid="maps-cloud-cid"
          className="mt-2 font-mono text-[11px] text-text-tertiary"
        >
          {t('map.cloud.campaignPrefix')}
          {cid}
        </p>
        {isGm && (
          <Link
            to={`/map-proto/cloud/${cid}/import`}
            data-testid="maps-cloud-import-link"
            className="mt-3 inline-flex items-center gap-2 rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            {t('map.cloud.importLink')}
          </Link>
        )}
        {!isGm && (
          <p
            data-testid="maps-cloud-member-intro"
            className="mt-3 max-w-[70ch] font-serif text-[12px] text-text-tertiary"
          >
            {t('map.cloud.memberIntro')}
          </p>
        )}
        {ensureError && (
          <p
            data-testid="maps-cloud-ensure-error"
            className="mt-2 rounded-md border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-mono text-[11px] text-crimson"
          >
            {t('map.cloud.ensureErrorPrefix')}
            {ensureError}
          </p>
        )}
      </header>

      {/*
        Création, import et suppression sont des gestes de MENEUR. Un joueur
        arrive ici par « Voir la carte » (M34) et ne doit voir qu'une liste de
        consultation — les rules refuseraient l'écriture de toute façon, mais un
        bouton qui échoue est un mensonge d'interface.
      */}
      {isGm && (
      <section
        aria-label={t('map.cloud.createSection')}
        className="mb-6 rounded-lg border border-gold-dim/30 bg-bg-elev/80 p-4"
      >
        <h2 className="mb-3 font-title text-[12px] uppercase tracking-[0.16em] text-gold-bright">
          {t('map.cloud.newMap')}
        </h2>
        <form
          onSubmit={handleSubmit}
          data-testid="maps-cloud-create-form"
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1">
            <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              {t('map.common.slugLabel')}
            </span>
            <input
              type="text"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              placeholder={t('map.cloud.slugPlaceholder')}
              data-testid="maps-cloud-create-id"
              className="w-56 rounded border border-gold-dim/30 bg-bg px-2 py-1 font-mono text-[12px] text-text focus:border-gold-bright focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              {t('map.common.nameLabel')}
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('map.cloud.namePlaceholder')}
              data-testid="maps-cloud-create-name"
              className="w-72 rounded border border-gold-dim/30 bg-bg px-2 py-1 text-[12px] text-text focus:border-gold-bright focus:outline-none"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !ensureDone}
            data-testid="maps-cloud-create-submit"
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            {submitting ? t('map.cloud.creating') : t('map.cloud.create')}
          </button>
        </form>
        {formError && (
          <p
            data-testid="maps-cloud-form-error"
            className="mt-2 font-mono text-[11px] text-crimson"
          >
            {formError}
          </p>
        )}
      </section>
      )}

      {error ? (
        <p
          data-testid="maps-cloud-list-error"
          className="rounded-md border border-crimson/40 bg-crimson/10 px-3 py-2 font-mono text-[11px] text-crimson"
        >
          {t('map.cloud.loadErrorPrefix')}
          {error.message}
        </p>
      ) : isLoading ? (
        <p
          data-testid="maps-cloud-list-loading"
          className="font-serif text-[12px] text-text-tertiary"
        >
          {t('map.cloud.loadingMaps')}
        </p>
      ) : maps.length === 0 ? (
        <p
          data-testid="maps-cloud-empty"
          className="font-serif text-[12px] text-text-tertiary"
        >
          {t(isGm ? 'map.cloud.empty' : 'map.cloud.emptyMember')}
        </p>
      ) : (
        <ul
          aria-label={t('map.cloud.listAria')}
          data-testid="maps-cloud-list"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {maps.map((m) => (
            <li
              key={m.id}
              data-testid={`maps-cloud-card-${m.id}`}
              className="flex items-start justify-between rounded-md border border-gold-dim/30 bg-bg-elev/60 p-3"
            >
              {/* Le joueur va en vue présentation (lecture seule) ; le meneur
                  garde la console d'édition. Deux destinations, une seule
                  carte. */}
              <Link
                to={
                  isGm
                    ? `/map-proto/cloud/${cid}/maps/${m.id}`
                    : `/map-proto/cloud/${cid}/maps/${m.id}/tv`
                }
                data-testid={`maps-cloud-open-${m.id}`}
                className="min-w-0 flex-1"
              >
                <p className="truncate font-title text-[13px] text-gold-bright">{m.name}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-text-tertiary">
                  {m.id}
                </p>
              </Link>
              {isGm && (
                <Tooltip label={t('map.tip.deleteMap')} placement="left" decorative>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(m.id);
                    }}
                    aria-label={`${t('map.common.deletePrefix')} ${m.name}`}
                    data-testid={`maps-cloud-delete-${m.id}`}
                    className="ml-2 rounded-pill border border-gold-dim/30 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary transition-colors duration-200 ease-base hover:border-crimson/60 hover:text-crimson"
                  >
                    {t('map.cloud.delete')}
                  </button>
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
