import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';

defineControls();

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pt-button', () => {
  function makeButton(attrs: Record<string, string> = {}) {
    const el = document.createElement('pt-button');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el as HTMLElement & { active: boolean };
  }

  it('bascule active au clic en mode toggle et émet change', () => {
    const b = makeButton({ toggle: '' });
    let changes = 0;
    b.addEventListener('change', () => changes++);
    b.click();
    expect(b.active).toBe(true);
    b.click();
    expect(b.active).toBe(false);
    expect(changes).toBe(2);
  });

  it('reflète l’état dans aria-pressed', () => {
    const b = makeButton({ toggle: '' });
    b.click();
    expect(b.getAttribute('aria-pressed')).toBe('true');
  });

  it('en mode momentané (non-toggle), ne reste pas actif', () => {
    const b = makeButton();
    b.click();
    expect(b.active).toBe(false);
  });
});

describe('pt-vumeter', () => {
  function makeMeter() {
    const el = document.createElement('pt-vumeter');
    document.body.appendChild(el);
    return el as HTMLElement & { level: number; peak: number };
  }

  it('clampe le niveau dans 0..1', () => {
    const m = makeMeter();
    m.level = 1.8;
    expect(m.level).toBe(1);
    m.level = -0.2;
    expect(m.level).toBe(0);
  });

  it('mémorise le pic le plus haut atteint', () => {
    const m = makeMeter();
    m.level = 0.4;
    m.level = 0.9;
    m.level = 0.3;
    expect(m.peak).toBe(0.9);
  });
});
