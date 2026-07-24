/** Stratégies de compensation d'un groupe de sliders à somme constante. */
export type MixMode = 'prop' | 'equal' | 'cascade';

/** Contraintes du groupe : total à répartir, pistes verrouillées, granularité. */
export interface MixConstraints {
  total: number;
  locked: boolean[];
  /** Granularité ; continu si absent. */
  step?: number | undefined;
}

const EPSILON = 1e-9;

/**
 * Arrondit chaque valeur au step (travail en unités entières de step) ;
 * le reste d'arrondi est absorbé par les pistes libres en partant de la fin,
 * en excluant `keep` (piste manipulée) sauf si elle seule peut absorber.
 */
function snapToStep(values: number[], c: MixConstraints, keep = -1): number[] {
  const { total, locked, step } = c;
  if (!step || step <= 0) return values;
  const units = values.map((v) => Math.round(v / step));
  let diff = Math.round(total / step) - units.reduce((a, b) => a + b, 0);
  const absorb = (i: number): void => {
    const current = units[i] ?? 0;
    const next = Math.max(0, current + diff);
    diff -= next - current;
    units[i] = next;
  };
  for (let i = values.length - 1; i >= 0 && diff !== 0; i--) {
    if (!locked[i] && i !== keep) absorb(i);
  }
  if (diff !== 0 && keep >= 0 && !locked[keep]) absorb(keep);
  return units.map((u) => u * step);
}

/**
 * Normalise les valeurs initiales pour que leur somme atteigne `total` :
 * valeurs fournies remises à l'échelle si besoin, pistes sans valeur (null)
 * se partagent également le restant.
 */
export function normalize(initial: Array<number | null>, c: MixConstraints): number[] {
  const { total } = c;
  const provided = initial.filter((v): v is number => v !== null);
  const sum = provided.reduce((a, b) => a + b, 0);
  const missing = initial.length - provided.length;
  let values: number[];
  if (missing === 0) {
    values =
      sum > EPSILON
        ? initial.map((v) => (v as number) * (total / sum))
        : initial.map(() => total / initial.length);
  } else {
    const scale = sum > total && sum > EPSILON ? total / sum : 1;
    const rest = Math.max(0, total - sum * scale);
    values = initial.map((v) => (v === null ? rest / missing : v * scale));
  }
  return snapToStep(values, c);
}

/**
 * Déplace la piste `index` vers `target` ; les pistes libres compensent selon
 * `mode`. La cible est clampée au disponible (total moins pistes verrouillées).
 * Si aucune piste libre ne peut compenser, rien ne bouge.
 */
export function adjust(
  values: number[],
  index: number,
  target: number,
  mode: MixMode,
  c: MixConstraints,
): number[] {
  const { total, locked } = c;
  if (locked[index]) return [...values];
  const lockedSum = values.reduce((a, v, i) => (locked[i] ? a + v : a), 0);
  const clamped = Math.min(Math.max(target, 0), total - lockedSum);
  const free = values.map((_, i) => i).filter((i) => i !== index && !locked[i]);
  if (free.length === 0) return [...values];
  const next = [...values];
  next[index] = clamped;
  const delta = clamped - (values[index] ?? 0); // > 0 : les autres cèdent, < 0 : elles reçoivent

  if (mode === 'prop') {
    const othersSum = free.reduce((a, i) => a + (values[i] ?? 0), 0);
    if (othersSum > EPSILON) {
      for (const i of free) {
        const v = values[i] ?? 0;
        next[i] = v - delta * (v / othersSum);
      }
    } else if (delta < 0) {
      // toutes les autres à 0 : repli sur un partage égal
      for (const i of free) next[i] = -delta / free.length;
    }
  } else if (mode === 'equal') {
    if (delta <= 0) {
      for (const i of free) next[i] = (next[i] ?? 0) - delta / free.length;
    } else {
      // retire par parts égales, clampe à 0 et redistribue le surplus
      let remaining = delta;
      let pool = free.filter((i) => (next[i] ?? 0) > EPSILON);
      while (remaining > EPSILON && pool.length > 0) {
        const share = remaining / pool.length;
        remaining = 0;
        pool = pool.filter((i) => {
          const current = next[i] ?? 0;
          const take = Math.min(current, share);
          next[i] = current - take;
          remaining += share - take;
          return current - take > EPSILON;
        });
      }
    }
  } else {
    // cascade : on puise dans (ou verse vers) les pistes suivantes, dans l'ordre
    let remaining = delta;
    for (let k = 1; k < values.length && Math.abs(remaining) > EPSILON; k++) {
      const i = (index + k) % values.length;
      if (i === index || locked[i]) continue;
      const current = next[i] ?? 0;
      if (remaining > 0) {
        const take = Math.min(current, remaining);
        next[i] = current - take;
        remaining -= take;
      } else {
        next[i] = current - remaining;
        remaining = 0;
      }
    }
  }
  return snapToStep(next, c, index);
}

/** Répartit également le disponible (total moins verrouillées) entre pistes libres. */
export function equalize(values: number[], c: MixConstraints): number[] {
  const { total, locked } = c;
  const lockedSum = values.reduce((a, v, i) => (locked[i] ? a + v : a), 0);
  const freeCount = locked.filter((l) => !l).length;
  if (freeCount === 0) return [...values];
  const share = (total - lockedSum) / freeCount;
  return snapToStep(values.map((v, i) => (locked[i] ? v : share)), c);
}
