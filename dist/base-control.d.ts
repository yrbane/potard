export type ControlCurve = 'lin' | 'log';
/**
 * Base commune des contrôles continus (knob, fader, crossfader) :
 * drag (Shift = précision ×10), double-clic = défaut, molette, clavier,
 * ARIA slider, label, unité, courbe lin/log, désactivation.
 * Les sous-classes ne font que dessiner.
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
    attributeChangedCallback(name: string, old: string | null, val: string | null): void;
    get min(): number;
    get max(): number;
    get range(): number;
    get defaultValue(): number;
    /** Pas clavier/molette : attribut `step`, sinon 1 % de la course. */
    get step(): number;
    /** Pixels de drag pour la pleine course (attribut `sensitivity`). */
    get sensitivity(): number;
    /** Courbe de réponse du geste : linéaire ou taper audio (attribut `curve`). */
    get curve(): ControlCurve;
    get disabled(): boolean;
    set disabled(v: boolean);
    get value(): number;
    set value(v: number);
    /** Position 0..1 de la course (espace visuel/drag, courbe appliquée). */
    protected get fraction(): number;
    protected get accentColor(): string;
    protected get trackColor(): string;
    protected requestRender(): void;
    /** Dessin spécifique au contrôle (jamais appelé hors navigateur réel). */
    protected abstract renderControl(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
