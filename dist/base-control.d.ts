/**
 * Base commune des contrôles continus (knob, fader, crossfader) :
 * drag (200 px = pleine course, Shift = ×10 précision), double-clic = défaut,
 * molette, clavier, ARIA slider. Les sous-classes ne font que dessiner.
 */
export declare abstract class ContinuousControl extends HTMLElement {
    #private;
    static observedAttributes: string[];
    /** Axe de drag : 'y' (vertical) ou 'x' (horizontal). */
    protected axis: 'x' | 'y';
    protected defaultMin: number;
    protected defaultMax: number;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, val: string | null): void;
    get min(): number;
    get max(): number;
    get range(): number;
    get defaultValue(): number;
    /** Pas clavier/molette : 1 % de la course. */
    get step(): number;
    get value(): number;
    set value(v: number);
    /** Fraction 0..1 de la course (pour le dessin). */
    protected get fraction(): number;
    protected get accentColor(): string;
    protected get trackColor(): string;
    protected requestRender(): void;
    /** Dessin spécifique au contrôle (jamais appelé hors navigateur réel). */
    protected abstract renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
