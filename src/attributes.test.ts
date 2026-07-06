import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';

defineControls();

type Ctl = HTMLElement & { value: number };

function make(tag: string, attrs: Record<string, string> = {}): Ctl {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el as Ctl;
}

function drag(el: HTMLElement, fromY: number, toY: number): void {
  el.dispatchEvent(new MouseEvent('pointerdown', { clientY: fromY, bubbles: true, cancelable: true }));
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: toY }));
  window.dispatchEvent(new MouseEvent('pointerup', {}));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('attribut label', () => {
  it('sert d’aria-label par défaut', () => {
    const k = make('pt-knob', { label: 'Aigus' });
    expect(k.getAttribute('aria-label')).toBe('Aigus');
  });

  it('ne remplace pas un aria-label explicite', () => {
    const k = make('pt-knob', { label: 'Aigus', 'aria-label': 'EQ aigus deck A' });
    expect(k.getAttribute('aria-label')).toBe('EQ aigus deck A');
  });

  it('affiche le texte du label dans le shadow DOM', () => {
    const k = make('pt-knob', { label: 'HI' });
    expect(k.shadowRoot?.textContent).toContain('HI');
  });
});

describe('attribut unit', () => {
  it('compose aria-valuetext avec l’unité', () => {
    const k = make('pt-knob', { min: '-12', max: '12', value: '6', unit: 'dB' });
    expect(k.getAttribute('aria-valuetext')).toBe('6 dB');
    k.value = -3;
    expect(k.getAttribute('aria-valuetext')).toBe('-3 dB');
  });
});

describe('attribut disabled', () => {
  it('bloque le drag, la molette et le clavier', () => {
    const k = make('pt-knob', { min: '0', max: '1', value: '0.5', disabled: '' });
    drag(k, 100, 50);
    k.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }));
    k.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(k.value).toBe(0.5);
    expect(k.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('attribut step', () => {
  it('remplace le pas clavier/molette par défaut', () => {
    const k = make('pt-knob', { min: '0', max: '100', value: '50', step: '5' });
    k.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(k.value).toBe(55);
  });
});

describe('attribut sensitivity', () => {
  it('règle le nombre de pixels pour la pleine course', () => {
    const k = make('pt-knob', { min: '0', max: '1', value: '0', sensitivity: '100' });
    drag(k, 100, 50); // 50 px sur 100 = moitié de la course
    expect(k.value).toBeCloseTo(0.5, 5);
  });
});

describe('attribut curve', () => {
  it('log : le milieu de la course vaut le quart de la plage (taper audio)', () => {
    const f = make('pt-fader', { min: '0', max: '1', value: '0', curve: 'log' });
    drag(f, 200, 100); // moitié de la course en position
    expect(f.value).toBeCloseTo(0.25, 5);
  });

  it('lin par défaut : le milieu de la course vaut la moitié de la plage', () => {
    const f = make('pt-fader', { min: '0', max: '1', value: '0' });
    drag(f, 200, 100);
    expect(f.value).toBeCloseTo(0.5, 5);
  });
});
