import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';

defineControls();

function makeKnob(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('pt-knob');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

type Ctl = HTMLElement & { value: number };

function drag(el: HTMLElement, opts: { fromY?: number; toY: number; shift?: boolean }): void {
  el.dispatchEvent(
    new MouseEvent('pointerdown', { clientY: opts.fromY ?? 100, bubbles: true, cancelable: true }),
  );
  window.dispatchEvent(
    new MouseEvent('pointermove', { clientY: opts.toY, shiftKey: opts.shift ?? false }),
  );
  window.dispatchEvent(new MouseEvent('pointerup', {}));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pt-knob — attributs et ARIA', () => {
  it('est enregistré comme custom element', () => {
    expect(customElements.get('pt-knob')).toBeDefined();
  });

  it('expose min/max/value par défaut (0..1, valeur au centre)', () => {
    const k = makeKnob() as Ctl;
    expect(k.value).toBe(0.5);
  });

  it('lit min/max/value depuis les attributs', () => {
    const k = makeKnob({ min: '-12', max: '12', value: '3' }) as Ctl;
    expect(k.value).toBe(3);
  });

  it('porte role=slider et aria-valuenow synchronisé', () => {
    const k = makeKnob({ min: '0', max: '10', value: '4' }) as Ctl;
    expect(k.getAttribute('role')).toBe('slider');
    expect(k.getAttribute('aria-valuenow')).toBe('4');
    k.value = 7;
    expect(k.getAttribute('aria-valuenow')).toBe('7');
  });

  it('clampe la valeur dans [min, max]', () => {
    const k = makeKnob({ min: '0', max: '10', value: '4' }) as Ctl;
    k.value = 99;
    expect(k.value).toBe(10);
    k.value = -5;
    expect(k.value).toBe(0);
  });
});

describe('pt-knob — drag vertical', () => {
  it('augmente la valeur en glissant vers le haut (200 px = pleine course)', () => {
    const k = makeKnob({ min: '0', max: '1', value: '0.5' }) as Ctl;
    drag(k, { fromY: 100, toY: 50 }); // 50 px vers le haut = +25 % de course
    expect(k.value).toBeCloseTo(0.75, 5);
  });

  it('diminue la valeur en glissant vers le bas', () => {
    const k = makeKnob({ min: '0', max: '1', value: '0.5' }) as Ctl;
    drag(k, { fromY: 100, toY: 200 });
    expect(k.value).toBe(0); // clampé
  });

  it('divise la sensibilité par 10 avec Shift', () => {
    const k = makeKnob({ min: '0', max: '1', value: '0.5' }) as Ctl;
    drag(k, { fromY: 100, toY: 50, shift: true });
    expect(k.value).toBeCloseTo(0.525, 5);
  });

  it('émet input pendant le drag et change au relâchement', () => {
    const k = makeKnob({ min: '0', max: '1', value: '0.5' }) as Ctl;
    const events: string[] = [];
    k.addEventListener('input', () => events.push('input'));
    k.addEventListener('change', () => events.push('change'));
    drag(k, { fromY: 100, toY: 80 });
    expect(events).toEqual(['input', 'change']);
  });
});

describe('pt-knob — reset, clavier, molette', () => {
  it('revient à la valeur par défaut au double-clic', () => {
    const k = makeKnob({ min: '-12', max: '12', value: '8', default: '0' }) as Ctl;
    k.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(k.value).toBe(0);
  });

  it('répond aux flèches clavier par pas de 1 % de la course', () => {
    const k = makeKnob({ min: '0', max: '100', value: '50' }) as Ctl;
    k.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(k.value).toBe(51);
    k.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    k.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(k.value).toBe(49);
  });

  it('va à min/max avec Home/End', () => {
    const k = makeKnob({ min: '0', max: '100', value: '50' }) as Ctl;
    k.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(k.value).toBe(0);
    k.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(k.value).toBe(100);
  });

  it('réagit à la molette par incréments fins', () => {
    const k = makeKnob({ min: '0', max: '100', value: '50' }) as Ctl;
    k.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }));
    expect(k.value).toBe(51);
    k.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }));
    expect(k.value).toBe(50);
  });
});
