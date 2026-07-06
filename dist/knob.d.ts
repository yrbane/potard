import { ContinuousControl } from './base-control.js';
/** Potentiomètre rotatif façon Ableton : drag vertical, anneau de valeur. */
export declare class YtKnob extends ContinuousControl {
    protected renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
