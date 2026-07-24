# pt-slider + pt-mix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter `<pt-slider>` (slider à flèche + piste allumée) et `<pt-mix>`/`<pt-mix-track>` (groupe de sliders à somme constante), démo + README + livraison 0.3.0.

**Architecture:** Logique de répartition pure dans `src/distribute.ts` (sans DOM, testée en isolation). `PtSlider` étend `ContinuousControl` (n'apporte que rendu + orientation). `PtMix` orchestre des `pt-slider` dans son shadow DOM à partir de `pt-mix-track` déclaratifs en light DOM.

**Tech Stack:** TypeScript, Web Components (canvas), vitest + happy-dom, Vite (démo), pnpm.

## Global Constraints

- Spec de référence : `docs/superpowers/specs/2026-07-24-pt-slider-pt-mix-design.md`.
- Code en anglais, **commentaires et commits en français**, aucune mention d'assistant dans les commits.
- **Un seul commit de release** (règle utilisateur : chaque commit = une version SemVer) : code + bump 0.3.0 + CHANGELOG + docs dans le même commit. Pas de commits intermédiaires.
- Tests : `pnpm test` depuis la racine. Build : `pnpm build`. Démo : `pnpm demo:build`.
- `git add` ciblé, jamais `-A`.
- Après push : attendre CI verte (filtrer par SHA, `gh run list --commit` est cassé), puis tag annoté `v0.3.0`, release GitHub avec notes du CHANGELOG, mise à jour vitrines (yrbane/yrbane + yrbane.github.io + captures).

---

### Task 1: `distribute.ts` — logique pure de répartition

**Files:**
- Create: `src/distribute.ts`
- Test: `src/distribute.test.ts`

**Interfaces:**
- Produces:
  - `type MixMode = 'prop' | 'equal' | 'cascade'`
  - `interface MixConstraints { total: number; locked: boolean[]; step?: number }`
  - `normalize(initial: Array<number | null>, c: MixConstraints): number[]`
  - `adjust(values: number[], index: number, target: number, mode: MixMode, c: MixConstraints): number[]`
  - `equalize(values: number[], c: MixConstraints): number[]`

- [ ] **Step 1: Écrire les tests (échec attendu)** — `src/distribute.test.ts` :

```ts
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
    expect(adjust([4, 4, 2], 0, 6, 'prop', c(10, free(3)))).toEqual([6, 8 / 3, 4 / 3]);
  });
  it('une piste à 0 reste à 0', () => {
    const out = adjust([5, 5, 0], 0, 7, 'prop', c(10, free(3)));
    expect(out[2]).toBe(0);
    expect(out).toEqual([7, 3, 0]);
  });
  it('en baisse, les autres gagnent au prorata', () => {
    expect(adjust([6, 3, 1], 0, 2, 'prop', c(10, free(3)))).toEqual([2, 6, 2]);
  });
  it('en baisse avec toutes les autres à 0, partage égal (repli)', () => {
    expect(adjust([10, 0, 0], 0, 4, 'prop', c(10, free(3)))).toEqual([4, 3, 3]);
  });
  it('clampe au disponible quand des pistes sont verrouillées', () => {
    const out = adjust([4, 4, 2], 0, 9, 'prop', c(10, [false, true, false]));
    expect(out[1]).toBe(4);
    expect(out).toEqual([6, 4, 0]);
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
    for (const v of out) expect(Math.round(v * 100)).toBeCloseTo(v * 100, 6);
  });
});

describe('equalize', () => {
  it('répartit également le disponible entre pistes libres', () => {
    expect(equalize([7, 2, 1], c(10, free(3)))).toEqual([10 / 3, 10 / 3, 10 / 3]);
  });
  it('respecte les pistes verrouillées', () => {
    expect(equalize([4, 4, 2], c(10, [false, true, false]))).toEqual([3, 4, 3]);
  });
  it('cas dégénéré : une seule piste', () => {
    expect(equalize([10], c(10, free(1)))).toEqual([10]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `pnpm vitest run src/distribute.test.ts` → FAIL (module inexistant).

- [ ] **Step 3: Implémenter `src/distribute.ts`** :

```ts
/** Stratégies de compensation d'un groupe de sliders à somme constante. */
export type MixMode = 'prop' | 'equal' | 'cascade';

/** Contraintes du groupe : total à répartir, pistes verrouillées, granularité. */
export interface MixConstraints {
  total: number;
  locked: boolean[];
  /** Granularité ; continu si absent. */
  step?: number;
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
    const next = Math.max(0, units[i] + diff);
    diff -= next - units[i];
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
  const delta = clamped - values[index]; // > 0 : les autres cèdent, < 0 : elles reçoivent

  if (mode === 'prop') {
    const othersSum = free.reduce((a, i) => a + values[i], 0);
    if (othersSum > EPSILON) {
      for (const i of free) next[i] = values[i] - delta * (values[i] / othersSum);
    } else if (delta < 0) {
      // toutes les autres à 0 : repli sur un partage égal
      for (const i of free) next[i] = -delta / free.length;
    }
  } else if (mode === 'equal') {
    if (delta <= 0) {
      for (const i of free) next[i] -= delta / free.length;
    } else {
      // retire par parts égales, clampe à 0 et redistribue le surplus
      let remaining = delta;
      let pool = free.filter((i) => next[i] > EPSILON);
      while (remaining > EPSILON && pool.length > 0) {
        const share = remaining / pool.length;
        remaining = 0;
        pool = pool.filter((i) => {
          const take = Math.min(next[i], share);
          next[i] -= take;
          remaining += share - take;
          return next[i] > EPSILON;
        });
      }
    }
  } else {
    // cascade : on puise dans (ou verse vers) les pistes suivantes, dans l'ordre
    let remaining = delta;
    for (let k = 1; k < values.length && Math.abs(remaining) > EPSILON; k++) {
      const i = (index + k) % values.length;
      if (i === index || locked[i]) continue;
      if (remaining > 0) {
        const take = Math.min(next[i], remaining);
        next[i] -= take;
        remaining -= take;
      } else {
        next[i] -= remaining;
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
  const free = values.map((_, i) => i).filter((i) => !locked[i]);
  if (free.length === 0) return [...values];
  const share = (total - lockedSum) / free.length;
  return snapToStep(values.map((v, i) => (locked[i] ? v : share)), c);
}
```

- [ ] **Step 4: Vérifier le succès** — `pnpm vitest run src/distribute.test.ts` → PASS. Ajuster l'implémentation (pas les attentes) si un cas échoue.

### Task 2: `<pt-slider>` — contrôle autonome

**Files:**
- Create: `src/slider.ts`
- Test: `src/slider.test.ts`
- Modify: `src/index.ts` (export + registre `pt-slider`)

**Interfaces:**
- Consumes: `ContinuousControl` (`src/base-control.ts`) — `axis`, `fraction`, `accentColor`, `trackColor`, `renderControl(ctx,w,h)`, attributs communs.
- Produces: classe `PtSlider` avec getters `orientation: 'h' | 'v'` (défaut `'h'`) et `color: string` ; tag `pt-slider` enregistré par `defineControls()`.

- [ ] **Step 1: Écrire les tests** — `src/slider.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';

defineControls();

type Ctl = HTMLElement & { value: number };

function make(attrs: Record<string, string> = {}): Ctl {
  const el = document.createElement('pt-slider');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el as Ctl;
}

function dragX(el: HTMLElement, fromX: number, toX: number): void {
  el.dispatchEvent(new MouseEvent('pointerdown', { clientX: fromX, bubbles: true, cancelable: true }));
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: toX }));
  window.dispatchEvent(new MouseEvent('pointerup', {}));
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
    dragX(s, 100, 150);
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
    const s = make({ color: '#ff0000' }) as Ctl & { color: string };
    expect(s.color).toBe('#ff0000');
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `pnpm vitest run src/slider.test.ts` → FAIL (`pt-slider` non défini).

- [ ] **Step 3: Implémenter `src/slider.ts`** :

```ts
import { ContinuousControl } from './base-control.js';

/**
 * Slider à curseur en flèche : la portion parcourue de la piste est allumée
 * (remplissage lumineux, bipolaire depuis zéro si min < 0 < max).
 * Horizontal par défaut, vertical via `orientation="v"`.
 */
export class PtSlider extends ContinuousControl {
  static override observedAttributes = [...ContinuousControl.observedAttributes, 'orientation', 'color'];

  get orientation(): 'h' | 'v' {
    return this.getAttribute('orientation') === 'v' ? 'v' : 'h';
  }

  /** Teinte du remplissage et de la flèche (attribut `color`, sinon accent du thème). */
  get color(): string {
    return this.getAttribute('color')?.trim() || this.accentColor;
  }

  override connectedCallback(): void {
    this.axis = this.orientation === 'v' ? 'y' : 'x';
    super.connectedCallback();
    this.#syncOrientation();
    const root = this.shadowRoot;
    if (root && !root.querySelector('.slider-style')) {
      const style = document.createElement('style');
      style.className = 'slider-style';
      style.textContent =
        ':host{width:160px;height:36px;}:host([orientation="v"]){width:36px;height:160px;}';
      root.append(style);
    }
  }

  override attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (name === 'orientation') {
      this.axis = val === 'v' ? 'y' : 'x';
      this.#syncOrientation();
    }
    super.attributeChangedCallback(name, old, val);
  }

  #syncOrientation(): void {
    this.setAttribute('aria-orientation', this.orientation === 'v' ? 'vertical' : 'horizontal');
  }

  /** Position 0..1 du zéro sur la course (départ du remplissage bipolaire). */
  #zeroFraction(): number {
    if (this.range === 0 || this.min >= 0) return 0;
    if (this.max <= 0) return 1;
    return -this.min / this.range;
  }

  protected override renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const pad = 8;
    const color = this.color;
    const f = this.fraction;
    const z = this.#zeroFraction();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (this.orientation === 'h') {
      const y = h * 0.62;
      const span = w - 2 * pad;
      const at = (t: number): number => pad + t * span;
      ctx.strokeStyle = this.trackColor;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(at(z), y);
      ctx.lineTo(at(f), y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // flèche au-dessus, pointe vers la piste
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(at(f), y - 4);
      ctx.lineTo(at(f) - 5, y - 12);
      ctx.lineTo(at(f) + 5, y - 12);
      ctx.closePath();
      ctx.fill();
    } else {
      const x = w * 0.38;
      const span = h - 2 * pad;
      const at = (t: number): number => h - pad - t * span;
      ctx.strokeStyle = this.trackColor;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, h - pad);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(x, at(z));
      ctx.lineTo(x, at(f));
      ctx.stroke();
      ctx.shadowBlur = 0;
      // flèche à droite, pointe vers la piste
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + 4, at(f));
      ctx.lineTo(x + 12, at(f) - 5);
      ctx.lineTo(x + 12, at(f) + 5);
      ctx.closePath();
      ctx.fill();
    }
  }
}
```

- [ ] **Step 4: Enregistrer dans `src/index.ts`** — ajouter l'import, l'export et l'entrée de registre :

```ts
import { PtSlider } from './slider.js';
// dans l'export nommé : PtSlider
// dans REGISTRY : ['pt-slider', PtSlider],
```

- [ ] **Step 5: Vérifier le succès** — `pnpm vitest run src/slider.test.ts` → PASS, puis `pnpm test` complet → PASS.

### Task 3: `<pt-mix>` + `<pt-mix-track>` — groupe à somme constante

**Files:**
- Create: `src/mix.ts`
- Test: `src/mix.test.ts`
- Modify: `src/index.ts` (exports + registre `pt-mix`, `pt-mix-track`)

**Interfaces:**
- Consumes: `normalize`/`adjust`/`equalize`/`MixMode`/`MixConstraints` (Task 1), `PtSlider` (Task 2, créé via `document.createElement('pt-slider')`), `syncLabelAria` (`src/labels.ts`).
- Produces: `PtMix` (propriétés `values: number[]`, `tracks: PtMixTrack[]`, `total`, `mode`, `disabled` ; méthode `moveTrack(index, value)` ; événements `input`/`change` avec `detail: { values, labels, index }`) et `PtMixTrack` (propriétés `value`, `locked`).

**Décisions de conception (issues du spec) :**
- Source de vérité : `PtMix.#values` (l'attribut `value` d'une track n'est que la valeur initiale ; le modifier après coup est ignoré, mais la **propriété** `track.value = x` déclenche `moveTrack`).
- Neutralisation du double-clic de `ContinuousControl` : `#sync()` maintient l'attribut `default` de chaque slider égal à sa valeur courante → le handler de la base ne change rien et n'émet rien ; le listener `dblclick` du mix fait la répartition égale.
- Les événements `input`/`change` des sliders internes ne sont pas `composed` → ils ne fuient pas hors du shadow DOM ; le mix écoute directement chaque slider et ré-émet son propre événement.

- [ ] **Step 1: Écrire les tests** — `src/mix.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { defineControls } from './index.js';
import type { PtMix, PtMixTrack } from './mix.js';

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
    const m = await makeMix('total="10"', '<pt-mix-track label="A" value="2"></pt-mix-track><pt-mix-track label="B" value="2"></pt-mix-track>');
    expect(m.values).toEqual([5, 5]);
  });
  it('partage le restant entre pistes sans value', async () => {
    const m = await makeMix('total="10"', '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B"></pt-mix-track><pt-mix-track label="C"></pt-mix-track>');
    expect(m.values).toEqual([4, 3, 3]);
  });
  it('rend un pt-slider par piste dans le shadow DOM', async () => {
    const m = await makeMix('total="100"', '<pt-mix-track label="A"></pt-mix-track><pt-mix-track label="B"></pt-mix-track>');
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
    const m = await makeMix('total="10"', '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B" value="3"></pt-mix-track><pt-mix-track label="C" value="3"></pt-mix-track>');
    const tracks = m.tracks;
    tracks[0].value = 6;
    expect(m.values[0]).toBe(6);
    expect(m.values.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 9);
  });
  it('émet input et change avec detail {values, labels, index}', async () => {
    const m = await makeMix('total="10"', '<pt-mix-track label="A" value="5"></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>');
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
    const m = await makeMix('total="10"', '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B" value="3" locked></pt-mix-track><pt-mix-track label="C" value="3"></pt-mix-track>');
    m.tracks[0].value = 7;
    expect(m.values).toEqual([7, 3, 0]);
  });
  it('respecte le step (somme exacte)', async () => {
    const m = await makeMix('total="10" step="1"', '<pt-mix-track label="A" value="3"></pt-mix-track><pt-mix-track label="B" value="3"></pt-mix-track><pt-mix-track label="C" value="4"></pt-mix-track>');
    m.tracks[0].value = 5;
    expect(m.values.every((v) => Number.isInteger(v))).toBe(true);
    expect(m.values.reduce((a, b) => a + b, 0)).toBe(10);
  });
  it('interaction directe sur un slider interne compense aussi', async () => {
    const m = await makeMix('total="10" step="1"', '<pt-mix-track label="A" value="5"></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>');
    const slider = m.shadowRoot?.querySelectorAll('pt-slider')[0] as HTMLElement;
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(m.values).toEqual([6, 4]);
  });
});

describe('pt-mix : verrouillage via UI', () => {
  it('le cadenas reflète et bascule l’attribut locked', async () => {
    const m = await makeMix('total="10"', '<pt-mix-track label="A" value="5"></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>');
    const lock = m.shadowRoot?.querySelectorAll('button.lock')[0] as HTMLButtonElement;
    expect(lock.getAttribute('aria-pressed')).toBe('false');
    lock.click();
    await flush();
    expect(m.tracks[0].locked).toBe(true);
    expect(m.shadowRoot?.querySelectorAll('button.lock')[0]?.getAttribute('aria-pressed')).toBe('true');
  });
  it('le slider d’une piste verrouillée est désactivé', async () => {
    const m = await makeMix('total="10"', '<pt-mix-track label="A" value="5" locked></pt-mix-track><pt-mix-track label="B" value="5"></pt-mix-track>');
    const slider = m.shadowRoot?.querySelectorAll('pt-slider')[0] as HTMLElement;
    expect(slider.hasAttribute('disabled')).toBe(true);
  });
});

describe('pt-mix : divers', () => {
  it('affiche valeur + unité par piste', async () => {
    const m = await makeMix('total="10" unit="€" step="1"', '<pt-mix-track label="A" value="4"></pt-mix-track><pt-mix-track label="B" value="6"></pt-mix-track>');
    const val = m.shadowRoot?.querySelectorAll('output.val')[0];
    expect(val?.textContent).toBe('4 €');
  });
  it('affiche description et couleur de piste', async () => {
    const m = await makeMix('total="10"', '<pt-mix-track label="A" description="Alimentation" color="#ff0000" value="10"></pt-mix-track>');
    expect(m.shadowRoot?.textContent).toContain('Alimentation');
    expect(m.shadowRoot?.querySelector('pt-slider')?.getAttribute('color')).toBe('#ff0000');
  });
  it('ajout dynamique d’une piste → re-normalisation', async () => {
    const m = await makeMix('total="12"', '<pt-mix-track label="A" value="6"></pt-mix-track><pt-mix-track label="B" value="6"></pt-mix-track>');
    const t = document.createElement('pt-mix-track');
    t.setAttribute('label', 'C');
    m.appendChild(t);
    await flush();
    expect(m.values.length).toBe(3);
    expect(m.values.reduce((a, b) => a + b, 0)).toBeCloseTo(12, 9);
  });
  it('disabled désactive tous les sliders', async () => {
    const m = await makeMix('total="10" disabled', '<pt-mix-track label="A"></pt-mix-track><pt-mix-track label="B"></pt-mix-track>');
    const sliders = m.shadowRoot?.querySelectorAll('pt-slider') ?? [];
    for (const s of sliders) expect((s as HTMLElement).hasAttribute('disabled')).toBe(true);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `pnpm vitest run src/mix.test.ts` → FAIL.

- [ ] **Step 3: Implémenter `src/mix.ts`** :

```ts
import { adjust, equalize, normalize, type MixConstraints, type MixMode } from './distribute.js';
import { syncLabelAria } from './labels.js';
import type { PtSlider } from './slider.js';

const MIX_STYLE = `:host{display:flex;flex-direction:column;gap:6px;}
:host([disabled]){opacity:.4;pointer-events:none;}
.group-label{font-size:9px;letter-spacing:.1em;opacity:.7;text-transform:uppercase;}
.group-label:empty{display:none;}
.rows{display:flex;flex-direction:column;gap:4px;}
.row{display:grid;grid-template-columns:minmax(70px,1fr) minmax(120px,2fr) auto auto;align-items:center;gap:8px;}
.name{font-size:11px;display:block;}
.desc{font-size:9px;opacity:.6;display:block;}
.desc:empty{display:none;}
.val{font-size:11px;font-variant-numeric:tabular-nums;min-width:3.5em;text-align:right;}
.lock{background:none;border:none;cursor:pointer;font:inherit;font-size:12px;opacity:.5;padding:2px;}
.lock[aria-pressed="true"]{opacity:1;}
pt-slider{width:100%;height:28px;}
:host([orientation="v"]) .rows{flex-direction:row;gap:14px;}
:host([orientation="v"]) .row{display:flex;flex-direction:column;gap:4px;text-align:center;}
:host([orientation="v"]) pt-slider{width:36px;height:140px;}`;

/** Formate une valeur pour l'affichage : décimales du step, sinon 2 max. */
function formatValue(v: number, step?: number): string {
  const decimals = step ? (String(step).split('.')[1] ?? '').length : 2;
  return String(Number(v.toFixed(decimals)));
}

/**
 * Piste déclarative d'un `pt-mix` : données uniquement (label, description,
 * value initiale, color, locked) ; le rendu est assuré par le parent.
 */
export class PtMixTrack extends HTMLElement {
  static observedAttributes = ['label', 'description', 'value', 'color', 'locked'];

  attributeChangedCallback(): void {
    // notifie le pt-mix parent (bubbles en light DOM)
    this.dispatchEvent(new CustomEvent('pt-track-changed', { bubbles: true }));
  }

  get locked(): boolean {
    return this.hasAttribute('locked');
  }

  set locked(v: boolean) {
    this.toggleAttribute('locked', v);
  }

  /** Valeur courante ; en écriture, déclenche la compensation du groupe. */
  get value(): number {
    const mix = this.closest('pt-mix') as PtMix | null;
    const i = mix ? mix.tracks.indexOf(this) : -1;
    return mix && i >= 0 ? mix.values[i] : Number(this.getAttribute('value') ?? 0);
  }

  set value(v: number) {
    const mix = this.closest('pt-mix') as PtMix | null;
    const i = mix ? mix.tracks.indexOf(this) : -1;
    if (mix && i >= 0) mix.moveTrack(i, v);
    else this.setAttribute('value', String(v));
  }
}

/**
 * Groupe de sliders liés à somme constante : répartit `total` entre ses
 * `pt-mix-track` selon `mode` (prop | equal | cascade), avec verrouillage
 * par piste et granularité `step` (somme exacte garantie).
 */
export class PtMix extends HTMLElement {
  static observedAttributes = ['total', 'unit', 'mode', 'step', 'orientation', 'label', 'disabled'];

  #values: number[] = [];
  #sliders: PtSlider[] = [];
  #valEls: HTMLOutputElement[] = [];
  #lockEls: HTMLButtonElement[] = [];
  #rowsEl: HTMLDivElement | null = null;
  #labelEl: HTMLSpanElement | null = null;
  #observer: MutationObserver | null = null;

  connectedCallback(): void {
    this.setAttribute('role', 'group');
    syncLabelAria(this);
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = MIX_STYLE;
      this.#labelEl = document.createElement('span');
      this.#labelEl.className = 'group-label';
      this.#labelEl.textContent = this.getAttribute('label') ?? '';
      this.#rowsEl = document.createElement('div');
      this.#rowsEl.className = 'rows';
      root.append(style, this.#labelEl, this.#rowsEl);
    }
    this.addEventListener('pt-track-changed', this.#onTrackChanged);
    this.#observer = new MutationObserver(() => this.#rebuild());
    this.#observer.observe(this, { childList: true });
    this.#rebuild();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.removeEventListener('pt-track-changed', this.#onTrackChanged);
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    if (!this.isConnected || !this.#rowsEl) return;
    if (name === 'label') {
      if (this.#labelEl) this.#labelEl.textContent = val ?? '';
      syncLabelAria(this, _old);
      return;
    }
    if (name === 'disabled') {
      this.#sync();
      return;
    }
    // total / step / mode / unit / orientation : re-normalise et reconstruit
    if (this.#values.length > 0) this.#values = normalize(this.#values, this.#constraints());
    this.#rebuild();
  }

  get tracks(): PtMixTrack[] {
    return Array.from(this.querySelectorAll(':scope > pt-mix-track')) as PtMixTrack[];
  }

  /** Copie des valeurs courantes (Σ = total). */
  get values(): number[] {
    return [...this.#values];
  }

  get total(): number {
    const n = Number(this.getAttribute('total'));
    return Number.isFinite(n) && this.hasAttribute('total') ? n : 100;
  }

  get mode(): MixMode {
    const m = this.getAttribute('mode');
    return m === 'equal' || m === 'cascade' ? m : 'prop';
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(v: boolean) {
    this.toggleAttribute('disabled', v);
  }

  /** Déplace la piste `index` vers `value` (compensation selon `mode`). */
  moveTrack(index: number, value: number): void {
    this.#values = adjust(this.#values, index, value, this.mode, this.#constraints());
    this.#sync();
    this.#emit('input', index);
    this.#emit('change', index);
  }

  #onTrackChanged = (): void => {
    this.#rebuild();
  };

  #constraints(): MixConstraints {
    const stepAttr = this.getAttribute('step');
    return {
      total: this.total,
      locked: this.tracks.map((t) => t.locked),
      step: stepAttr !== null ? Number(stepAttr) : undefined,
    };
  }

  get #step(): number | undefined {
    const raw = this.getAttribute('step');
    return raw !== null ? Number(raw) : undefined;
  }

  /** Reconstruit les lignes ; conserve les valeurs si le nombre de pistes est inchangé. */
  #rebuild(): void {
    if (!this.#rowsEl) return;
    const tracks = this.tracks;
    if (tracks.length !== this.#values.length) {
      this.#values = normalize(
        tracks.map((t) => (t.hasAttribute('value') ? Number(t.getAttribute('value')) : null)),
        this.#constraints(),
      );
    }
    this.#rowsEl.textContent = '';
    this.#sliders = [];
    this.#valEls = [];
    this.#lockEls = [];
    tracks.forEach((track, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      const text = document.createElement('div');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = track.getAttribute('label') ?? '';
      const desc = document.createElement('span');
      desc.className = 'desc';
      desc.textContent = track.getAttribute('description') ?? '';
      text.append(name, desc);
      const slider = document.createElement('pt-slider') as PtSlider;
      slider.setAttribute('min', '0');
      slider.setAttribute('max', String(this.total));
      const stepAttr = this.getAttribute('step');
      if (stepAttr !== null) slider.setAttribute('step', stepAttr);
      const unit = this.getAttribute('unit');
      if (unit) slider.setAttribute('unit', unit);
      const color = track.getAttribute('color');
      if (color) slider.setAttribute('color', color);
      if (this.getAttribute('orientation') === 'v') slider.setAttribute('orientation', 'v');
      slider.setAttribute('aria-label', track.getAttribute('label') ?? `Piste ${i + 1}`);
      slider.addEventListener('input', () => this.#onSliderMove(i, 'input'));
      slider.addEventListener('change', () => this.#onSliderMove(i, 'change'));
      slider.addEventListener('dblclick', () => this.#onEqualize(i));
      const val = document.createElement('output');
      val.className = 'val';
      const lock = document.createElement('button');
      lock.className = 'lock';
      lock.type = 'button';
      lock.addEventListener('click', () => {
        track.locked = !track.locked;
      });
      row.append(text, slider, val, lock);
      this.#rowsEl!.append(row);
      this.#sliders.push(slider);
      this.#valEls.push(val);
      this.#lockEls.push(lock);
    });
    this.#sync();
  }

  /** Le slider `index` a bougé : compense, resynchronise, ré-émet. */
  #onSliderMove(index: number, type: 'input' | 'change'): void {
    const slider = this.#sliders[index];
    if (!slider) return;
    this.#values = adjust(this.#values, index, slider.value, this.mode, this.#constraints());
    this.#sync();
    this.#emit(type, index);
  }

  /** Double-clic : répartition égale du disponible entre pistes libres. */
  #onEqualize(index: number): void {
    this.#values = equalize(this.#values, this.#constraints());
    this.#sync();
    this.#emit('input', index);
    this.#emit('change', index);
  }

  /** Reporte l'état interne vers les sliders, valeurs affichées et cadenas. */
  #sync(): void {
    const tracks = this.tracks;
    const unit = this.getAttribute('unit');
    tracks.forEach((track, i) => {
      const slider = this.#sliders[i];
      if (!slider) return;
      const v = this.#values[i] ?? 0;
      slider.value = v;
      // default = valeur courante : neutralise le double-clic de la base
      slider.setAttribute('default', String(v));
      slider.toggleAttribute('disabled', this.disabled || track.locked);
      const label = track.getAttribute('label') ?? `Piste ${i + 1}`;
      const valEl = this.#valEls[i];
      if (valEl) valEl.textContent = formatValue(v, this.#step) + (unit ? ` ${unit}` : '');
      const lock = this.#lockEls[i];
      if (lock) {
        lock.textContent = track.locked ? '🔒' : '🔓';
        lock.setAttribute('aria-pressed', String(track.locked));
        lock.setAttribute('aria-label', `Verrouiller ${label}`);
        lock.disabled = this.disabled;
      }
    });
  }

  #emit(type: 'input' | 'change', index: number): void {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail: {
          values: this.values,
          labels: this.tracks.map((t) => t.getAttribute('label') ?? ''),
          index,
        },
        bubbles: true,
      }),
    );
  }
}
```

**Piège connu :** `#onTrackChanged`/`#rebuild` est déclenché par le cadenas (attribut `locked`) → `#rebuild` conserve `#values` (même nombre de pistes) et ne fait que reconstruire les lignes. Pas de boucle : le mix n'écrit jamais d'attribut sur les tracks.

- [ ] **Step 4: Enregistrer dans `src/index.ts`** — état final du fichier :

```ts
import { PtKnob } from './knob.js';
import { PtFader } from './fader.js';
import { PtCrossfader } from './crossfader.js';
import { PtButton } from './button.js';
import { PtVumeter } from './vumeter.js';
import { PtSwitch } from './switch.js';
import { PtXY } from './xy.js';
import { PtStepper } from './stepper.js';
import { PtLed } from './led.js';
import { PtSlider } from './slider.js';
import { PtMix, PtMixTrack } from './mix.js';

export { PtKnob, PtFader, PtCrossfader, PtButton, PtVumeter, PtSwitch, PtXY, PtStepper, PtLed, PtSlider, PtMix, PtMixTrack };
export { ContinuousControl, type ControlCurve } from './base-control.js';
export { crossfadeGains, type CrossfadeCurve } from './crossfade.js';
export { normalize, adjust, equalize, type MixMode, type MixConstraints } from './distribute.js';

const REGISTRY: Array<[string, CustomElementConstructor]> = [
  ['pt-knob', PtKnob],
  ['pt-fader', PtFader],
  ['pt-crossfader', PtCrossfader],
  ['pt-button', PtButton],
  ['pt-vumeter', PtVumeter],
  ['pt-switch', PtSwitch],
  ['pt-xy', PtXY],
  ['pt-stepper', PtStepper],
  ['pt-led', PtLed],
  ['pt-slider', PtSlider],
  ['pt-mix-track', PtMixTrack],
  ['pt-mix', PtMix],
];

/** Enregistre tous les contrôles (idempotent). */
export function defineControls(): void {
  for (const [tag, ctor] of REGISTRY) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
```

- [ ] **Step 5: Vérifier** — `pnpm test` complet → PASS, `pnpm build` → propre.

### Task 4: Démo, README, CHANGELOG, bump 0.3.0

**Files:**
- Modify: `demo/index.html` (nouvelles cartes pt-slider et pt-mix, CSS, version affichée)
- Modify: `README.md` (tableaux Composants/Attributs, exemples)
- Create: `CHANGELOG.md`
- Modify: `package.json` (`"version": "0.3.0"`)

- [ ] **Step 1: Démo** — lire `demo/index.html`, ajouter après la carte pt-button :
  - une carte `<pt-slider>` : un horizontal (bipolaire −12…+12), un vertical, avec `<output>` branché sur `input` ;
  - une carte large `<pt-mix>` : exemple budget (`total="10" unit="€" step="0.5"`, 3 tracks colorées avec descriptions, une `locked`), exemple skills RPG (`total="20" step="1" mode="equal"`, 4 tracks), extrait de code `<pre>` ;
  - brancher les events dans le `<script type="module">` existant (journal `#log`) ;
  - afficher `v0.3.0` dans le header de la page (vérifier s'il y a déjà un emplacement de version).
- [ ] **Step 2: Vérifier la démo** — `pnpm demo:build` → build propre ; contrôle visuel via `pnpm demo` (ou screenshot headless).
- [ ] **Step 3: README** — ajouter `<pt-slider>` et `<pt-mix>`/`<pt-mix-track>` au tableau Composants, un exemple dans le bloc d'installation, une section « Répartition à somme constante » (attributs de pt-mix + pt-mix-track, modes, événements avec `detail`). Relire le README entier pour cohérence.
- [ ] **Step 4: CHANGELOG.md** — créer avec entrée `## 0.3.0 — 2026-07-24 · « Sliders liés »` (puces : pt-slider, pt-mix/pt-mix-track, modes, locked, step somme exacte, exports distribute) + entrées rétroactives brèves 0.2.0 et 0.1.0 (dates depuis `git log`).
- [ ] **Step 5: Bump** — `package.json` → `0.3.0`. `pnpm test && pnpm build && pnpm demo:build` → tout vert.

### Task 5: Publication 0.3.0

- [ ] **Step 1: Commit unique** — `git add` ciblé (src/, demo/, README.md, CHANGELOG.md, package.json, docs/superpowers/plans/) ; message : `feat: pt-slider (flèche + piste allumée) et pt-mix, répartition à somme constante (v0.3.0)`.
- [ ] **Step 2: Push** — `git push` (déclenche CI + Pages).
- [ ] **Step 3: CI verte** — `gh run list` puis filtrer par SHA du commit (PAS `--commit`), attendre success des workflows CI et Pages.
- [ ] **Step 4: Tag + release** — `git tag -a v0.3.0 -m "v0.3.0 — Sliders liés"` ; `git push origin v0.3.0` ; `gh release create v0.3.0` avec titre et notes extraites de la section 0.3.0 du CHANGELOG uniquement (pas d'artefacts : la lib ne produit pas de binaire).
- [ ] **Step 5: Vitrines** — cloner/mettre à jour `yrbane/yrbane` et `yrbane/yrbane.github.io` : description potard (mention pt-slider/pt-mix), liens démo/release v0.3.0, capture fraîche de la démo (headless Chromium → `yrbane.github.io/shots/`), commit + push des deux repos.
- [ ] **Step 6: Vérification finale** — https://yrbane.github.io/potard/ affiche les nouveaux contrôles ; release visible sur GitHub.
