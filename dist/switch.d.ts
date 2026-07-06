/**
 * Interrupteur on/off style Ableton (activator). Attributs : `checked`,
 * `label`, `disabled`. Événement `change` (detail: boolean).
 */
export declare class PtSwitch extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, old: string | null, val: string | null): void;
    get checked(): boolean;
    set checked(v: boolean);
    get disabled(): boolean;
    set disabled(v: boolean);
}
