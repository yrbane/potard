import { syncLabelAria } from './labels.js';

/**
 * Sélecteur cranté (‹ valeur ›) avec bouclage. Attributs : `options`
 * (séparées par des virgules), `value`, `label`, `disabled`.
 * Événement `change` (detail: option courante).
 */
export class PtStepper extends HTMLElement {
  static observedAttributes = ['options', 'value', 'label', 'disabled'];

  #index: number | null = null;
  #valueEl: HTMLSpanElement | null = null;

  constructor() {
    super();
    this.addEventListener('keydown', (e) => {
      if (this.disabled) return;
      const ke = e as KeyboardEvent;
      if (ke.key === 'ArrowRight' || ke.key === 'ArrowUp') {
        e.preventDefault();
        this.next();
      } else if (ke.key === 'ArrowLeft' || ke.key === 'ArrowDown') {
        e.preventDefault();
        this.prev();
      }
    });
    this.addEventListener('wheel', (e) => {
      if (this.disabled) return;
      e.preventDefault();
      if ((e as WheelEvent).deltaY < 0) this.next();
      else this.prev();
    });
  }

  connectedCallback(): void {
    this.setAttribute('role', 'group');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    syncLabelAria(this);
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `:host{display:inline-flex;align-items:center;gap:2px;user-select:none;font-size:11px;}
:host([disabled]){opacity:.4;pointer-events:none;}
button{background:var(--ctl-track,#3a4048);border:none;color:inherit;border-radius:3px;width:16px;height:16px;line-height:1;cursor:pointer;padding:0;}
button:hover{background:var(--ctl-accent,#19c2ff);color:#101318;}
.value{min-width:4ch;text-align:center;font-variant-numeric:tabular-nums;}`;
      const prev = document.createElement('button');
      prev.className = 'prev';
      prev.textContent = '‹';
      prev.addEventListener('click', () => this.prev());
      this.#valueEl = document.createElement('span');
      this.#valueEl.className = 'value';
      const next = document.createElement('button');
      next.className = 'next';
      next.textContent = '›';
      next.addEventListener('click', () => this.next());
      root.append(style, prev, this.#valueEl, next);
    }
    this.#render();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (name === 'value' && val !== null) {
      const i = this.options.indexOf(val);
      if (i >= 0) this.#index = i;
    }
    if (name === 'label') syncLabelAria(this, old ?? val);
    this.#render();
  }

  get options(): string[] {
    return (this.getAttribute('options') ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o !== '');
  }

  get index(): number {
    if (this.#index !== null) return this.#index;
    const fromAttr = this.options.indexOf(this.getAttribute('value') ?? '');
    return fromAttr >= 0 ? fromAttr : 0;
  }

  set index(i: number) {
    const count = this.options.length;
    if (count === 0) return;
    this.#index = ((i % count) + count) % count; // bouclage
    this.#render();
  }

  get value(): string {
    return this.options[this.index] ?? '';
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(v: boolean) {
    this.toggleAttribute('disabled', v);
  }

  next(): void {
    this.index = this.index + 1;
    this.#emitChange();
  }

  prev(): void {
    this.index = this.index - 1;
    this.#emitChange();
  }

  #emitChange(): void {
    this.dispatchEvent(new CustomEvent('change', { detail: this.value, bubbles: true }));
  }

  #render(): void {
    if (this.#valueEl) this.#valueEl.textContent = this.value;
  }
}
