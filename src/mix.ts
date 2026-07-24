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
    return mix && i >= 0 ? (mix.values[i] ?? 0) : Number(this.getAttribute('value') ?? 0);
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

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (!this.isConnected || !this.#rowsEl) return;
    if (name === 'label') {
      if (this.#labelEl) this.#labelEl.textContent = val ?? '';
      syncLabelAria(this, old);
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
    return this.hasAttribute('total') && Number.isFinite(n) ? n : 100;
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

  get #step(): number | undefined {
    const raw = this.getAttribute('step');
    return raw !== null ? Number(raw) : undefined;
  }

  #constraints(): MixConstraints {
    return {
      total: this.total,
      locked: this.tracks.map((t) => t.locked),
      step: this.#step,
    };
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
