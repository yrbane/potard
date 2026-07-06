import { ContinuousControl } from './base-control.js';
/** Crossfader horizontal A↔B, centré par défaut (-1..1). */
export declare class PtCrossfader extends ContinuousControl {
    protected defaultMin: number;
    protected defaultMax: number;
    constructor();
    protected renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
