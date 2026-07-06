import { syncLabelAria } from './labels.js';

/** Pixels de drag pour parcourir toute la course (surchargeable via `sensitivity`). */
const DEFAULT_SENSITIVITY_PX = 200;
/** Facteur de précision quand Shift est enfoncé. */
const SHIFT_PRECISION = 0.1;

export type ControlCurve = 'lin' | 'log';

/**
 * Base commune des contrôles continus (knob, fader, crossfader) :
 * drag (Shift = précision ×10), double-clic = défaut, molette, clavier,
 * ARIA slider, label, unité, courbe lin/log, désactivation.
 * Les sous-classes ne font que dessiner.
 */
export abstract class ContinuousControl extends HTMLElement {
  static observedAttributes = [
    'min',
    'max',
    'value',
    'default',
    'step',
    'label',
    'unit',
    'disabled',
    'sensitivity',
    'curve',
  ];

  /** Axe de drag : 'y' (vertical) ou 'x' (horizontal). */
  protected axis: 'x' | 'y' = 'y';
  protected defaultMin = 0;
  protected defaultMax = 1;

  #value: number | null = null;
  #dragStartPos = 0;
  #dragStartFraction = 0;
  #raf = 0;
  #canvas: HTMLCanvasElement | null = null;
  #labelEl: HTMLSpanElement | null = null;
  #previousLabel: string | null = null;

  #onMove = (e: MouseEvent): void => {
    const pos = this.axis === 'y' ? e.clientY : e.clientX;
    const delta = this.axis === 'y' ? this.#dragStartPos - pos : pos - this.#dragStartPos;
    const precision = e.shiftKey ? SHIFT_PRECISION : 1;
    const fraction = this.#clamp01(this.#dragStartFraction + (delta / this.sensitivity) * precision);
    if (this.#setValue(this.#fractionToValue(fraction))) this.#emit('input');
  };

