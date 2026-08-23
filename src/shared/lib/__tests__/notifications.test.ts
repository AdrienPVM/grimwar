import { beforeEach, describe, expect, it } from 'vitest';

import { gameNotificationsEnabled, notifyPlayer } from '../notifications';
import { useDevicePrefsStore } from '../slices/device-prefs-slice';
import { showToast, useToastStore } from '../slices/toast-slice';

/**
 * Couper les notifications de partie coupe les ANNONCES, pas les RÉPONSES.
 *
 * Un joueur qui pose son téléphone à côté de la télé veut le silence des
 * interruptions décidées par d'autres — pas perdre le résultat de son propre
 * jet de dés, ni le bandeau qui lui dit que c'est à lui.
 */

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
  useDevicePrefsStore.setState({ gameNotifications: true });
});

describe('Notifications de partie', () => {
  it('sont annoncées quand le réglage est actif', () => {
    notifyPlayer({ kind: 'info', title: 'Le meneur t’a envoyé un document' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('se taisent quand le joueur les a coupées', () => {
    useDevicePrefsStore.setState({ gameNotifications: false });
    notifyPlayer({ kind: 'info', title: 'Le meneur t’a envoyé un document' });
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('ne bâillonnent PAS les retours du joueur sur ses propres gestes', () => {
    useDevicePrefsStore.setState({ gameNotifications: false });
    showToast({ kind: 'info', title: '17 — Jet d’attaque' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('obéissent au réglage tel qu’il est AU MOMENT de l’annonce', () => {
    // Le réglage n'est pas capturé au montage des écouteurs : le couper en
    // pleine partie doit valoir tout de suite.
    useDevicePrefsStore.setState({ gameNotifications: false });
    notifyPlayer({ kind: 'info', title: 'muet' });
    useDevicePrefsStore.setState({ gameNotifications: true });
    notifyPlayer({ kind: 'info', title: 'entendu' });

    const titles = useToastStore.getState().toasts.map((toast) => toast.title);
    expect(titles).toEqual(['entendu']);
  });

  it('sont actives par défaut — personne n’a à les allumer pour jouer', () => {
    // L'état INITIAL du store, pas celui qu'un test précédent aurait laissé.
    expect(useDevicePrefsStore.getInitialState().gameNotifications).toBe(true);
  });

  it('l’accès hors React lit le même réglage', () => {
    useDevicePrefsStore.setState({ gameNotifications: false });
    expect(gameNotificationsEnabled()).toBe(false);
    useDevicePrefsStore.setState({ gameNotifications: true });
    expect(gameNotificationsEnabled()).toBe(true);
  });
});
