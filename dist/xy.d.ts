/**
 * Surface de contrôle XY (façon Kaoss pad / Push). Positionnement absolu au
 * pointeur (bas-gauche = min), flèches clavier, double-clic = défauts.
 * Attributs : `min-x max-x value-x default-x` (idem `-y`), `label`, `disabled`.
 * Événements `input`/`change` (detail: { x, y }).
 */
export declare class PtXY extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, old: string | null, val: string | null): void;
    get x(): number;
    set x(v: number);
    get y(): number;
    set y(v: number);
    get disabled(): boolean;
    set disabled(v: boolean);
}