  #onUp = (): void => {
    window.removeEventListener('pointermove', this.#onMove as EventListener);
    window.removeEventListener('pointerup', this.#onUp);
    this.#emit('change');
  };

  constructor() {
    super();
    this.addEventListener('pointerdown', (e) => {
      if (this.disabled) return;
      const me = e as MouseEvent;
      e.preventDefault();
      this.#dragStartPos = this.axis === 'y' ? me.clientY : me.clientX;
      this.#dragStartFraction = this.fraction;
      window.addEventListener('pointermove', this.#onMove as EventListener);
      window.addEventListener('pointerup', this.#onUp);
    });
    this.addEventListener('dblclick', () => {
      if (this.disabled) return;
      if (this.#setValue(this.defaultValue)) {
        this.#emit('input');
        this.#emit('change');
      }
    });
    this.addEventListener('wheel', (e) => {
      if (this.disabled) return;
      const we = e as WheelEvent;
      e.preventDefault();
      if (this.#setValue(this.value + (we.deltaY < 0 ? this.step : -this.step))) {
        this.#emit('input');
        this.#emit('change');
      }
    });
    this.addEventListener('keydown', (e) => {
      if (this.disabled) return;
      const ke = e as KeyboardEvent;
      const next = {
        ArrowUp: this.value + this.step,
        ArrowRight: this.value + this.step,
        ArrowDown: this.value - this.step,
        ArrowLeft: this.value - this.step,
        Home: this.min,
        End: this.max,
      }[ke.key];
      if (next === undefined) return;
      e.preventDefault();
      if (this.#setValue(next)) {
        this.#emit('input');
        this.#emit('change');
      }
    });
  }

  connectedCallback(): void {
    this.setAttribute('role', 'slider');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.setAttribute('aria-valuemin', String(this.min));
    this.setAttribute('aria-valuemax', String(this.max));
    this.#syncAria();
    this.#syncDisabled();
    syncLabelAria(this);
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `:host{display:inline-flex;flex-direction:column;align-items:center;gap:2px;touch-action:none;user-select:none;cursor:grab;}
:host([disabled]){opacity:.4;cursor:not-allowed;}
canvas{display:block;width:100%;flex:1;min-height:0;}
.label{font-size:9px;letter-spacing:.1em;opacity:.7;text-transform:uppercase;}
.label:empty{display:none;}`;
      this.#canvas = document.createElement('canvas');
      this.#labelEl = document.createElement('span');
      this.#labelEl.className = 'label';
      this.#labelEl.textContent = this.getAttribute('label') ?? '';
      root.append(style, this.#canvas, this.#labelEl);
    }
    this.requestRender();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    switch (name) {
      case 'value':
        if (val !== null) {
          this.#value = this.#clamp(Number(val));
          this.#syncAria();
        }
        break;
      case 'label':
        if (this.#labelEl) this.#labelEl.textContent = val ?? '';
        syncLabelAria(this, old);
        break;
      case 'unit':
        this.#syncAria();
        break;
      case 'disabled':
        this.#syncDisabled();
        break;
    }
    this.requestRender();
  }

  get min(): number {
    return this.#num('min', this.defaultMin);
  }

  get max(): number {
    return this.#num('max', this.defaultMax);
  }

  get range(): number {
    return this.max - this.min;
  }

  get defaultValue(): number {
    return this.#num('default', (this.min + this.max) / 2);
  }

  /** Pas clavier/molette : attribut `step`, sinon 1 % de la course. */
  get step(): number {
    return this.#num('step', this.range / 100);
  }

  /** Pixels de drag pour la pleine course (attribut `sensitivity`). */
  get sensitivity(): number {
    return this.#num('sensitivity', DEFAULT_SENSITIVITY_PX);
  }

  /** Courbe de réponse du geste : linéaire ou taper audio (attribut `curve`). */
  get curve(): ControlCurve {
    return this.getAttribute('curve') === 'log' ? 'log' : 'lin';
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(v: boolean) {
    this.toggleAttribute('disabled', v);
  }

  get value(): number {
    return this.#value ?? this.#clamp(this.#num('value', this.defaultValue));
  }

  set value(v: number) {
    this.#setValue(v);
  }

  /** Position 0..1 de la course (espace visuel/drag, courbe appliquée). */
  protected get fraction(): number {
    if (this.range === 0) return 0;
    const linear = (this.value - this.min) / this.range;
    return this.curve === 'log' ? Math.sqrt(linear) : linear;
  }

  #fractionToValue(fraction: number): number {
    const linear = this.curve === 'log' ? fraction * fraction : fraction;
    return this.min + linear * this.range;
  }

  protected get accentColor(): string {
    return getComputedStyle(this).getPropertyValue('--ctl-accent').trim() || '#19c2ff';
  }

  protected get trackColor(): string {
    return getComputedStyle(this).getPropertyValue('--ctl-track').trim() || '#3a4048';
  }

  protected requestRender(): void {
    if (this.#raf || !this.#canvas) return;
    this.#raf = requestAnimationFrame(() => {
      this.#raf = 0;
      this.#draw();
    });
  }

  #draw(): void {
    const canvas = this.#canvas;
    if (!canvas) return;
    const w = canvas.clientWidth || this.clientWidth;
    const h = canvas.clientHeight || this.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    this.renderControl(ctx, w, h);
  }

  /** Dessin spécifique au contrôle (jamais appelé hors navigateur réel). */
  protected abstract renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void;

  #num(attr: string, fallback: number): number {
    const raw = this.getAttribute(attr);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isNaN(n) ? fallback : n;
  }

  #clamp(v: number): number {
    return Math.min(this.max, Math.max(this.min, v));
  }

  #clamp01(v: number): number {
    return Math.min(1, Math.max(0, v));
  }

  #setValue(v: number): boolean {
    const clamped = this.#clamp(v);
    if (clamped === this.value && this.#value !== null) return false;
    this.#value = clamped;
    this.#syncAria();
    this.requestRender();
    return true;
  }

  #syncAria(): void {
    this.setAttribute('aria-valuenow', String(this.value));
    const unit = this.getAttribute('unit');
    if (unit) this.setAttribute('aria-valuetext', `${this.value} ${unit}`);
  }

  #syncDisabled(): void {
    this.setAttribute('aria-disabled', String(this.disabled));
  }

  #emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new CustomEvent(type, { detail: this.value, bubbles: true }));
  }
}
