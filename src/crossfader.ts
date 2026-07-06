import { ContinuousControl } from './base-control.js';

/** Crossfader horizontal A↔B, centré par défaut (-1..1). */
export class PtCrossfader extends ContinuousControl {
  protected override defaultMin = -1;
  protected override defaultMax = 1;

  constructor() {
    super();
    this.axis = 'x';
  }

  protected override renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const trackY = h / 2;
    const pad = 8;

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.trackColor;
    ctx.beginPath();
    ctx.moveTo(pad, trackY);
    ctx.lineTo(w - pad, trackY);
    ctx.stroke();

    const x = pad + this.fraction * (w - 2 * pad);
    ctx.fillStyle = this.accentColor;
    ctx.fillRect(x - 5, 4, 10, h - 8);
    ctx.fillStyle = '#12151a';
    ctx.fillRect(x - 1, 4, 2, h - 8);
  }
}
