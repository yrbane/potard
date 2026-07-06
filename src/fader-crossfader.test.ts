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

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pt-fader', () => {
  it('se contrôle au drag vertical comme un knob', () => {
    const f = make('pt-fader', { min: '0', max: '1', value: '0.5' });
    f.dispatchEvent(new MouseEvent('pointerdown', { clientY: 100, bubbles: true, cancelable: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 0 }));
    window.dispatchEvent(new MouseEvent('pointerup', {}));
    expect(f.value).toBe(1);
  });

  it('revient à sa valeur par défaut au double-clic', () => {
    const f = make('pt-fader', { min: '0', max: '1', value: '0.2', default: '1' });
    f.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(f.value).toBe(1);
  });
});

describe('pt-crossfader', () => {
  it('démarre centré (-1..1, défaut 0)', () => {
    const x = make('pt-crossfader');
    expect(x.value).toBe(0);
  });

  it('se contrôle au drag horizontal (droite = +)', () => {
    const x = make('pt-crossfader');
    x.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, bubbles: true, cancelable: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 200 }));
    window.dispatchEvent(new MouseEvent('pointerup', {}));
    expect(x.value).toBe(1);
  });

  it('revient au centre au double-clic', () => {
    const x = make('pt-crossfader');
    x.value = -0.7;
    x.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(x.value).toBe(0);
  });
});

describe('courbes de crossfade', () => {
  it('constant-power donne des gains égaux au centre (~0.707)', async () => {
    const { crossfadeGains } = await import('./crossfade.js');
    const { a, b } = crossfadeGains(0, 'constant-power');
    expect(a).toBeCloseTo(Math.SQRT1_2, 5);
    expect(b).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it('constant-power coupe totalement le côté opposé aux extrêmes', async () => {
    const { crossfadeGains } = await import('./crossfade.js');
    expect(crossfadeGains(-1, 'constant-power')).toEqual({ a: 1, b: 0 });
    const right = crossfadeGains(1, 'constant-power');
    expect(right.a).toBeCloseTo(0, 5);
    expect(right.b).toBeCloseTo(1, 5);
  });

  it('sharp garde les deux pleins gaz au centre (cut DJ)', async () => {
    const { crossfadeGains } = await import('./crossfade.js');
    expect(crossfadeGains(0, 'sharp')).toEqual({ a: 1, b: 1 });
    expect(crossfadeGains(-1, 'sharp')).toEqual({ a: 1, b: 0 });
  });
});
