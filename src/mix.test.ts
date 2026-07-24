import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';
import type { PtMix } from './mix.js';

defineControls();

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

async function makeMix(attrs: string, tracksHtml: string): Promise<PtMix> {
  document.body.innerHTML = `<pt-mix ${attrs}>${tracksHtml}</pt-mix>`;
  await flush();
  return document.querySelector('pt-mix') as PtMix;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pt-mix : initialisation', () => {
  it('normalise les valeurs initiales vers le total', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" value="2"></pt-mix-track><pt-mix-track label="B" value="2"></pt-mix-track>',
    );
    expect(m.values).toEqual([5, 5]);
  });

  it('partage le restant entre pistes sans value', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B"></pt-mix-track><pt-mix-track label="C"></pt-mix-track>',
    );
    expect(m.values).toEqual([4, 3, 3]);
  });

  it('rend un pt-slider par piste dans le shadow DOM', async () => {
    const m = await makeMix(
      'total="100"',
      '<pt-mix-track label="A"></pt-mix-track><pt-mix-track label="B"></pt-mix-track>',
    );
    expect(m.shadowRoot?.querySelectorAll('pt-slider').length).toBe(2);
  });

  it('a le rôle group et l’aria-label du label', async () => {
    const m = await makeMix('total="100" label="Dons"', '<pt-mix-track label="A"></pt-mix-track>');
    expect(m.getAttribute('role')).toBe('group');
    expect(m.getAttribute('aria-label')).toBe('Dons');
  });
});

describe('pt-mix : compensation', () => {
  it('track.value = x compense les autres et garde la somme', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B" value="3"></pt-mix-track><pt-mix-track label="C" value="3"></pt-mix-track>',
    );
    m.tracks[0].value = 6;
    expect(m.values[0]).toBe(6);
    expect(m.values.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 9);
  });

  it('émet input et change avec detail {values, labels, index}', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" value="5"></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>',
    );
    const seen: Array<{ type: string; detail: { values: number[]; labels: string[]; index: number } }> = [];
    m.addEventListener('input', (e) => seen.push({ type: 'input', detail: (e as CustomEvent).detail }));
    m.addEventListener('change', (e) => seen.push({ type: 'change', detail: (e as CustomEvent).detail }));
    m.tracks[0].value = 8;
    expect(seen.map((s) => s.type)).toEqual(['input', 'change']);
    expect(seen[0].detail.labels).toEqual(['A', 'B']);
    expect(seen[0].detail.index).toBe(0);
    expect(seen[0].detail.values).toEqual([8, 2]);
  });

  it('une piste verrouillée ne bouge pas', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B" value="3" locked></pt-mix-track><pt-mix-track label="C" value="3"></pt-mix-track>',
    );
    m.tracks[0].value = 7;
    expect(m.values).toEqual([7, 3, 0]);
  });

  it('respecte le step (somme exacte)', async () => {
    const m = await makeMix(
      'total="10" step="1"',
      '<pt-mix-track label="A" value="3"></pt-mix-track><pt-mix-track label="B" value="3"></pt-mix-track><pt-mix-track label="C" value="4"></pt-mix-track>',
    );
    m.tracks[0].value = 5;
    expect(m.values.every((v) => Number.isInteger(v))).toBe(true);
    expect(m.values.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('interaction directe sur un slider interne compense aussi', async () => {
    const m = await makeMix(
      'total="10" step="1"',
      '<pt-mix-track label="A" value="5"></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>',
    );
    const slider = m.shadowRoot?.querySelectorAll('pt-slider')[0] as HTMLElement;
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(m.values).toEqual([6, 4]);
  });
});

describe('pt-mix : verrouillage via UI', () => {
  it('le cadenas reflète et bascule l’attribut locked', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" value="5"></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>',
    );
    const lock = m.shadowRoot?.querySelectorAll('button.lock')[0] as HTMLButtonElement;
    expect(lock.getAttribute('aria-pressed')).toBe('false');
    lock.click();
    await flush();
    expect(m.tracks[0].locked).toBe(true);
    expect(m.shadowRoot?.querySelectorAll('button.lock')[0]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('le slider d’une piste verrouillée est désactivé', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" value="5" locked></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>',
    );
    const slider = m.shadowRoot?.querySelectorAll('pt-slider')[0] as HTMLElement;
    expect(slider.hasAttribute('disabled')).toBe(true);
  });
});

describe('pt-mix : divers', () => {
  it('affiche valeur + unité par piste', async () => {
    const m = await makeMix(
      'total="10" unit="€" step="1"',
      '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B" value="6"></pt-mix-track>',
    );
    const val = m.shadowRoot?.querySelectorAll('output.val')[0];
    expect(val?.textContent).toBe('4 €');
  });

  it('affiche description et couleur de piste', async () => {
    const m = await makeMix(
      'total="10"',
      '<pt-mix-track label="A" description="Alimentation" color="#ff0000" value="10"></pt-mix-track>',
    );
    expect(m.shadowRoot?.textContent).toContain('Alimentation');
    expect(m.shadowRoot?.querySelector('pt-slider')?.getAttribute('color')).toBe('#ff0000');
  });

  it('ajout dynamique d’une piste → re-normalisation', async () => {
    const m = await makeMix(
      'total="12"',
      '<pt-mix-track label="A" value="6"></pt-mix-track><pt-mix-track label="B" value="6"></pt-mix-track>',
    );
    const t = document.createElement('pt-mix-track');
    t.setAttribute('label', 'C');
    m.appendChild(t);
    await flush();
    expect(m.values.length).toBe(3);
    expect(m.values.reduce((a, b) => a + b, 0)).toBeCloseTo(12, 9);
  });

  it('disabled désactive tous les sliders', async () => {
    const m = await makeMix(
      'total="10" disabled',
      '<pt-mix-track label="A"></pt-mix-track><pt-mix-track label="B"></pt-mix-track>',
    );
    const sliders = m.shadowRoot?.querySelectorAll('pt-slider') ?? [];
    expect(sliders.length).toBe(2);
    for (const s of sliders) expect((s as HTMLElement).hasAttribute('disabled')).toBe(true);
  });
});
