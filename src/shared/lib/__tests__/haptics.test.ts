import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { vibrateForOutcome } from '../haptics';
import { useDevicePrefsStore } from '../slices/device-prefs-slice';
import { showToast } from '../slices/toast-slice';

describe('vibrateForOutcome', () => {
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
      writable: true,
    });
    useDevicePrefsStore.setState({ haptics: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'vibrate');
    useDevicePrefsStore.setState({ haptics: true });
  });

  it('distingue le critique du jet ordinaire par son motif', () => {
    // Toute la valeur du retour haptique est là : sans regarder l'écran, la
    // main doit savoir qu'il s'est passé quelque chose de remarquable.
    vibrateForOutcome('roll');
    const ordinary = vibrate.mock.calls[0]?.[0];
    vibrate.mockClear();
    vibrateForOutcome('crit');
    const crit = vibrate.mock.calls[0]?.[0];

    expect(ordinary).not.toEqual(crit);
    expect(Array.isArray(crit)).toBe(true);
  });

  it("reste muet sur les messages d'application", () => {
    // `info` = « pack enregistré ». Faire vibrer une confirmation transforme la
    // vibration en bruit de fond, et le jour où elle compte on ne la voit plus.
    expect(vibrateForOutcome('info')).toBe(false);
    expect(vibrateForOutcome('grim')).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('respecte la coupure du joueur', () => {
    useDevicePrefsStore.setState({ haptics: false });
    expect(vibrateForOutcome('crit')).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("ne casse pas quand l'appareil ne sait pas vibrer (iOS)", () => {
    Reflect.deleteProperty(navigator, 'vibrate');
    expect(() => vibrateForOutcome('crit')).not.toThrow();
    expect(vibrateForOutcome('crit')).toBe(false);
  });

  it('avale une exception du navigateur plutôt que de casser un jet', () => {
    vibrate.mockImplementation(() => {
      throw new Error('user gesture required');
    });
    expect(() => vibrateForOutcome('roll')).not.toThrow();
    expect(vibrateForOutcome('roll')).toBe(false);
  });

  it('se déclenche depuis la pile de toasts, sans toucher au moteur de dés', () => {
    // Le branchement vit dans `showToast` : tous les chemins de jet — d20,
    // dégâts, chaîne attaque, mode physique — y passent déjà.
    showToast({ kind: 'crit', title: 'Épée longue' });
    expect(vibrate).toHaveBeenCalledTimes(1);

    vibrate.mockClear();
    showToast({ kind: 'info', title: 'Pack enregistré' });
    expect(vibrate).not.toHaveBeenCalled();
  });
});
