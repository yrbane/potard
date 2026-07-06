/** Pixels de drag pour parcourir toute la course (spec § 7.2). */
const FULL_RANGE_PX = 200;
/** Facteur de précision quand Shift est enfoncé. */
const SHIFT_PRECISION = 0.1;

/**
 * Base commune des contrôles continus (knob, fader, crossfader) :
 * drag (200 px = pleine course, Shift = ×10 précision), double-clic = défaut,
 * molette, clavier, ARIA slider. Les sous-classes ne font que dessiner.
 */
export abstract class ContinuousControl extends HTMLElement {
  static observedAttributes = ['min', 'max', 'value', 'default', 'label'];

  /** Axe de drag : 'y' (vertical) ou 'x' (horizontal). */
  protected axis: 'x' | 'y' = 'y';
  protected defaultMin = 0;
  protected defaultMax = 1;

  #value: number | null = null;
  #dragStartPos = 0;
  #dragStartValue = 0;
  #raf = 0;
  #canvas: HTMLCanvasElement | null = null;

  #onMove = (e: MouseEvent): void => {
    const pos = this.axis === 'y' ? e.clientY : e.clientX;
    const delta = this.axis === 'y' ? this.#dragStartPos - pos : pos - this.#dragStartPos;
    const precision = e.shiftKey ? SHIFT_PRECISION : 1;
    const next = this.#dragStartValue + (delta / FULL_RANGE_PX) * this.range * precision;
    if (this.#setValue(next)) this.#emit('input');
  };

  #onUp = (): void => {
    window.removeEventListener('pointermove', this.#onMove as EventListener);
    window.removeEventListener('pointerup', this.#onUp);
    this.#emit('change');
  };

  constructor() {
    super();
    this.addEventListener('pointerdown', (e) => {
      const me = e as MouseEvent;
      e.preventDefault();
      this.#dragStartPos = this.axis === 'y' ? me.clientY : me.clientX;
      this.#dragStartValue = this.value;
      window.addEventListener('pointermove', this.#onMove as EventListener);
      window.addEventListener('pointerup', this.#onUp);
    });
    this.addEventListener('dblclick', () => {
      if (this.#setValue(this.defaultValue)) {
        this.#emit('input');
        this.#emit('change');
      }
    });
    this.addEventListener('wheel', (e) => {
      const we = e as WheelEvent;
      e.preventDefault();
      if (this.#setValue(this.value + (we.deltaY < 0 ? this.step : -this.step))) {
        this.#emit('input');
        this.#emit('change');
      }
    });
    this.addEventListener('keydown', (e) => {
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
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `:host{display:inline-block;touch-action:none;user-select:none;cursor:grab;}
canvas{display:block;width:100%;height:100%;}`;
      this.#canvas = document.createElement('canvas');
      root.append(style, this.#canvas);
    }
    this.requestRender();
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    if (name === 'value' && val !== null) {
      this.#value = this.#clamp(Number(val));
      this.#syncAria();
      this.requestRender();
    } else {
      this.requestRender();
    }
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

  /** Pas clavier/molette : 1 % de la course. */
  get step(): number {
    return this.range / 100;
  }

  get value(): number {
    return this.#value ?? this.#clamp(this.#num('value', this.defaultValue));
  }

  set value(v: number) {
    this.#setValue(v);
  }

  /** Fraction 0..1 de la course (pour le dessin). */
  protected get fraction(): number {
    return this.range === 0 ? 0 : (this.value - this.min) / this.range;
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
    const w = this.clientWidth;
    const h = this.clientHeight;
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
  }

  #emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new CustomEvent(type, { detail: this.value, bubbles: true }));
  }
}
