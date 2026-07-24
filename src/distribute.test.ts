import { describe, expect, it } from 'vitest';
import { adjust, equalize, normalize, type MixConstraints } from './distribute.js';

const free = (n: number): boolean[] => Array(n).fill(false);
const c = (total: number, locked: boolean[], step?: number): MixConstraints => ({ total, locked, step });
const sum = (v: number[]): number => v.reduce((a, b) => a + b, 0);

describe('normalize', () => {
  it('remet les valeurs à l’échelle pour atteindre le total', () => {
    expect(normalize([2, 2], c(10, free(2)))).toEqual([5, 5]);
  });

  it('partage également quand toutes les valeurs sont nulles ou absentes', () => {
    expect(normalize([null, null, null, null], c(100, free(4)))).toEqual([25, 25, 25, 25]);
    expect(normalize([0, 0], c(10, free(2)))).toEqual([5, 5]);
  });

  it('conserve les valeurs fournies et partage le restant entre les pistes sans value', () => {
    expect(normalize([4, null, null], c(10, free(3)))).toEqual([4, 3, 3]);
  });

  it('réduit au prorata si les valeurs fournies dépassent le total', () => {
    expect(normalize([15, 5, null], c(10, free(3)))).toEqual([7.5, 2.5, 0]);
  });

  it('arrondit au step avec somme exacte', () => {
    const out = normalize([null, null, null], c(10, free(3), 1));
    expect(out.every((v) => Number.isInteger(v))).toBe(true);
    expect(sum(out)).toBe(10);
  });

  it('total 0 → tout à zéro', () => {
    expect(normalize([3, null], c(0, free(2)))).toEqual([0, 0]);
  });
});

describe('adjust mode prop', () => {
  it('compense au prorata des valeurs', () => {
    const out = adjust([4, 4, 2], 0, 6, 'prop', c(10, free(3)));
    expect(out[0]).toBe(6);
    expect(out[1]).toBeCloseTo(8 / 3, 9);
    expect(out[2]).toBeCloseTo(4 / 3, 9);
  });

  it('une piste à 0 reste à 0', () => {
    expect(adjust([5, 5, 0], 0, 7, 'prop', c(10, free(3)))).toEqual([7, 3, 0]);
  });

  it('en baisse, les autres gagnent au prorata', () => {
    expect(adjust([6, 3, 1], 0, 2, 'prop', c(10, free(3)))).toEqual([2, 6, 2]);
  });

  it('en baisse avec toutes les autres à 0, partage égal (repli)', () => {
    expect(adjust([10, 0, 0], 0, 4, 'prop', c(10, free(3)))).toEqual([4, 3, 3]);
  });

  it('clampe au disponible quand des pistes sont verrouillées', () => {
    expect(adjust([4, 4, 2], 0, 9, 'prop', c(10, [false, true, false]))).toEqual([6, 4, 0]);
  });

  it('piste verrouillée : aucun mouvement', () => {
    expect(adjust([4, 6], 0, 9, 'prop', c(10, [true, false]))).toEqual([4, 6]);
  });

  it('toutes les autres verrouillées : bloquée', () => {
    expect(adjust([4, 6], 0, 9, 'prop', c(10, [false, true]))).toEqual([4, 6]);
  });

  it('la somme reste le total', () => {
    const out = adjust([1, 2, 3, 4], 2, 0.5, 'prop', c(10, free(4)));
    expect(sum(out)).toBeCloseTo(10, 9);
  });
});

describe('adjust mode equal', () => {
  it('répartit également la différence', () => {
    expect(adjust([4, 4, 2], 0, 6, 'equal', c(10, free(3)))).toEqual([6, 3, 1]);
  });

  it('clampe à 0 et redistribue le surplus', () => {
    expect(adjust([4, 5, 1], 0, 8, 'equal', c(10, free(3)))).toEqual([8, 2, 0]);
  });

  it('en baisse, distribue également', () => {
    expect(adjust([6, 2, 2], 0, 2, 'equal', c(10, free(3)))).toEqual([2, 4, 4]);
  });
});

describe('adjust mode cascade', () => {
  it('puise dans la piste suivante d’abord', () => {
    expect(adjust([2, 5, 3], 0, 5, 'cascade', c(10, free(3)))).toEqual([5, 2, 3]);
  });

  it('épuise puis passe à la suivante', () => {
    expect(adjust([2, 3, 5], 0, 8, 'cascade', c(10, free(3)))).toEqual([8, 0, 2]);
  });

  it('saute les pistes verrouillées', () => {
    expect(adjust([2, 3, 5], 0, 5, 'cascade', c(10, [false, true, false]))).toEqual([5, 3, 2]);
  });

  it('en baisse, verse dans la piste suivante', () => {
    expect(adjust([5, 2, 3], 0, 1, 'cascade', c(10, free(3)))).toEqual([1, 6, 3]);
  });
});

describe('step et somme exacte', () => {
  it('somme exacte en entiers (points de skill)', () => {
    const out = adjust([3, 3, 4], 0, 5, 'prop', c(10, free(3), 1));
    expect(out.every((v) => Number.isInteger(v))).toBe(true);
    expect(sum(out)).toBe(10);
  });

  it('somme exacte en centimes', () => {
    const out = adjust([3.33, 3.33, 3.34], 0, 5, 'prop', c(10, free(3), 0.01));
    expect(sum(out)).toBeCloseTo(10, 9);
    for (const v of out) expect(Math.round(v * 100) / 100).toBeCloseTo(v, 9);
  });
});

describe('equalize', () => {
  it('répartit également le disponible entre pistes libres', () => {
    const out = equalize([7, 2, 1], c(10, free(3)));
    for (const v of out) expect(v).toBeCloseTo(10 / 3, 9);
  });

  it('respecte les pistes verrouillées', () => {
    expect(equalize([4, 4, 2], c(10, [false, true, false]))).toEqual([3, 4, 3]);
  });

  it('cas dégénéré : une seule piste', () => {
    expect(equalize([10], c(10, free(1)))).toEqual([10]);
  });
});
