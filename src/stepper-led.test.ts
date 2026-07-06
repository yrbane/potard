import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';

defineControls();

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pt-stepper', () => {
  function makeStepper(attrs: Record<string, string> = {}) {
    const el = document.createElement('pt-stepper');
    for (const [k, v] of Object.entries({ options: 'lin,log,exp', ...attrs })) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el as HTMLElement & { value: string; index: number; next(): void; prev(): void };
  }

  it('démarre sur la première option par défaut', () => {
    const s = makeStepper();
    expect(s.value).toBe('lin');
    expect(s.index).toBe(0);
  });

  it('respecte l’attribut value initial', () => {
    const s = makeStepper({ value: 'log' });
    expect(s.index).toBe(1);
  });

  it('next()/prev() font défiler avec bouclage', () => {
    const s = makeStepper();
    s.next();
    expect(s.value).toBe('log');
    s.next();
    s.next(); // exp → boucle sur lin
    expect(s.value).toBe('lin');
    s.prev(); // boucle arrière sur exp
    expect(s.value).toBe('exp');
  });

  it('émet change avec l’option en detail', () => {
    const s = makeStepper();
    const seen: string[] = [];
    s.addEventListener('change', (e) => seen.push((e as CustomEvent<string>).detail));
    s.next();
    expect(seen).toEqual(['log']);
  });

  it('affiche l’option courante et des boutons ‹ › dans le shadow', () => {
    const s = makeStepper();
    const next = s.shadowRoot?.querySelector('.next') as HTMLElement;
    next.click();
    expect(s.value).toBe('log');
    expect(s.shadowRoot?.textContent).toContain('log');
  });

  it('répond aux flèches clavier', () => {
    const s = makeStepper();
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(s.value).toBe('log');
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(s.value).toBe('lin');
  });
});

describe('pt-led', () => {
  function makeLed(attrs: Record<string, string> = {}) {
    const el = document.createElement('pt-led');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el as HTMLElement & { on: boolean };
  }

  it('est éteinte par défaut, allumée via l’attribut on', () => {
    expect(makeLed().on).toBe(false);
    expect(makeLed({ on: '' }).on).toBe(true);
  });

  it('se pilote par propriété et reflète l’attribut', () => {
    const led = makeLed();
    led.on = true;
    expect(led.hasAttribute('on')).toBe(true);
    led.on = false;
    expect(led.hasAttribute('on')).toBe(false);
  });

  it('est purement décorative (aria-hidden)', () => {
    expect(makeLed().getAttribute('aria-hidden')).toBe('true');
  });
});

describe('pt-vumeter — nouveaux attributs', () => {
  it('accepte segments et orientation', () => {
    const m = document.createElement('pt-vumeter');
    m.setAttribute('segments', '20');
    m.setAttribute('orientation', 'h');
    document.body.appendChild(m);
    const meter = m as HTMLElement & { segments: number; orientation: 'v' | 'h' };
    expect(meter.segments).toBe(20);
    expect(meter.orientation).toBe('h');
  });
});
