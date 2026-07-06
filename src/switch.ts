import { syncLabelAria } from './labels.js';

/**
 * Interrupteur on/off style Ableton (activator). Attributs : `checked`,
 * `label`, `disabled`. Événement `change` (detail: boolean).
 */
export class PtSwitch extends HTMLElement {
  static observedAttributes = ['checked', 'label', 'disabled'];

  constructor() {
    super();
    this.addEventListener('click', () => this.#toggle());
    this.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key !== ' ' && ke.key !== 'Enter') return;
      e.preventDefault();
      this.#toggle();
    });
  }

  connectedCallback(): void {
    this.setAttribute('role', 'switch');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.#syncAria();
    syncLabelAria(this);
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `:host{display:inline-flex;align-items:center;user-select:none;cursor:pointer;}
:host([disabled]){opacity:.4;cursor:not-allowed;}
.track{width:28px;height:14px;border-radius:7px;background:var(--ctl-track,#3a4048);position:relative;transition:background .15s;}
:host([checked]) .track{background:var(--ctl-accent,#19c2ff);}
.thumb{position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#d7dce2;transition:left .15s;}
:host([checked]) .thumb{left:16px;background:#101318;}`;
      const track = document.createElement('span');
      track.className = 'track';
      const thumb = document.createElement('span');
      thumb.className = 'thumb';
      track.appendChild(thumb);
      root.append(style, track);
    }
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (name === 'checked') this.#syncAria();
    if (name === 'label') syncLabelAria(this, old ?? val);
  }

  get checked(): boolean {
    return this.hasAttribute('checked');
  }

  set checked(v: boolean) {
    this.toggleAttribute('checked', v);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(v: boolean) {
    this.toggleAttribute('disabled', v);
  }

  #toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent('change', { detail: this.checked, bubbles: true }));
  }

  #syncAria(): void {
    this.setAttribute('aria-checked', String(this.checked));
  }
}
