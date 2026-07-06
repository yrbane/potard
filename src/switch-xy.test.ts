import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';

defineControls();

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pt-switch', () => {
  function makeSwitch(attrs: Record<string, string> = {}) {
    const el = document.createElement('pt-switch');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el as HTMLElement & { checked: boolean };
  }

  it('porte role=switch et aria-checked', () => {
    const s = makeSwitch();
    expect(s.getAttribute('role')).toBe('switch');
    expect(s.getAttribute('aria-checked')).toBe('false');
  });

  it('démarre coché avec l’attribut checked', () => {
    const s = makeSwitch({ checked: '' });
    expect(s.checked).toBe(true);
    expect(s.getAttribute('aria-checked')).toBe('true');
  });

  it('bascule au clic et émet change avec l’état en detail', () => {
    const s = makeSwitch();
    const seen: boolean[] = [];
    s.addEventListener('change', (e) => seen.push((e as CustomEvent<boolean>).detail));
    s.click();
    s.click();
    expect(seen).toEqual([true, false]);
  });

  it('bascule à Espace et Entrée', () => {
    const s = makeSwitch();
    s.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(s.checked).toBe(true);
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(s.checked).toBe(false);
  });

  it('disabled bloque le clic et le clavier', () => {
    const s = makeSwitch({ disabled: '' });
    s.click();
    s.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(s.checked).toBe(false);
  });

  it('label sert d’aria-label', () => {
    const s = makeSwitch({ label: 'Sync' });
    expect(s.getAttribute('aria-label')).toBe('Sync');
  });
});

describe('pt-xy', () => {
  function makeXY(attrs: Record<string, string> = {}) {
    const el = document.createElement('pt-xy');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    const xy = el as HTMLElement & { x: number; y: number };
    // happy-dom n'a pas de layout : on simule une surface de 200×200 en (0,0)
    xy.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0 }) as DOMRect;
    return xy;
  }

  it('démarre au centre par défaut (0.5, 0.5)', () => {
    const p = makeXY();
    expect(p.x).toBe(0.5);
    expect(p.y).toBe(0.5);
  });

  it('lit ses plages et valeurs initiales dans les attributs par axe', () => {
    const p = makeXY({ 'min-x': '-1', 'max-x': '1', 'value-x': '0.5', 'min-y': '0', 'max-y': '10', 'value-y': '2' });
    expect(p.x).toBe(0.5);
    expect(p.y).toBe(2);
  });

  it('le pointeur positionne x/y en absolu (bas-gauche = min)', () => {
    const p = makeXY();
    p.dispatchEvent(new MouseEvent('pointerdown', { clientX: 50, clientY: 150, bubbles: true, cancelable: true }));
    window.dispatchEvent(new MouseEvent('pointerup', {}));
    expect(p.x).toBeCloseTo(0.25, 5);
    expect(p.y).toBeCloseTo(0.25, 5); // y inversé : bas = min
  });

  it('émet input pendant le geste et change au relâchement, avec {x, y} en detail', () => {
    const p = makeXY();
    const events: Array<{ type: string; x: number; y: number }> = [];
    const record = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail;
      events.push({ type: e.type, x: d.x, y: d.y });
    };
    p.addEventListener('input', record);
    p.addEventListener('change', record);
    p.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true, cancelable: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 0 }));
    window.dispatchEvent(new MouseEvent('pointerup', {}));
    expect(events.at(-1)).toEqual({ type: 'change', x: 1, y: 1 });
    expect(events.some((e) => e.type === 'input')).toBe(true);
  });

  it('revient aux valeurs par défaut au double-clic', () => {
    const p = makeXY({ 'default-x': '0.2', 'default-y': '0.8', 'value-x': '1', 'value-y': '1' });
    p.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(p.x).toBe(0.2);
    expect(p.y).toBe(0.8);
  });

  it('se pilote aux flèches clavier (x horizontal, y vertical)', () => {
    const p = makeXY();
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    p.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(p.x).toBeCloseTo(0.51, 5);
    expect(p.y).toBeCloseTo(0.51, 5);
  });

  it('expose la position en aria-valuetext', () => {
    const p = makeXY();
    expect(p.getAttribute('role')).toBe('slider');
    expect(p.getAttribute('aria-valuetext')).toContain('x:');
  });
});
