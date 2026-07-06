/**
 * LED de statut, purement décorative. Attributs : `on`, `color`, `blink`.
 * Propriété `on` (boolean, reflétée dans l'attribut).
 */
export declare class PtLed extends HTMLElement {
    #private;
    static observedAttributes: string[];
    connectedCallback(): void;
    attributeChangedCallback(name: string): void;
    get on(): boolean;
    set on(v: boolean);
}
