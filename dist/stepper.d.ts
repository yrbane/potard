/**
 * Sélecteur cranté (‹ valeur ›) avec bouclage. Attributs : `options`
 * (séparées par des virgules), `value`, `label`, `disabled`.
 * Événement `change` (detail: option courante).
 */
export declare class PtStepper extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, old: string | null, val: string | null): void;
    get options(): string[];
    get index(): number;
    set index(i: number);
    get value(): string;
    get disabled(): boolean;
    set disabled(v: boolean);
    next(): void;
    prev(): void;
}
