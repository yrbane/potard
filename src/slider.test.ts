import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';

defineControls();

type Ctl = HTMLElement & { value: number; color: string };

function make(attrs: Record<string, string> = {}): Ctl {
  const el = document.createElement('pt-slider');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el as Ctl;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pt-slider', () => {
  it('est un slider ARIA horizontal par défaut', () => {
    const s = make();
    expect(s.getAttribute('role')).toBe('slider');
    expect(s.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('passe en vertical via orientation="v"', () => {
    const s = make({ orientation: 'v' });
    expect(s.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('drag horizontal vers la droite augmente la valeur', () => {
    const s = make({ min: '0', max: '1', value: '0.5', sensitivity: '100' });
    s.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, bubbles: true, cancelable: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150 }));
    window.dispatchEvent(new MouseEvent('pointerup', {}));
    expect(s.value).toBeCloseTo(1);
  });

  it('drag vertical vers le haut augmente la valeur en orientation v', () => {
    const s = make({ orientation: 'v', min: '0', max: '1', value: '0.5', sensitivity: '100' });
    s.dispatchEvent(new MouseEvent('pointerdown', { clientY: 200, bubbles: true, cancelable: true }));
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 150 }));
    window.dispatchEvent(new MouseEvent('pointerup', {}));
    expect(s.value).toBeCloseTo(1);
  });

  it('hérite des attributs communs (step, unit, label)', () => {
    const s = make({ min: '0', max: '10', value: '5', step: '1', unit: '€', label: 'Budget' });
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(s.value).toBe(6);
    expect(s.getAttribute('aria-valuetext')).toBe('6 €');
    expect(s.getAttribute('aria-label')).toBe('Budget');
  });

  it('émet input et change', () => {
    const s = make({ min: '0', max: '10', value: '5', step: '1' });
    const events: string[] = [];
    s.addEventListener('input', () => events.push('input'));
    s.addEventListener('change', () => events.push('change'));
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(events).toEqual(['input', 'change']);
  });

  it('expose color (attribut prioritaire sur l’accent)', () => {
    const s = make({ color: '#ff0000' });
    expect(s.color).toBe('#ff0000');
  });
});
