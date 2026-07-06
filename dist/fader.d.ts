import { ContinuousControl } from './base-control.js';
/** Fader vertical (volume, tempo). */
export declare class PtFader extends ContinuousControl {
    protected renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
