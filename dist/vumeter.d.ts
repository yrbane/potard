/**
 * VU-mètre à segments avec mémoire de pic.
 * Attributs : `segments` (défaut 12), `orientation` ('v' vertical par défaut, 'h' horizontal).
 * Propriétés : `level` (0..1), `peak`, `resetPeak()`.
 */
export declare class PtVumeter extends HTMLElement {
    #private;
    static observedAttributes: string[];
    connectedCallback(): void;
    attributeChangedCallback(): void;
    get segments(): number;
    get orientation(): 'v' | 'h';
    get level(): number;
    set level(v: number);
    get peak(): number;
    resetPeak(): void;
}
