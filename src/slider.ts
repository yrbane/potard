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
